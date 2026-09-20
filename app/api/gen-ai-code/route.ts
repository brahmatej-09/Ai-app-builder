import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/prisma";
import { CREDIT_COST_PER_GENERATION } from "@/lib/constants";
import type { Message, FileData } from "@/Types/workspace";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sseEvent(type: string, payload: unknown): string {
    return `data: ${JSON.stringify({
        type,
        ...(payload as object),
    })}\n\n`;
}

// ─── npm validation ───────────────────────────────────────────────────────────

async function validateDependencies(
    deps: Record<string, string>
): Promise<Record<string, string>> {
    const valid: Record<string, string> = {};

    await Promise.all(
        Object.entries(deps).map(async ([pkg, version]) => {
            try {
                const res = await fetch(
                    `https://registry.npmjs.org/${pkg}/latest`,
                    {
                        signal: AbortSignal.timeout(1500),
                    }
                );

                if (res.ok) {
                    valid[pkg] = version;
                }
            } catch {
                // Ignore packages that cannot be validated.
            }
        })
    );

    return valid;
}

// ─── History trimming ─────────────────────────────────────────────────────────

function trimHistory(messages: Message[]): Message[] {
    if (messages.length <= 10) {
        return messages;
    }

    return [messages[0], ...messages.slice(-8)];
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:

1. Always respond with a valid JSON object — no markdown fences, no extra text.

2. The JSON must match this exact shape:

{
  "assistantMessage": "<brief explanation of what you built/changed>",
  "title": "<short 2-4 word title for the app, e.g. 'Todo List App'>",
  "files": {
    "/App.js": { "code": "<full file content>" },
    "/components/SomeComponent.js": { "code": "<full file content>" }
  },
  "dependencies": {
    "some-package": "latest"
  }
}

3. Use React (functional components + hooks). Do NOT use TypeScript in generated files.

4. Use Tailwind CSS for all styling. Do not use CSS modules or inline styles unless absolutely necessary.

5. The entry point must always be /App.js and must export a default component.

6. All imports must reference files you include in "files" or packages in "dependencies".

7. Do not include react, react-dom, or tailwindcss in "dependencies" — they are always available.

8. When modifying existing code, include ALL files (both changed and unchanged) in "files".

9. Keep code clean, readable, and production-quality.

10. If the user attaches an image, use it as a design reference and match the layout/style as closely as possible.

11. Make sure every generated file contains complete code and can run without missing imports.

12. Do not return explanations outside the JSON object.`;

// ─── Gemini contents builder ──────────────────────────────────────────────────

function buildContents(
    messages: Message[],
    fileData: FileData | null
) {
    const trimmed = trimHistory(messages);

    return trimmed.map((msg, idx) => {
        const role = msg.role === "assistant" ? "model" : "user";

        if (msg.role === "user") {
            let text = msg.content;

            if (msg.imageUrl) {
                text =
                    `[The user has attached an image. Use this URL directly in the generated app where relevant (as img src, background-image, etc.): ${msg.imageUrl}]\n\n` +
                    text;
            }

            const isLast = idx === trimmed.length - 1;

            if (isLast && fileData) {
                text +=
                    "\n\nCurrent project files for context:\n" +
                    JSON.stringify(fileData, null, 2);
            }

            return {
                role,
                parts: [{ text }],
            };
        }

        return {
            role,
            parts: [{ text: msg.content }],
        };
    });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        // ── Authenticate user ──────────────────────────────────────────────────

        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return Response.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        // ── Read request body ──────────────────────────────────────────────────

        const body = await request.json();

        const {
            workspaceId,
            messages,
            fileData,
        } = body as {
            workspaceId: string | null;
            userId: string;
            messages: Message[];
            fileData: FileData | null;
        };

        if (!messages?.length) {
            return Response.json(
                { message: "No messages provided" },
                { status: 400 }
            );
        }

        // ── Find authenticated database user ──────────────────────────────────

        const user = await db.user.findUnique({
            where: {
                clerkId,
            },
            select: {
                id: true,
                credits: true,
            },
        });

        if (!user) {
            return Response.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // ── Check credits ─────────────────────────────────────────────────────

        if (user.credits < CREDIT_COST_PER_GENERATION) {
            return Response.json(
                { message: "Insufficient credits" },
                { status: 402 }
            );
        }

        // ── Create SSE stream ─────────────────────────────────────────────────

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                const enqueue = (chunk: string) => {
                    controller.enqueue(encoder.encode(chunk));
                };

                try {
                    // ─────────────────────────────────────────────────────────────
                    // Build Gemini input
                    // ─────────────────────────────────────────────────────────────

                    const contents = buildContents(
                        messages,
                        fileData
                    );

                    enqueue(
                        sseEvent("status", {
                            message: "Generating code…",
                        })
                    );

                    console.log(
                        "[gen-ai-code] Starting Gemini generation..."
                    );

                    // ─────────────────────────────────────────────────────────────
                    // Gemini streaming generation
                    // ─────────────────────────────────────────────────────────────

                    const geminiStream =
                        await ai.models.generateContentStream({
                            model: "gemini-3.5-flash",

                            contents,

                            config: {
                                systemInstruction: SYSTEM_PROMPT,

                                // We want Gemini to return JSON.
                                responseMimeType: "application/json",
                            },
                        });

                    let accumulated = "";

                    // ─────────────────────────────────────────────────────────────
                    // Read Gemini stream
                    // ─────────────────────────────────────────────────────────────

                    for await (const chunk of geminiStream) {
                        const parts =
                            chunk.candidates?.[0]?.content?.parts ?? [];

                        for (const part of parts) {
                            if (!part.text) {
                                continue;
                            }

                            accumulated += part.text;
                        }
                    }

                    console.log(
                        "[gen-ai-code] Gemini response received."
                    );

                    console.log(
                        "[gen-ai-code] Response length:",
                        accumulated.length
                    );

                    // ─────────────────────────────────────────────────────────────
                    // Make sure Gemini returned something
                    // ─────────────────────────────────────────────────────────────

                    if (!accumulated.trim()) {
                        enqueue(
                            sseEvent("error", {
                                message:
                                    "Gemini returned an empty response. Please try again.",
                            })
                        );

                        return;
                    }

                    // ─────────────────────────────────────────────────────────────
                    // Parse JSON response
                    // ─────────────────────────────────────────────────────────────

                    let parsed: {
                        assistantMessage: string;
                        title?: string;
                        files: Record<
                            string,
                            {
                                code: string;
                            }
                        >;
                        dependencies: Record<string, string>;
                    };

                    try {
                        parsed = JSON.parse(accumulated);
                    } catch (error) {
                        console.error(
                            "[gen-ai-code] JSON parse error:",
                            error
                        );

                        console.error(
                            "[gen-ai-code] Raw Gemini response:",
                            accumulated.slice(0, 3000)
                        );

                        enqueue(
                            sseEvent("error", {
                                message:
                                    "AI returned invalid JSON. Please try again.",
                            })
                        );

                        return;
                    }

                    // ─────────────────────────────────────────────────────────────
                    // Extract generated data
                    // ─────────────────────────────────────────────────────────────

                    const {
                        assistantMessage,
                        title: aiTitle,
                        files,
                        dependencies,
                    } = parsed;

                    // ─────────────────────────────────────────────────────────────
                    // Validate generated files
                    // ─────────────────────────────────────────────────────────────

                    if (
                        !files ||
                        typeof files !== "object" ||
                        Array.isArray(files)
                    ) {
                        enqueue(
                            sseEvent("error", {
                                message:
                                    "AI response is missing generated files. Please try again.",
                            })
                        );

                        return;
                    }

                    if (!files["/App.js"]) {
                        enqueue(
                            sseEvent("error", {
                                message:
                                    "AI response did not include /App.js. Please try again.",
                            })
                        );

                        return;
                    }

                    // ─────────────────────────────────────────────────────────────
                    // Validate npm packages
                    // ─────────────────────────────────────────────────────────────

                    enqueue(
                        sseEvent("status", {
                            message: "Validating packages…",
                        })
                    );

                    const validatedDeps =
                        await validateDependencies(
                            dependencies ?? {}
                        );

                    const newFileData: FileData = {
                        files,
                        dependencies: validatedDeps,
                        title: aiTitle,
                    };

                    // ─────────────────────────────────────────────────────────────
                    // Save workspace
                    // ─────────────────────────────────────────────────────────────

                    enqueue(
                        sseEvent("status", {
                            message: "Saving…",
                        })
                    );

                    const lastUserMessage =
                        messages[messages.length - 1];

                    const updatedMessages: Message[] = [
                        ...messages,
                        {
                            role: "assistant",
                            content:
                                assistantMessage ||
                                "Generated your application.",
                        },
                    ];

                    let workspace;

                    // ─────────────────────────────────────────────────────────────
                    // Existing workspace
                    // ─────────────────────────────────────────────────────────────

                    if (workspaceId) {
                        const existingWorkspace =
                            await db.workspace.findFirst({
                                where: {
                                    id: workspaceId,
                                    userId: user.id,
                                },
                            });

                        if (!existingWorkspace) {
                            enqueue(
                                sseEvent("error", {
                                    message:
                                        "Workspace not found.",
                                })
                            );

                            return;
                        }

                        workspace =
                            await db.workspace.update({
                                where: {
                                    id: existingWorkspace.id,
                                },

                                data: {
                                    messages:
                                        updatedMessages as never,

                                    fileData:
                                        newFileData as never,
                                },
                            });
                    }

                    // ─────────────────────────────────────────────────────────────
                    // New workspace
                    // ─────────────────────────────────────────────────────────────

                    else {
                        workspace =
                            await db.workspace.create({
                                data: {
                                    userId: user.id,

                                    title:
                                        aiTitle ??
                                        lastUserMessage.content.slice(
                                            0,
                                            80
                                        ),

                                    messages:
                                        updatedMessages as never,

                                    fileData:
                                        newFileData as never,
                                },
                            });
                    }

                    // ─────────────────────────────────────────────────────────────
                    // Deduct credits
                    // ─────────────────────────────────────────────────────────────

                    await db.user.update({
                        where: {
                            id: user.id,
                        },

                        data: {
                            credits: {
                                decrement:
                                    CREDIT_COST_PER_GENERATION,
                            },
                        },
                    });

                    // ─────────────────────────────────────────────────────────────
                    // Get remaining credits
                    // ─────────────────────────────────────────────────────────────

                    const updatedUser =
                        await db.user.findUnique({
                            where: {
                                id: user.id,
                            },

                            select: {
                                credits: true,
                            },
                        });

                    // ─────────────────────────────────────────────────────────────
                    // Send final result
                    // ─────────────────────────────────────────────────────────────

                    console.log(
                        "[gen-ai-code] Generation completed successfully."
                    );

                    enqueue(
                        sseEvent("done", {
                            workspaceId: workspace.id,

                            assistantMessage:
                                assistantMessage ||
                                "Generated your application.",

                            fileData: newFileData,

                            creditsRemaining:
                                updatedUser?.credits ??
                                user.credits -
                                    CREDIT_COST_PER_GENERATION,
                        })
                    );
                } catch (err) {
                    console.error(
                        "[gen-ai-code] stream error:",
                        err
                    );

                    // IMPORTANT:
                    // Send the actual backend error to the frontend
                    // instead of hiding it behind a generic message.

                    const message =
                        err instanceof Error
                            ? err.message
                            : "Something went wrong while generating your application.";

                    enqueue(
                        sseEvent("error", {
                            message,
                        })
                    );
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (err) {
        console.error(
            "[gen-ai-code] request error:",
            err
        );

        return Response.json(
            {
                message:
                    err instanceof Error
                        ? err.message
                        : "Something went wrong.",
            },
            {
                status: 500,
            }
        );
    }
}

// ─── Next.js configuration ────────────────────────────────────────────────────

export const runtime = "nodejs";

export const maxDuration = 300;
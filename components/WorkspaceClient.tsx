// WorkspaceClient.tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatPanel } from "./chatpanel";
import { CodePanel } from "./codepanel";
import { MobileBlocker } from "./MobileBlocker";
import { MIN_CREDITS_TO_GENERATE } from "@/lib/constants";
import { toast } from "sonner";
import type {
    Message,
    FileData,
    StatusStep,
    WorkspaceData,
} from "@/Types/workspace";

export type {
    MessageRole,
    Message,
    FileData,
    StatusStep,
} from "@/Types/workspace";

interface WorkspaceClientProps {
    initialPrompt: string | null;
    workspace: WorkspaceData | null;
    userCredits: number;
    userId: string;
    userPlan: string;
}

function parseMessages(raw: unknown): Message[] {
    if (!Array.isArray(raw)) return [];

    return raw.filter(
        (m): m is Message =>
            typeof m === "object" &&
            m !== null &&
            "role" in m &&
            "content" in m
    );
}

function parseFileData(raw: unknown): FileData | null {
    if (!raw || typeof raw !== "object") return null;

    const f = raw as Record<string, unknown>;

    if (!f.files || !f.dependencies) return null;

    return raw as FileData;
}

export function WorkspaceClient({
    initialPrompt,
    workspace,
    userCredits,
    userId,
    userPlan,
}: WorkspaceClientProps) {
    const [workspaceId, setWorkspaceId] = useState<string | null>(
        workspace?.id ?? null
    );

    const [messages, setMessages] = useState<Message[]>(
        parseMessages(workspace?.messages)
    );

    const [fileData, setFileData] = useState<FileData | null>(
        parseFileData(workspace?.fileData)
    );

    const [credits, setCredits] = useState(userCredits);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusLog, setStatusLog] = useState<StatusStep[]>([]);
    const [isImproving, setIsImproving] = useState(false);

    // ─────────────────────────────────────────────────────────────────────────
    // AbortController refs
    // ─────────────────────────────────────────────────────────────────────────

    const generateAbortRef = useRef<AbortController | null>(null);
    const improveAbortRef = useRef<AbortController | null>(null);

    // Prevent initialPrompt from triggering generation more than once.
    const initialPromptHandledRef = useRef(false);

    // ─────────────────────────────────────────────────────────────────────────
    // Refs to avoid stale closures
    // ─────────────────────────────────────────────────────────────────────────

    const messagesRef = useRef<Message[]>(messages);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const workspaceIdRef = useRef<string | null>(workspaceId);

    useEffect(() => {
        workspaceIdRef.current = workspaceId;
    }, [workspaceId]);

    const fileDataRef = useRef<FileData | null>(fileData);

    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    // ─────────────────────────────────────────────────────────────────────────
    // Status helpers
    // ─────────────────────────────────────────────────────────────────────────

    const pushStep = (label: string) => {
        setStatusLog((prev) => [
            ...prev.map((s, i) =>
                i === prev.length - 1
                    ? {
                          ...s,
                          status: "done" as const,
                      }
                    : s
            ),
            {
                label,
                status: "running" as const,
            },
        ]);
    };

    const completeSteps = () => {
        setStatusLog((prev) =>
            prev.map((s, i) =>
                i === prev.length - 1
                    ? {
                          ...s,
                          status: "done" as const,
                      }
                    : s
            )
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Generate application
    // ─────────────────────────────────────────────────────────────────────────

    const handleGenerate = useCallback(
        async (prompt: string, imageUrl?: string) => {
            if (isGenerating) return;

            if (credits < MIN_CREDITS_TO_GENERATE) {
                toast.error("Not enough credits.");
                return;
            }

            const userMessage: Message = {
                role: "user",
                content: prompt,
                ...(imageUrl ? { imageUrl } : {}),
            };

            const currentMessages = messagesRef.current;
            const currentWorkspaceId = workspaceIdRef.current;

            setMessages((prev) => [...prev, userMessage]);

            setIsGenerating(true);

            setStatusLog([
                {
                    label: "Thinking…",
                    status: "running",
                },
            ]);

            // Create a fresh AbortController for this request.
            const abortController = new AbortController();

            generateAbortRef.current = abortController;

            try {
                const conversationHistory = [
                    ...currentMessages,
                    userMessage,
                ];

                console.log(
                    "[WorkspaceClient] Starting generation..."
                );

                const res = await fetch("/api/gen-ai-code", {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    signal: abortController.signal,

                    body: JSON.stringify({
                        workspaceId: currentWorkspaceId,
                        userId,
                        messages: conversationHistory,
                        fileData: fileDataRef.current,
                    }),
                });

                // ─────────────────────────────────────────────────────────────
                // HTTP errors
                // ─────────────────────────────────────────────────────────────

                if (res.status === 402) {
                    toast.error("Not enough credits.");

                    setMessages((prev) => prev.slice(0, -1));

                    return;
                }

                if (res.status === 429) {
                    toast.error(
                        "Too many requests. Please slow down."
                    );

                    setMessages((prev) => prev.slice(0, -1));

                    return;
                }

                if (!res.ok) {
                    let errorMessage = "Generation failed.";

                    try {
                        const errorData = await res.json();

                        if (errorData?.message) {
                            errorMessage = errorData.message;
                        }
                    } catch {
                        // Ignore JSON parsing failure.
                    }

                    throw new Error(errorMessage);
                }

                if (!res.body) {
                    throw new Error(
                        "The server returned an empty response."
                    );
                }

                // ─────────────────────────────────────────────────────────────
                // Read SSE stream
                // ─────────────────────────────────────────────────────────────

                const reader = res.body.getReader();
                const decoder = new TextDecoder();

                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) break;

                    buffer += decoder.decode(value, {
                        stream: true,
                    });

                    const lines = buffer.split("\n\n");

                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) {
                            continue;
                        }

                        // IMPORTANT:
                        // Do not wrap this in a try/catch that silently
                        // ignores errors. Backend errors must reach the
                        // outer catch block.

                        const event = JSON.parse(
                            line.slice(6)
                        );

                        console.log(
                            "[WorkspaceClient] SSE EVENT:",
                            event
                        );

                        // ─────────────────────────────────────────────────────
                        // Status event
                        // ─────────────────────────────────────────────────────

                        if (event.type === "status") {
                            pushStep(event.message);

                            continue;
                        }

                        // ─────────────────────────────────────────────────────
                        // Completed generation
                        // ─────────────────────────────────────────────────────

                        if (event.type === "done") {
                            completeSteps();

                            setWorkspaceId(
                                event.workspaceId
                            );

                            setFileData(
                                event.fileData
                            );

                            setCredits(
                                event.creditsRemaining
                            );

                            setMessages((prev) => [
                                ...prev,
                                {
                                    role: "assistant",
                                    content:
                                        event.assistantMessage,
                                },
                            ]);

                            window.history.replaceState(
                                null,
                                "",
                                `/workspace?id=${event.workspaceId}`
                            );

                            continue;
                        }

                        // ─────────────────────────────────────────────────────
                        // Backend error
                        // ─────────────────────────────────────────────────────

                        if (event.type === "error") {
                            throw new Error(
                                event.message ||
                                    "AI generation failed."
                            );
                        }
                    }
                }

                // ─────────────────────────────────────────────────────────────
                // Handle any remaining buffered SSE event
                // ─────────────────────────────────────────────────────────────

                if (buffer.startsWith("data: ")) {
                    const event = JSON.parse(
                        buffer.slice(6)
                    );

                    console.log(
                        "[WorkspaceClient] Final SSE EVENT:",
                        event
                    );

                    if (event.type === "status") {
                        pushStep(event.message);
                    } else if (event.type === "done") {
                        completeSteps();

                        setWorkspaceId(
                            event.workspaceId
                        );

                        setFileData(
                            event.fileData
                        );

                        setCredits(
                            event.creditsRemaining
                        );

                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "assistant",
                                content:
                                    event.assistantMessage,
                            },
                        ]);

                        window.history.replaceState(
                            null,
                            "",
                            `/workspace?id=${event.workspaceId}`
                        );
                    } else if (event.type === "error") {
                        throw new Error(
                            event.message ||
                                "AI generation failed."
                        );
                    }
                }

                console.log(
                    "[WorkspaceClient] Generation stream finished."
                );
            } catch (err) {
                // ─────────────────────────────────────────────────────────────
                // User stopped generation
                // ─────────────────────────────────────────────────────────────

                if (
                    err instanceof Error &&
                    err.name === "AbortError"
                ) {
                    setMessages((prev) =>
                        prev.slice(0, -1)
                    );

                    return;
                }

                // ─────────────────────────────────────────────────────────────
                // Generation error
                // ─────────────────────────────────────────────────────────────

                console.error(
                    "[WorkspaceClient] Generation error:",
                    err
                );

                toast.error(
                    err instanceof Error
                        ? err.message
                        : "Something went wrong."
                );

                setMessages((prev) =>
                    prev.slice(0, -1)
                );
            } finally {
                generateAbortRef.current = null;

                setIsGenerating(false);

                setStatusLog([]);
            }
        },

        // fileData intentionally omitted because it is read through
        // fileDataRef.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [credits, isGenerating, userId]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Automatically generate when coming from Home page
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!initialPrompt) {
            return;
        }

        if (initialPromptHandledRef.current) {
            return;
        }

        // If we already have a workspace, don't generate again.
        if (workspaceIdRef.current) {
            return;
        }

        initialPromptHandledRef.current = true;

        console.log(
            "[WorkspaceClient] Initial prompt:",
            initialPrompt
        );

        void handleGenerate(initialPrompt);

        // handleGenerate intentionally omitted.
        // This effect should only react to the initial prompt.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPrompt]);

    // ─────────────────────────────────────────────────────────────────────────
    // Improve application
    // ─────────────────────────────────────────────────────────────────────────

    const handleImprove = useCallback(
        async (userRequest: string) => {
            if (isGenerating || isImproving) {
                return;
            }

            if (credits < MIN_CREDITS_TO_GENERATE) {
                toast.error("Not enough credits.");
                return;
            }

            if (!workspaceIdRef.current) {
                return;
            }

            const currentFileData = fileDataRef.current;

            if (!currentFileData) {
                return;
            }

            setIsImproving(true);

            setMessages((prev) => [
                ...prev,
                {
                    role: "user",
                    content: userRequest,
                },
                {
                    role: "assistant",
                    content: "",
                },
            ]);

            // Create a fresh AbortController.
            const abortController =
                new AbortController();

            improveAbortRef.current =
                abortController;

            try {
                const res = await fetch(
                    "/api/improve",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        signal:
                            abortController.signal,

                        body: JSON.stringify({
                            userId,
                            workspaceId:
                                workspaceIdRef.current,
                            userRequest,
                            fileData:
                                currentFileData,
                        }),
                    }
                );

                // ─────────────────────────────────────────────────────────────
                // HTTP errors
                // ─────────────────────────────────────────────────────────────

                if (res.status === 403) {
                    toast.error(
                        "Upgrade to Starter or Pro to use Improve with Forge Agent."
                    );

                    setMessages((prev) =>
                        prev.slice(0, -2)
                    );

                    return;
                }

                if (res.status === 402) {
                    toast.error(
                        "Not enough credits."
                    );

                    setMessages((prev) =>
                        prev.slice(0, -2)
                    );

                    return;
                }

                if (!res.ok) {
                    let errorMessage =
                        "Improve failed.";

                    try {
                        const errorData =
                            await res.json();

                        if (errorData?.message) {
                            errorMessage =
                                errorData.message;
                        }
                    } catch {
                        // Ignore JSON parsing failure.
                    }

                    throw new Error(
                        errorMessage
                    );
                }

                if (!res.body) {
                    throw new Error(
                        "The server returned an empty response."
                    );
                }

                const reader =
                    res.body.getReader();

                const decoder =
                    new TextDecoder();

                let buffer = "";

                let accumulatedThinking = "";

                // Accumulate patches locally.
                // Do not update fileData on every patch because
                // that can cause Sandpack to remount during streaming.

                const localPatches: Record<
                    string,
                    { code: string }
                > = {};

                // ─────────────────────────────────────────────────────────────
                // Read Improve SSE stream
                // ─────────────────────────────────────────────────────────────

                while (true) {
                    const {
                        done,
                        value,
                    } = await reader.read();

                    if (done) break;

                    buffer += decoder.decode(
                        value,
                        {
                            stream: true,
                        }
                    );

                    const lines =
                        buffer.split("\n\n");

                    buffer =
                        lines.pop() ?? "";

                    for (const line of lines) {
                        if (
                            !line.startsWith(
                                "data: "
                            )
                        ) {
                            continue;
                        }

                        // Do not swallow backend errors.

                        const event =
                            JSON.parse(
                                line.slice(6)
                            );

                        console.log(
                            "[WorkspaceClient] Improve SSE EVENT:",
                            event
                        );

                        // ─────────────────────────────────────────────────────
                        // Thinking
                        // ─────────────────────────────────────────────────────

                        if (
                            event.type ===
                            "thinking"
                        ) {
                            accumulatedThinking +=
                                event.text;

                            setMessages((prev) => {
                                const updated = [
                                    ...prev,
                                ];

                                updated[
                                    updated.length -
                                        1
                                ] = {
                                    role: "assistant",
                                    content:
                                        accumulatedThinking,
                                };

                                return updated;
                            });

                            continue;
                        }

                        // ─────────────────────────────────────────────────────
                        // File patch
                        // ─────────────────────────────────────────────────────

                        if (
                            event.type ===
                            "file_patch"
                        ) {
                            localPatches[
                                event.path
                            ] = {
                                code: event.code,
                            };

                            continue;
                        }

                        // ─────────────────────────────────────────────────────
                        // Done
                        // ─────────────────────────────────────────────────────

                        if (
                            event.type ===
                            "done"
                        ) {
                            setFileData(
                                event.fileData
                            );

                            setCredits(
                                event.creditsRemaining
                            );

                            setMessages((prev) => {
                                const updated = [
                                    ...prev,
                                ];

                                updated[
                                    updated.length -
                                        1
                                ] = {
                                    role: "assistant",
                                    content:
                                        event.summary,
                                };

                                return updated;
                            });

                            continue;
                        }

                        // ─────────────────────────────────────────────────────
                        // Error
                        // ─────────────────────────────────────────────────────

                        if (
                            event.type ===
                            "error"
                        ) {
                            throw new Error(
                                event.message ||
                                    "Improve failed."
                            );
                        }
                    }
                }

                // ─────────────────────────────────────────────────────────────
                // Remaining buffered event
                // ─────────────────────────────────────────────────────────────

                if (buffer.startsWith("data: ")) {
                    const event =
                        JSON.parse(
                            buffer.slice(6)
                        );

                    console.log(
                        "[WorkspaceClient] Final Improve SSE EVENT:",
                        event
                    );

                    if (
                        event.type ===
                        "thinking"
                    ) {
                        accumulatedThinking +=
                            event.text;

                        setMessages((prev) => {
                            const updated = [
                                ...prev,
                            ];

                            updated[
                                updated.length -
                                    1
                            ] = {
                                role: "assistant",
                                content:
                                    accumulatedThinking,
                            };

                            return updated;
                        });
                    } else if (
                        event.type ===
                        "file_patch"
                    ) {
                        localPatches[
                            event.path
                        ] = {
                            code: event.code,
                        };
                    } else if (
                        event.type ===
                        "done"
                    ) {
                        setFileData(
                            event.fileData
                        );

                        setCredits(
                            event.creditsRemaining
                        );

                        setMessages((prev) => {
                            const updated = [
                                ...prev,
                            ];

                            updated[
                                updated.length -
                                    1
                            ] = {
                                role: "assistant",
                                content:
                                    event.summary,
                            };

                            return updated;
                        });
                    } else if (
                        event.type ===
                        "error"
                    ) {
                        throw new Error(
                            event.message ||
                                "Improve failed."
                        );
                    }
                }
            } catch (err) {
                // ─────────────────────────────────────────────────────────────
                // User stopped Improve
                // ─────────────────────────────────────────────────────────────

                if (
                    err instanceof Error &&
                    err.name === "AbortError"
                ) {
                    setMessages((prev) =>
                        prev.slice(0, -2)
                    );

                    return;
                }

                console.error(
                    "[WorkspaceClient] Improve error:",
                    err
                );

                toast.error(
                    err instanceof Error
                        ? err.message
                        : "Improve failed."
                );

                setMessages((prev) =>
                    prev.slice(0, -2)
                );
            } finally {
                improveAbortRef.current =
                    null;

                setIsImproving(false);
            }
        },

        // fileData intentionally omitted.
        // Read through fileDataRef above.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            credits,
            isGenerating,
            isImproving,
            userId,
        ]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Stop generation / improve
    // ─────────────────────────────────────────────────────────────────────────

    const handleStop = useCallback(() => {
        generateAbortRef.current?.abort();

        improveAbortRef.current?.abort();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // File patch handler
    // ─────────────────────────────────────────────────────────────────────────

    const handleFilePatch = useCallback(
        (patches: FileData) => {
            setFileData(patches);
        },
        []
    );

    // ─────────────────────────────────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Mobile blocker — visible only on small screens */}

            <div className="md:hidden">
                <MobileBlocker />
            </div>

            {/* Workspace — visible only on md+ screens */}

            <div className="hidden md:flex mt-16 h-[calc(100vh-4rem)] min-h-0 w-full min-w-0 overflow-hidden bg-[#0a0a0a]">
                <ChatPanel
                    isImproving={isImproving}
                    messages={messages}
                    isGenerating={isGenerating}
                    statusLog={statusLog}
                    credits={credits}
                    initialPrompt={initialPrompt}
                    onGenerate={handleGenerate}
                    onStop={handleStop}
                    userId={userId}
                    workspaceId={workspaceId}
                    appTitle={
                        fileData?.title ??
                        workspace?.title ??
                        null
                    }
                />

                <div className="w-px shrink-0 bg-white/6" />

                <CodePanel
                    fileData={fileData}
                    isGenerating={isGenerating}
                    statusLog={statusLog}
                    onImprove={handleImprove}
                    onFixError={(error) =>
                        handleGenerate(
                            `There is an error in the preview:

\`\`\`
${error}
\`\`\`

Please fix it.`
                        )
                    }
                    onFilePatch={handleFilePatch}
                    appTitle={
                        fileData?.title ??
                        workspace?.title ??
                        null
                    }
                    isImproving={isImproving}
                    isProUser={userPlan === "pro"}
                />
            </div>
        </>
    );
}
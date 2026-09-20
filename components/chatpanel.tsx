"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useUser } from "@clerk/nextjs";
import {
    ArrowUp,
    Paperclip,
    Loader2,
    X,
    Sparkles,
    Wand2,
    Square,
    Plus,
    ChevronDown,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { PricingModal } from "@/components/PricingModal";
import type { Message, StatusStep } from "@/Types/workspace";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";



interface ChatPanelProps {
    messages: Message[];
    isGenerating: boolean;
    isImproving: boolean;
    statusLog: StatusStep[];
    credits: number;
    initialPrompt: string | null;
    onGenerate: (prompt: string, imageUrl?: string) => Promise<void>;
    onStop: () => void;
    userId: string;
    workspaceId: string | null;
    appTitle: string | null;
}

export function ChatPanel({
    messages,
    isGenerating,
    isImproving,
    statusLog,
    credits,
    initialPrompt,
    onGenerate,
    onStop,
    userId,
    workspaceId,
    appTitle,
}: ChatPanelProps) {
    const { user } = useUser();

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [input, setInput] = useState("");
    const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showModeMenu, setShowModeMenu] = useState(false);
    const [mode, setMode] = useState<"Ask" | "Agent">("Agent");

    const hasAutoSubmittedRef = useRef(false);
    const noCredits = credits <= 0;

    const lastMsg = messages[messages.length - 1];
    const isStreamingAssistant =
        isImproving && lastMsg?.role === "assistant";

    // Auto resize input
    useEffect(() => {
        const el = textareaRef.current;

        if (!el) return;

        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 150) + "px";
    }, [input]);

    // Scroll to latest message
    useEffect(() => {
        const el = scrollContainerRef.current;

        if (!el) return;

        el.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, isGenerating, isImproving]);

    // Automatically submit homepage prompt
    useEffect(() => {
        if (
            !initialPrompt ||
            hasAutoSubmittedRef.current ||
            messages.length > 0
        ) {
            return;
        }

        hasAutoSubmittedRef.current = true;
        onGenerate(initialPrompt);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async () => {
        const trimmed = input.trim();

        if (
            !trimmed ||
            isGenerating ||
            isImproving ||
            noCredits
        ) {
            return;
        }

        setInput("");
        setPendingImageUrl(null);

        await onGenerate(
            trimmed,
            pendingImageUrl ?? undefined
        );
    };

    const handleKeyDown = (
        e: KeyboardEvent<HTMLTextAreaElement>
    ) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (!file || !file.type.startsWith("image/")) {
            return;
        }

        setIsUploading(true);

        try {
            const supabaseUrl =
                process.env.NEXT_PUBLIC_SUPABASE_URL;

            const supabaseAnonKey =
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error(
                    "Supabase environment variables are missing"
                );
            }

            const supabase = createClient(
                supabaseUrl,
                supabaseAnonKey
            );

            const ext = file.name.split(".").pop();

            const path = `${userId}/${workspaceId ?? "new"
                }/${Date.now()}.${ext}`;

            const { error } = await supabase.storage
                .from("workspace-images")
                .upload(path, file, {
                    upsert: true,
                });

            if (error) {
                throw error;
            }

            const { data } = supabase.storage
                .from("workspace-images")
                .getPublicUrl(path);

            setPendingImageUrl(data.publicUrl);
        } catch (error) {
            console.error("Image upload failed:", error);
        } finally {
            setIsUploading(false);

            if (fileRef.current) {
                fileRef.current.value = "";
            }
        }
    };

    const canSubmit =
        input.trim().length > 0 &&
        !isGenerating &&
        !isImproving &&
        !noCredits;

    return (
        <div className="flex h-full w-[320px] shrink-0 flex-col bg-[#0b0b0b] text-white">
            {/* ====================================================== */}
            {/* TOP BAR                                                */}
            {/* ====================================================== */}

            <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Image
                        src="/logo-short.jpeg"
                        alt="Forge"
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-md"
                    />

                    <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-white/80">
                            {appTitle || "Forge"}
                        </p>

                        <p className="text-[9px] text-white/25">
                            AI App Builder
                        </p>
                    </div>
                </div>
            </div>

            {/* ====================================================== */}
            {/* CHAT MESSAGES                                          */}
            {/* ====================================================== */}

            <div
                ref={scrollContainerRef}
                className="min-h-0 flex-1 overflow-y-auto px-3 py-5 [&::-webkit-scrollbar]:hidden"
            >
                {messages.length === 0 && !isGenerating ? (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                            <Sparkles className="h-4 w-4 text-blue-400/70" />
                        </div>

                        <h3 className="text-[13px] font-medium text-white/65">
                            Build with Forge
                        </h3>

                        <p className="mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-white/25">
                            Describe what you want to build and Forge
                            will create it for you.
                        </p>

                        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                            {[
                                "Build a landing page",
                                "Create a dashboard",
                                "Make a portfolio",
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInput(suggestion)}
                                    className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-white/30 transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white/60"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {messages.map((msg, i) => {
                            const isLast = i === messages.length - 1;

                            const isLiveStream =
                                isLast &&
                                isStreamingAssistant;

                            return (
                                <div key={i}>
                                    {/* USER MESSAGE */}
                                    {msg.role === "user" ? (
                                        <div className="flex justify-end">
                                            <div className="max-w-[88%]">
                                                {msg.imageUrl && (
                                                    <img
                                                        src={msg.imageUrl}
                                                        alt="uploaded"
                                                        className="mb-2 max-h-40 w-full rounded-xl border border-white/[0.06] object-cover"
                                                    />
                                                )}

                                                <div className="rounded-2xl rounded-br-md bg-white/[0.09] px-3.5 py-2.5">
                                                    <p className="text-[12px] leading-relaxed text-white/75">
                                                        {msg.content}
                                                    </p>
                                                </div>

                                                <div className="mt-1 text-right text-[9px] text-white/15">
                                                    You
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* FORGE MESSAGE */
                                        <div className="flex items-start gap-2.5">
                                            <Image
                                                src="/logo-short.jpeg"
                                                alt="Forge"
                                                width={22}
                                                height={22}
                                                className="mt-0.5 h-[22px] w-[22px] shrink-0 rounded-md"
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1.5 flex items-center gap-1.5">
                                                    <span className="text-[10px] font-medium text-white/45">
                                                        Forge
                                                    </span>

                                                    {isLiveStream && (
                                                        <span className="flex items-center gap-1 text-[9px] text-blue-400/50">
                                                            <span className="h-1 w-1 animate-pulse rounded-full bg-blue-400" />
                                                            working
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="rounded-xl border border-white/[0.045] bg-white/[0.025] px-3 py-2.5">
                                                    {isLiveStream &&
                                                        !msg.content ? (
                                                        <div className="flex items-center gap-2">
                                                            <Wand2 className="h-3.5 w-3.5 animate-pulse text-blue-400/60" />

                                                            <span className="text-[11px] text-white/30">
                                                                Forge is thinking...
                                                            </span>
                                                        </div>
                                                    ) : isLiveStream &&
                                                        msg.content ? (
                                                        <div>
                                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                                <Wand2 className="h-3 w-3 text-blue-400/60" />

                                                                <span className="text-[9px] font-medium uppercase tracking-wider text-blue-400/50">
                                                                    Agent reasoning
                                                                </span>
                                                            </div>

                                                            <p className="text-[11px] leading-relaxed text-white/35">
                                                                {msg.content}

                                                                <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-blue-400/60 align-middle" />
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="prose prose-sm prose-invert max-w-none break-words text-[12px] leading-relaxed text-white/65 [&_code]:rounded [&_code]:bg-white/[0.08] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-blue-300/80 [&_code]:text-[11px] [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/40 [&_pre]:p-2.5 [&_ul]:my-1 [&_li]:my-0.5">
                                                            <ReactMarkdown>
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* ================================================== */}
                        {/* AGENT STATUS                                       */}
                        {/* ================================================== */}

                        {isGenerating && (
                            <div className="flex items-start gap-2.5">
                                <Image
                                    src="/logo-short.jpeg"
                                    alt="Forge"
                                    width={22}
                                    height={22}
                                    className="mt-0.5 h-[22px] w-[22px] rounded-md"
                                />

                                <div className="min-w-0 flex-1">
                                    <div className="mb-1.5 flex items-center gap-1.5">
                                        <span className="text-[10px] font-medium text-white/45">
                                            Forge
                                        </span>

                                        <span className="flex items-center gap-1 text-[9px] text-blue-400/50">
                                            <span className="h-1 w-1 animate-pulse rounded-full bg-blue-400" />
                                            working
                                        </span>
                                    </div>

                                    <div className="rounded-xl border border-white/[0.045] bg-white/[0.025] px-3 py-3">
                                        <div className="space-y-2">
                                            {statusLog.map((step, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2"
                                                >
                                                    <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                                                        {step.status === "running" ? (
                                                            <Loader2 className="h-3 w-3 animate-spin text-blue-400/80" />
                                                        ) : (
                                                            <Check className="h-3 w-3 text-white/25" />
                                                        )}
                                                    </div>

                                                    <span
                                                        className={cn(
                                                            "text-[10px]",
                                                            step.status === "running"
                                                                ? "text-white/65"
                                                                : "text-white/25"
                                                        )}
                                                    >
                                                        {step.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ====================================================== */}
            {/* NO CREDITS                                             */}
            {/* ====================================================== */}

            {noCredits && (
                <div className="mx-3 mb-2 rounded-xl border border-red-500/10 bg-red-950/20 px-3 py-2.5">
                    <p className="text-[11px] text-red-400/70">
                        You&apos;ve used all your credits.
                    </p>

                    <PricingModal reason="credits">
                        <button className="mt-2 flex items-center gap-1.5 text-[10px] text-white/60 hover:text-white">
                            <Sparkles className="h-3 w-3" />
                            Upgrade plan
                        </button>
                    </PricingModal>
                </div>
            )}

            {/* ====================================================== */}
            {/* COMPOSER                                               */}
            {/* ====================================================== */}

            <div className="shrink-0 border-t border-white/[0.06] bg-[#0b0b0b] p-3">
                {/* Image preview */}
                {pendingImageUrl && (
                    <div className="relative mb-2 w-fit">
                        <img
                            src={pendingImageUrl}
                            alt="pending upload"
                            className="h-14 w-14 rounded-lg border border-white/[0.08] object-cover"
                        />

                        <button
                            onClick={() =>
                                setPendingImageUrl(null)
                            }
                            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-black text-white/50 hover:text-white"
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </div>
                )}

                {/* Composer */}
                <div
                    className={cn(
                        "rounded-xl border bg-white/[0.025] transition-all",
                        isGenerating || isImproving
                            ? "border-white/[0.04]"
                            : noCredits
                                ? "border-white/[0.04] opacity-60"
                                : "border-white/[0.07] focus-within:border-white/[0.14] hover:border-white/[0.1]"
                    )}
                >
                    {/* Input */}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) =>
                            setInput(e.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        disabled={
                            isGenerating ||
                            isImproving ||
                            noCredits
                        }
                        placeholder={
                            noCredits
                                ? "Upgrade to keep building..."
                                : isImproving
                                    ? "Forge is improving your app..."
                                    : isGenerating
                                        ? "Forge is building..."
                                        : "Ask Forge to build..."
                        }
                        rows={1}
                        className="w-full resize-none bg-transparent px-3.5 pb-2 pt-3 text-[12px] text-white/80 outline-none placeholder:text-white/20"
                        style={{ maxHeight: 150 }}
                    />

                    {/* Composer toolbar */}
                    <div className="flex items-center justify-between px-2 pb-2">
                        <div className="flex items-center gap-1">
                            {/* Add / attachment */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    fileRef.current?.click()
                                }
                                disabled={
                                    isGenerating ||
                                    isImproving ||
                                    isUploading ||
                                    noCredits
                                }
                                className="h-7 w-7 rounded-lg text-white/25 hover:bg-white/[0.06] hover:text-white/60"
                            >
                                {isUploading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Plus className="h-3.5 w-3.5" />
                                )}
                            </Button>

                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            {/* Mode selector */}
                            <div className="relative">
                                <button
                                    onClick={() =>
                                        setShowModeMenu(
                                            !showModeMenu
                                        )
                                    }
                                    disabled={
                                        isGenerating ||
                                        isImproving ||
                                        noCredits
                                    }
                                    className="flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
                                >
                                    {mode}

                                    <ChevronDown className="h-3 w-3" />
                                </button>

                                {showModeMenu && (
                                    <div className="absolute bottom-9 left-0 z-50 w-32 overflow-hidden rounded-lg border border-white/[0.08] bg-[#151515] p-1 shadow-2xl">
                                        <button
                                            onClick={() => {
                                                setMode("Agent");
                                                setShowModeMenu(false);
                                            }}
                                            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[10px] text-white/55 hover:bg-white/[0.06] hover:text-white"
                                        >
                                            Agent
                                            {mode === "Agent" && (
                                                <Check className="h-3 w-3" />
                                            )}
                                        </button>

                                        <button
                                            onClick={() => {
                                                setMode("Ask");
                                                setShowModeMenu(false);
                                            }}
                                            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[10px] text-white/55 hover:bg-white/[0.06] hover:text-white"
                                        >
                                            Ask
                                            {mode === "Ask" && (
                                                <Check className="h-3 w-3" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Send / Stop */}
                        {isGenerating || isImproving ? (
                            <Button
                                size="icon"
                                onClick={onStop}
                                className="h-7 w-7 rounded-lg bg-white/[0.09] text-white/60 transition-all hover:bg-white/[0.15] hover:text-white active:scale-95"
                            >
                                <Square className="h-3 w-3 fill-current" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className={cn(
                                    "h-7 w-7 rounded-lg transition-all",
                                    canSubmit
                                        ? "bg-white text-black hover:bg-white/90 active:scale-95"
                                        : "bg-white/[0.06] text-white/15"
                                )}
                            >
                                <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                <p className="mt-1.5 text-center text-[9px] text-white/15">
                    {isGenerating || isImproving
                        ? "Click ■ to stop"
                        : "Enter to send · Shift + Enter for new line"}
                </p>
            </div>
        </div>
    );
}
"use client";
import { Badge } from "@/components/ui/badge";
import { GravityStarsBackground } from "@/components/animate-ui/components/backgrounds/gravity-stars";
import { BlueTitle, GrayTitle } from "@/components/reusables";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Show, SignInButton, useAuth } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";

export default function Home() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  return (
    <main className="min-h-screen bg-[#0a0a0a] selection:bg-white/20">
      <section className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 pb-24 pt-40 text-center">

        {/* Full screen background */}
        <GravityStarsBackground
          className="absolute inset-0 z-0 h-full w-full"
          style={{
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <Badge
            variant="outline"
            className="gap-2 p-4 text-white backdrop-blur-sm"
          >
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Powered by Gemini 3.5 Flash
          </Badge>
        </div>
        <h1 className="mx-auto max-w-3xl text-balance font-serif text-5xl leading-tight tracking-tight sm:text-5xl lg:text-7xl z-10">
          <GrayTitle>Forge your dream</GrayTitle>
          <br />
          <BlueTitle>from a single prompt.</BlueTitle>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-white/40 z-10">
          Describe what you want to build. AI writes the code, picks the
          packages, and renders a live preview all inside your browser.
        </p>

        {/* Prompt Box */}
        <div className="relative z-10 mx-auto mt-10 w-full max-w-2xl">
          <div
            className={cn(
              "rounded-2xl border bg-[#111111] p-2.5 transition-all duration-200",
              isFocused
                ? "border-white/20 ring-1 ring-white/8"
                : "border-white/8",
            )}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Place your prompt here..."
              rows={2}
              className="h-12 w-full resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
            />

            <div className="flex justify-end">
              {isSignedIn ? (
                <Button
                  disabled={!prompt.trim()}
                  onClick={() =>
                    router.push(`/workspace?prompt=${encodeURIComponent(prompt.trim())}`)
                  }
                  className="h-8 rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-40"
                >
                  Generate
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button className="h-8 rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90">
                    Generate
                  </Button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
        {/* Suggested Prompts */}
        <div className="relative z-10 mx-auto mt-6 flex w-full max-w-3xl flex-wrap justify-center gap-2">
          {[
            "A Spotify stats dashboard with charts",
            "A kanban board with drag and drop",
            "A weather app with animated icons",
            "A personal finance tracker",
            "A recipe finder with filters",
            "A pomodoro timer with tasks",
          ].map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              onClick={() => setPrompt(suggestion)}
              className="group h-auto rounded-full border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-normal text-white/45 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            >
              {suggestion}
            </Button>
          ))}
        </div>
        {/* Workspace Demo */}
        <div className="relative z-10 mx-auto mt-16 w-full max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f] shadow-2xl shadow-black/50">

            {/* Window Header */}
            <div className="flex h-10 items-center border-b border-white/10 bg-[#111113] px-4">

              {/* macOS dots */}
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
              </div>

              {/* Address bar */}
              <div className="mx-auto rounded-md border border-white/5 bg-white/[0.03] px-20 py-1 text-[10px] text-white/30">
                app-builder.dev/workspace
              </div>

              <div className="w-20" />
            </div>

            {/* Main Workspace */}
            <div className="grid min-h-[420px] grid-cols-[40%_60%]">

              {/* Chat Sidebar */}
              <div className="flex flex-col border-r border-white/10 bg-[#0f0f11]">

                {/* Chat Header */}
                <div className="flex h-12 items-center border-b border-white/10 px-5">
                  <span className="text-sm font-medium text-white/80">
                    Chat
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-5 overflow-hidden p-5">

                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-xs leading-relaxed text-white">
                      Build me a task manager app with Kanban board
                    </div>
                  </div>

                  {/* AI message */}
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-zinc-800/50 px-4 py-3 text-xs leading-relaxed text-white/60">
                      I'll create a task manager with a Kanban board.
                      Setting up the project...
                    </div>
                  </div>

                  {/* AI message */}
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-zinc-800/50 px-4 py-3 text-xs leading-relaxed text-white/60">
                      Installing dependencies and generating components...
                    </div>
                  </div>

                  {/* Typing indicator */}
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-zinc-800/50 px-4 py-3">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" />
                    </div>
                  </div>

                </div>

                {/* Chat Input */}
                <div className="border-t border-white/10 p-4">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/25">
                    Type your message...
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="flex flex-col bg-[#0a0a0c]">

                {/* Tabs */}
                <div className="flex h-12 items-center gap-6 border-b border-white/10 px-5">
                  <button className="relative h-full text-xs font-medium text-white">
                    Preview
                    <span className="absolute bottom-0 left-0 h-px w-full bg-blue-500" />
                  </button>

                  <button className="text-xs text-white/30">
                    Code
                  </button>
                </div>

                {/* Canvas */}
                <div className="flex flex-1 items-center justify-center p-6">

                  <div className="w-full max-w-xl rounded-xl border border-white/10 bg-[#121216] p-4">

                    {/* Mini Kanban Header */}
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-white/80">
                          Task Manager
                        </p>
                        <p className="mt-1 text-[9px] text-white/30">
                          Manage your tasks
                        </p>
                      </div>

                      <div className="h-6 w-16 rounded-md bg-white/5" />
                    </div>

                    {/* Kanban Columns */}
                    <div className="grid grid-cols-3 gap-3">

                      {/* Todo */}
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-white/60">
                            Todo
                          </span>
                          <span className="text-[9px] text-white/20">
                            3
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="h-14 rounded-md border border-white/5 bg-white/[0.035]" />
                          <div className="h-10 rounded-md border border-white/5 bg-white/[0.035]" />
                          <div className="h-12 rounded-md border border-white/5 bg-white/[0.035]" />
                        </div>
                      </div>

                      {/* In Progress */}
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-white/60">
                            In Progress
                          </span>
                          <span className="text-[9px] text-white/20">
                            2
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="h-12 rounded-md border border-white/5 bg-white/[0.035]" />
                          <div className="h-16 rounded-md border border-white/5 bg-white/[0.035]" />
                        </div>
                      </div>

                      {/* Done */}
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-white/60">
                            Done
                          </span>
                          <span className="text-[9px] text-white/20">
                            4
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="h-10 rounded-md border border-white/5 bg-white/[0.035]" />
                          <div className="h-14 rounded-md border border-white/5 bg-white/[0.035]" />
                          <div className="h-10 rounded-md border border-white/5 bg-white/[0.035]" />
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
        {/* From Prompt to Production */}
        <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/30">
              Everything you need
            </p>

            <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              <GrayTitle>From prompt to</GrayTitle>{" "}
              <BlueTitle>production.</BlueTitle>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-white/40">
              Turn your ideas into fully functional applications with AI that
              handles the code, dependencies, previews, and everything in between.
            </p>
          </div>

          {/* Features */}
          {/* ...your feature cards here... */}
          <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {/* Instant Generation */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_20px_60px_rgba(255,255,255,0.05)]">
              <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10">
                ✦
              </div>

              <h3 className="text-sm font-medium text-white">
                Instant Generation
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/40">
                Describe what you want and watch AI turn your idea into a working
                application in seconds.
              </p>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

              <p className="mt-4 text-xs text-white/20">
                From idea → working app
              </p>
            </div>

            {/* Live Preview */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_20px_60px_rgba(255,255,255,0.05)]">
              <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10">
                ◉
              </div>

              <h3 className="text-sm font-medium text-white">
                Live Preview
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/40">
                See your application come to life instantly. Iterate on your idea
                without waiting for builds or deployments.
              </p>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

              <p className="mt-4 text-xs text-white/20">
                Build → preview → refine
              </p>
            </div>

            {/* Full Source Code */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_20px_60px_rgba(255,255,255,0.05)]">
              <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] font-mono text-xs text-white transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10">
                {"</>"}
              </div>

              <h3 className="text-sm font-medium text-white">
                Full Source Code
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/40">
                Get clean, editable source code for every part of your application.
                Your project stays yours.
              </p>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

              <p className="mt-4 text-xs text-white/20">
                Inspect → edit → export
              </p>
            </div>

            {/* Smart Packages */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_20px_60px_rgba(255,255,255,0.05)]">
              <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10">
                ◈
              </div>

              <h3 className="text-sm font-medium text-white">
                Smart Packages
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/40">
                AI automatically chooses the right libraries and dependencies for
                your application instead of making you configure everything manually.
              </p>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

              <p className="mt-4 text-xs text-white/20">
                Right tools → automatically
              </p>
            </div>

            {/* AI Error Recovery */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_20px_60px_rgba(255,255,255,0.05)]">
              <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10">
                ↻
              </div>

              <h3 className="text-sm font-medium text-white">
                AI Error Recovery
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/40">
                When something breaks, AI identifies the problem, fixes the code,
                and gets your application running again automatically.
              </p>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

              <p className="mt-4 text-xs text-white/20">
                Detect → fix → recover
              </p>
            </div>

            {/* Image-Aware Prompts */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_20px_60px_rgba(255,255,255,0.05)]">
              <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10">
                ⌁
              </div>

              <h3 className="text-sm font-medium text-white">
                Image-Aware Prompts
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/40">
                Give AI a screenshot, mockup, or visual reference and let it
                understand the design and turn it into a working interface.
              </p>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

              <p className="mt-4 text-xs text-white/20">
                Upload → understand → build
              </p>
            </div>

          </div>
        </section>
        {/* How It Works */}
        <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-28 pt-24">
          {/* Section Heading */}
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">

            {/* Label with lines */}
            <div className="mb-5 flex w-full items-center justify-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-blue-400/60" />

              <span className="text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
                How it works
              </span>

              <span className="h-px w-10 bg-gradient-to-l from-transparent to-blue-400/60" />
            </div>

            <h2 className="font-serif text-5xl leading-tight tracking-tight sm:text-6xl">
              <GrayTitle>Four steps</GrayTitle>
              <br />
              <BlueTitle>to a working app.</BlueTitle>
            </h2>
          </div>

          {/* Steps */}
          <div className="mx-auto mt-20 max-w-4xl">
            <div className="space-y-12">

              {/* Step 01 */}
              <div className="group grid grid-cols-[52px_1fr] items-start gap-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm font-medium text-white/50 transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/[0.06] group-hover:text-white">
                  01
                </div>

                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white">
                    Describe your app
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40 sm:text-base">
                    Type a prompt or pick a suggestion. Add screenshots for extra
                    context.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="group grid grid-cols-[52px_1fr] items-start gap-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm font-medium text-white/50 transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/[0.06] group-hover:text-white">
                  02
                </div>

                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white">
                    AI generates code
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40 sm:text-base">
                    Gemini writes React + Tailwind components, picks dependencies,
                    and structures your files.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="group grid grid-cols-[52px_1fr] items-start gap-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm font-medium text-white/50 transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/[0.06] group-hover:text-white">
                  03
                </div>

                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white">
                    Preview & refine
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40 sm:text-base">
                    See your app live instantly. Keep chatting to iterate — AI
                    remembers the full conversation.
                  </p>
                </div>
              </div>

              {/* Step 04 */}
              <div className="group grid grid-cols-[52px_1fr] items-start gap-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm font-medium text-white/50 transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/[0.06] group-hover:text-white">
                  04
                </div>

                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white">
                    Export or deploy
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40 sm:text-base">
                    Open in CodeSandbox, copy the source, or deploy to a live URL —
                    all in one click.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>
        {/* Pricing */}
        <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-24">

          {/* Heading */}
          <div className="mx-auto max-w-3xl text-center">

            <div className="mb-5 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-blue-400/60" />

              <span className="text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
                Simple pricing
              </span>

              <span className="h-px w-10 bg-gradient-to-l from-transparent to-blue-400/60" />
            </div>

            <h2 className="font-serif text-5xl leading-tight tracking-tight sm:text-6xl">
              <GrayTitle>Start free.</GrayTitle>
              <br />
              <BlueTitle>Scale when you need.</BlueTitle>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/40">
              Start building for free and upgrade when you need more power,
              credits, and flexibility.
            </p>
          </div>


          {/* Plans */}
          <div className="mx-auto mt-16 grid max-w-5xl gap-5 md:grid-cols-3">

            {/* FREE */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">

              <h3 className="text-lg font-medium text-white">
                Free
              </h3>

              <p className="mt-2 text-sm text-white/40">
                Everything you need to start building.
              </p>

              <div className="mt-6">
                <span className="font-serif text-4xl text-white">
                  $0
                </span>
                <span className="ml-1 text-sm text-white/30">
                  / forever
                </span>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-white/50">
                <li>✓ 40 AI credits</li>
                <li>✓ AI code generation</li>
                <li>✓ Live preview</li>
                <li>✓ Source code access</li>
              </ul>

              <button
                disabled
                className="mt-8 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white/40"
              >
                Current plan
              </button>
            </div>


            {/* STARTER */}
            <div className="relative flex flex-col rounded-2xl border border-blue-400/30 bg-white/[0.035] p-6 shadow-[0_0_50px_rgba(59,130,246,0.08)]">

              {/* Popular Badge */}
              <div className="absolute right-5 top-5 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-blue-400">
                Popular
              </div>

              <h3 className="text-lg font-medium text-white">
                Starter
              </h3>

              <p className="mt-2 text-sm text-white/40">
                More power for serious projects.
              </p>

              <div className="mt-6">
                <span className="font-serif text-4xl text-white">
                  $9
                </span>
                <span className="ml-1 text-sm text-white/30">
                  / month
                </span>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-white/50">
                <li>✓ 200 AI credits</li>
                <li>✓ Unlimited projects</li>
                <li>✓ Live previews</li>
                <li>✓ Full source code</li>
              </ul>

              {/* Button */}
              <div className="mt-auto pt-8">
                <Show when="signed-in">
                  <CheckoutButton
                    planId="cplan_3JN1tTD0LCVXsLMvPccLdUqsuke"
                    planPeriod="month"
                    checkoutProps={{
                      appearance: {
                        variables: {
                          colorPrimary: "#3b82f6",
                        },
                      },
                    }}
                  >
                    <button className="h-11 w-full rounded-xl bg-white text-sm font-medium text-black transition-all duration-300 hover:bg-white/90 hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]">
                      Subscribe
                    </button>
                  </CheckoutButton>
                </Show>

                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="h-11 w-full rounded-xl bg-white text-sm font-medium text-black transition-all duration-300 hover:bg-white/90 hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]">
                      Get Started
                    </button>
                  </SignInButton>
                </Show>
              </div>

            </div>


            {/* PRO */}
            <div className="relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-6">

              <h3 className="text-lg font-medium text-white">
                Pro
              </h3>

              <p className="mt-2 text-sm text-white/40">
                Maximum power for production apps.
              </p>

              <div className="mt-6">
                <span className="font-serif text-4xl text-white">
                  $19
                </span>
                <span className="ml-1 text-sm text-white/30">
                  / month
                </span>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-white/50">
                <li>✓ 500 AI credits</li>
                <li>✓ Unlimited projects</li>
                <li>✓ Priority generation</li>
                <li>✓ Advanced AI recovery</li>
              </ul>

              {/* Button */}
              <div className="mt-auto pt-8">
                <Show when="signed-in">
                  <CheckoutButton
                    planId="cplan_3JN1zWGmn6TJPJUCiFo2s0dWsNd"
                    planPeriod="month"
                    checkoutProps={{
                      appearance: {
                        variables: {
                          colorPrimary: "#3b82f6",
                        },
                      },
                    }}
                  >
                    <button className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium text-white transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_25px_rgba(255,255,255,0.08)]">
                      Subscribe
                    </button>
                  </CheckoutButton>
                </Show>

                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium text-white transition-all duration-300 hover:bg-white/10">
                      Get Started
                    </button>
                  </SignInButton>
                </Show>
              </div>

            </div>
          </div>
        </section>
      </section>
    </main >
  );
}
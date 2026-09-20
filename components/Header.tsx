import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { checkUser } from "@/lib/checkUser";

const Header = async () => {
  const user = await checkUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-16 border-b border-white/10 bg-[#181818]">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Forge Logo"
            width={100}
            height={100}
            className="h-9 w-auto rounded-md"
            priority
          />
        </Link>

        {/* Signed In */}
        <Show when="signed-in">
          <div className="flex items-center gap-5">

            {/* Projects */}
            <Link
              href="/projects"
              className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
            >
              Projects
            </Link>

            {/* Credits */}
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70">
              <Zap className="h-3 w-3 fill-white/70" />

              {user?.credits}/
              {user?.plan === "pro"
                ? 2000
                : user?.plan === "starter"
                  ? 500
                  : 40}{" "}
              credits
            </span>

            {/* User */}
            <UserButton />
          </div>
        </Show>

        {/* Signed Out */}
        <Show when="signed-out">
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full px-4 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                Sign In
              </Button>
            </SignInButton>

            <SignUpButton mode="modal">
              <Button
                size="sm"
                className="h-9 rounded-full bg-white px-5 text-sm font-semibold text-black shadow-sm transition-all hover:bg-white/90 hover:shadow-md"
              >
                Sign Up
              </Button>
            </SignUpButton>
          </div>
        </Show>

      </nav>
    </header>
  );
};

export default Header;
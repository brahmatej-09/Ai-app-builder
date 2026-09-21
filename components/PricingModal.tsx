"use client";

import { useAuth, SignInButton } from "@clerk/nextjs";
import {
  CheckoutButton,
  usePlans,
} from "@clerk/nextjs/experimental";
import { ArrowRight, Check, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BlueTitle, GrayTitle } from "./reusables";
import { PRICING_PLANS, PLANS } from "@/lib/constants";

interface PricingModalProps {
  children: React.ReactNode;
  reason?: "credits" | "upgrade";
}

export function PricingModal({
  children,
  reason = "upgrade",
}: PricingModalProps) {
  const { isSignedIn, has } = useAuth();

  /*
   * Get the actual plans configured in Clerk.
   * We match them using their slug:
   *
   * starter -> Starter plan
   * pro     -> Pro plan
   */
  const {
    data: clerkPlans,
    isLoading: plansLoading,
    isError: plansError,
  } = usePlans({
    for: "user",
    pageSize: 10,
  });

  const title =
    reason === "credits"
      ? "You're out of credits"
      : "Upgrade your plan";

  const description =
    reason === "credits"
      ? "You've used all your credits. Upgrade to keep building."
      : "Choose a plan that fits how much you build.";

  const planOrder: Record<string, number> = {
    free: 0,
    starter: 1,
    pro: 2,
  };

  const activePlanKey = isSignedIn
    ? has?.({ plan: "pro" })
      ? "pro"
      : has?.({ plan: "starter" })
        ? "starter"
        : "free"
    : null;

  return (
    <Dialog>
      <DialogTrigger className="cursor-pointer">
        {children}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/8 bg-[#0f0f0f] p-0 text-white sm:max-w-5xl">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle className="font-serif text-xl tracking-tight text-white/90">
            <BlueTitle className="text-4xl">
              {title}
            </BlueTitle>
          </DialogTitle>

          <DialogDescription className="text-sm text-white/35">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Current plan summary banner */}
        {isSignedIn && activePlanKey && (
          <div className="mx-6 mb-2 flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
              {activePlanKey === "pro" ? (
                <Crown className="h-4 w-4 text-blue-400" />
              ) : (
                <Zap className="h-4 w-4 text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/80">
                Current plan: <span className="text-blue-400">{PLANS[activePlanKey as keyof typeof PLANS]?.label ?? activePlanKey}</span>
              </p>
              <p className="text-[11px] text-white/35">
                {PLANS[activePlanKey as keyof typeof PLANS]?.credits ?? 0} credits/month
                {activePlanKey === "free" ? " · No credit card required" : " · Billed monthly"}
              </p>
            </div>
            {activePlanKey !== "pro" && (
              <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                Upgrade available
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-3">
          {PRICING_PLANS.map((plan) => {
            const isActive =
              isSignedIn && activePlanKey === plan.key;

            const isDowngrade =
              isSignedIn &&
              activePlanKey !== null &&
              !isActive &&
              planOrder[plan.key] < planOrder[activePlanKey];

            /*
             * Find the real Clerk Billing Plan.
             *
             * We use the slug instead of a hardcoded cplan_ ID.
             */
            const clerkPlan =
              clerkPlans?.find(
                (clerkPlan) => clerkPlan.slug === plan.key
              );

            const canCheckout =
              isSignedIn &&
              !isActive &&
              !isDowngrade &&
              plan.price > 0 &&
              !!clerkPlan?.id &&
              !plansLoading &&
              !plansError;

            return (
              <div
                key={plan.key}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-5 transition-colors",
                  plan.featured
                    ? "border-blue-500/50 bg-blue-500/4"
                    : "border-white/12 bg-[#0a0a0a]"
                )}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full border border-blue-500/20 bg-[#0a0a0a] px-3 py-1 text-[11px] font-medium text-blue-400">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm font-semibold text-white/90">
                    {plan.label}
                  </p>

                  {isActive && (
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                      Active
                    </span>
                  )}
                </div>

                <p className="mb-6 text-xs leading-relaxed text-white/35">
                  {plan.description}
                </p>

                {/* Price */}
                {isActive ? (
                  <div className="mb-7 flex h-11 items-center">
                    <span className="font-serif text-2xl text-white/70">
                      Current plan
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="mb-1 flex items-baseline gap-1">
                      <span className="font-serif text-4xl">
                        {plan.price === 0 ? (
                          <GrayTitle>$0</GrayTitle>
                        ) : (
                          <BlueTitle>${plan.price}</BlueTitle>
                        )}
                      </span>

                      {plan.price > 0 && (
                        <span className="text-sm text-white/30">
                          /mo
                        </span>
                      )}
                    </div>

                    <p className="mb-6 text-xs text-white/25">
                      {plan.price === 0
                        ? "Always free"
                        : "Only billed monthly"}
                    </p>
                  </>
                )}

                <div className="mb-8 space-y-3 border-t border-white/6 pt-6">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2.5"
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                          plan.featured
                            ? "bg-blue-500/15"
                            : "bg-white/8"
                        )}
                      >
                        <Check
                          className={cn(
                            "h-2.5 w-2.5",
                            plan.featured
                              ? "text-blue-400"
                              : "text-white/50"
                          )}
                        />
                      </div>

                      <span className="text-xs text-white/55">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  {/* CURRENT PLAN */}
                  {isActive ? (
                    <Button
                      disabled
                      variant="ghost"
                      className="w-full cursor-not-allowed rounded-full border border-white/10 bg-transparent text-sm font-semibold text-white/60 opacity-50"
                    >
                      ✓ Current plan
                    </Button>
                  ) : plan.price === 0 ? (
                    /* FREE PLAN */
                    isSignedIn ? (
                      <Button
                        disabled
                        variant="ghost"
                        className="w-full cursor-not-allowed rounded-full border border-white/10 bg-transparent text-sm font-semibold text-white/60 opacity-50"
                      >
                        Default plan
                      </Button>
                    ) : (
                      <SignInButton mode="modal">
                        <Button
                          variant="ghost"
                          className="w-full rounded-full border border-white/10 bg-transparent text-sm font-semibold text-white/60 hover:bg-white/6 hover:text-white/90"
                        >
                          Get started free
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </SignInButton>
                    )
                  ) : isDowngrade ? (
                    /* LOWER PLAN */
                    <Button
                      disabled
                      variant="ghost"
                      className="w-full cursor-not-allowed rounded-full border border-white/10 bg-transparent text-sm font-semibold text-white/40"
                    >
                      Lower plan
                    </Button>
                  ) : !isSignedIn ? (
                    /* NOT SIGNED IN */
                    <SignInButton mode="modal">
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full rounded-full text-sm font-semibold transition-all",
                          plan.featured
                            ? "bg-blue-500 text-white hover:bg-blue-400 active:scale-95"
                            : "border border-white/10 bg-transparent text-white/60 hover:bg-white/6 hover:text-white/90"
                        )}
                      >
                        Upgrade
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </SignInButton>
                  ) : plansLoading ? (
                    /* LOADING CLERK PLANS */
                    <Button
                      disabled
                      variant="ghost"
                      className="w-full cursor-not-allowed rounded-full border border-white/10 bg-transparent text-sm font-semibold text-white/40"
                    >
                      Loading...
                    </Button>
                  ) : !clerkPlan?.id || plansError ? (
                    /* CLERK PLAN NOT AVAILABLE */
                    <Button
                      disabled
                      variant="ghost"
                      className="w-full cursor-not-allowed rounded-full border border-red-500/20 bg-red-500/5 text-sm font-semibold text-red-400/70"
                    >
                      Plan unavailable
                    </Button>
                  ) : (
                    /* REAL CLERK CHECKOUT */
                    <CheckoutButton
                      planId={clerkPlan.id}
                      planPeriod="month"
                      checkoutProps={{
                        appearance: {
                          elements: {
                            drawerRoot: {
                              zIndex: 2000,
                            },
                          },
                        },
                      }}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full rounded-full text-sm font-semibold transition-all",
                          plan.featured
                            ? "bg-blue-500 text-white hover:bg-blue-400 active:scale-95"
                            : "border border-white/10 bg-transparent text-white/60 hover:bg-white/6 hover:text-white/90"
                        )}
                      >
                        Upgrade
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CheckoutButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
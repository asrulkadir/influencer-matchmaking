"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Lightweight client component rendered when the dashboard detects a
 * `?role=` query-param that differs from the current session role.
 *
 * It calls the switch-role API, refreshes the JWT via `update()`,
 * then redirects to a clean `/dashboard` URL.
 */
export function RoleSwitcher({ role }: { role: string }) {
  const { update } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function switchRole() {
      try {
        const res = await fetch("/api/auth/switch-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: role.toUpperCase() }),
        });

        const data = await res.json();

        if (cancelled) return;

        if (data.needsOnboarding) {
          router.replace(`/onboarding?role=${role.toLowerCase()}`);
          return;
        }

        if (data.success) {
          // Refresh the NextAuth JWT so session.user.role is up-to-date
          await update();
          // Clear the onboarding-role cookie (leftover from sign-in)
          document.cookie = "onboarding-role=;path=/;max-age=0";
          router.replace("/dashboard");
          return;
        }

        setError(data.error ?? "Failed to switch role");
      } catch {
        if (!cancelled) setError("Something went wrong");
      }
    }

    switchRole();
    return () => {
      cancelled = true;
    };
  }, [role, update, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/dashboard")}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Switching role…</p>
    </div>
  );
}

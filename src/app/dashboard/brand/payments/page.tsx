"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EscrowManager } from "@/components/payments/escrow-manager";

type EscrowPayment = {
  id: string;
  creatorName: string;
  campaignTitle: string;
  amount: number;
  creatorPayout: number;
  platformFee: number;
  status: string;
  fundedAt: string | null;
  releasedAt: string | null;
};

export default function BrandPaymentsPage() {
  const { data: session, status } = useSession();
  const [escrows, setEscrows] = useState<EscrowPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchEscrows = async () => {
      try {
        const res = await fetch("/api/payments/escrow");
        if (res.ok) {
          const data = await res.json();
          setEscrows(data.escrows ?? []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchEscrows();
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>
          Please{" "}
          <Link href="/auth/signin" className="text-primary hover:underline">
            sign in
          </Link>{" "}
          to view payments.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <span className="text-lg font-bold">CreatorMatch</span>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Campaigns", href: "/dashboard/brand/campaigns" },
              { label: "Payments", href: "/dashboard/brand/payments", active: true },
              { label: "Settings", href: "/dashboard/brand/settings" },
            ].map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`block rounded-lg px-4 py-2.5 text-sm ${
                    item.active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">
            Manage escrow payments for your campaigns
          </p>
        </div>

        {escrows.length > 0 ? (
          <EscrowManager escrows={escrows} />
        ) : (
          <div className="rounded-xl border bg-white p-12 text-center">
            <p className="text-lg font-medium">No payments yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Payments will appear here once you start campaigns with creators.
            </p>
            <Link
              href="/dashboard/brand/campaigns"
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              View Campaigns
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

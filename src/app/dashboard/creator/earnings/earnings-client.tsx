"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

const creatorNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Campaigns", href: "/dashboard/creator/campaigns" },
  { label: "Invitations", href: "/dashboard/creator/invitations" },
  { label: "Earnings", href: "/dashboard/creator/earnings" },
  { label: "Analytics", href: "/dashboard/creator/analytics" },
  { label: "Portfolio", href: "/dashboard/creator/portfolio" },
  { label: "Profile", href: "/dashboard/creator/profile" },
];

export function CreatorEarningsClient({
  payments,
  totalEarnings,
  pendingPayments,
  stripeConnected,
}: {
  payments: any[];
  totalEarnings: number;
  pendingPayments: number;
  stripeConnected: boolean;
}) {
  return (
    <DashboardLayout navItems={creatorNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-muted-foreground">
          Track your campaign earnings and payouts
        </p>
      </div>

      {/* Stripe Connection Status */}
      {!stripeConnected && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800">
            Complete your Stripe setup to receive payouts
          </p>
          <a
            href="/dashboard/creator/profile"
            className="mt-1 inline-block text-sm text-primary hover:underline"
          >
            Go to Profile Settings →
          </a>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-muted-foreground">Total Earned</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            ${totalEarnings.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-muted-foreground">Pending Payouts</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            ${pendingPayments.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-muted-foreground">Total Transactions</p>
          <p className="mt-2 text-3xl font-bold">{payments.length}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border bg-white">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Transaction History</h2>
        </div>
        {payments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No transactions yet. Earnings will appear here when brands fund
            campaigns you&apos;re part of.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                  <th className="px-6 py-3">Campaign</th>
                  <th className="px-6 py-3">Brand</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Your Payout</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium">
                      {p.campaignCreator?.campaign?.title ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {p.campaignCreator?.campaign?.brand?.companyName ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      ${Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium">
                      ${Number(p.creatorPayout).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <EscrowBadge status={p.status} />
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function EscrowBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    FUNDED: "bg-yellow-100 text-yellow-700",
    RELEASED: "bg-green-100 text-green-700",
    REFUNDED: "bg-red-100 text-red-700",
    DISPUTED: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${config[status] ?? "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}

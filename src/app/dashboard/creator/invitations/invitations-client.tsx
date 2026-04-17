"use client";

import { useState } from "react";
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

export function CreatorInvitationsClient({
  invitations: initialInvitations,
}: {
  invitations: any[];
}) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleRespond(campaignCreatorId: string, accept: boolean) {
    setLoading(campaignCreatorId);
    try {
      const res = await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignCreatorId,
          status: accept ? "ACCEPTED" : "REJECTED",
        }),
      });
      if (res.ok) {
        setInvitations((prev) =>
          prev.filter((inv) => inv.id !== campaignCreatorId)
        );
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <DashboardLayout navItems={creatorNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Invitations</h1>
        <p className="text-muted-foreground">
          Campaign invitations from brands
        </p>
      </div>

      {invitations.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-muted-foreground">
            No pending invitations. Check back later!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div key={inv.id} className="rounded-xl border bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {inv.campaign?.brand?.logo ? (
                    <img
                      src={inv.campaign.brand.logo}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-400">
                      {inv.campaign?.brand?.companyName?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {inv.campaign?.title ?? "Untitled Campaign"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {inv.campaign?.brand?.companyName}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  New Invitation
                </span>
              </div>

              {inv.campaign?.description && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {inv.campaign.description}
                </p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-medium">
                    ${Number(inv.campaign?.budget ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Platform</p>
                  <p className="font-medium capitalize">
                    {inv.campaign?.platform?.toLowerCase() ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invited</p>
                  <p className="font-medium">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={loading === inv.id}
                  onClick={() => handleRespond(inv.id, true)}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={loading === inv.id}
                  onClick={() => handleRespond(inv.id, false)}
                  className="rounded-lg border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-gray-50 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

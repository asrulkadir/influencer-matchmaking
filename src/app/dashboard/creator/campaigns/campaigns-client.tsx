"use client";

import Link from "next/link";
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

const statusConfig: Record<string, { color: string; label: string }> = {
  ACCEPTED: { color: "bg-green-100 text-green-700", label: "Active" },
  CONTENT_SUBMITTED: {
    color: "bg-yellow-100 text-yellow-700",
    label: "Submitted",
  },
  REVISION_REQUESTED: {
    color: "bg-orange-100 text-orange-700",
    label: "Revision Needed",
  },
  APPROVED: { color: "bg-purple-100 text-purple-700", label: "Approved" },
  PAID: { color: "bg-green-100 text-green-700", label: "Paid ✓" },
};

export function CreatorCampaignsClient({ campaigns }: { campaigns: any[] }) {
  return (
    <DashboardLayout navItems={creatorNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Campaigns</h1>
        <p className="text-muted-foreground">
          Campaigns you&apos;re actively working on
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-muted-foreground">
            No active campaigns. Accept an invitation to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((cc) => (
            <Link
              key={cc.id}
              href={`/dashboard/creator/campaigns/${cc.campaign?.id ?? cc.campaignId}`}
              className="block rounded-xl border bg-white p-6 transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {cc.campaign?.brand?.logo ? (
                    <img
                      src={cc.campaign.brand.logo}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-400">
                      {cc.campaign?.brand?.companyName?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {cc.campaign?.title ?? "Untitled"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {cc.campaign?.brand?.companyName}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusConfig[cc.status]?.color ?? "bg-gray-100 text-gray-700"}`}
                >
                  {statusConfig[cc.status]?.label ?? cc.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-medium">
                    ${Number(cc.campaign?.budget ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Your Payout</p>
                  <p className="font-medium">
                    {cc.escrow
                      ? `$${Number(cc.escrow.creatorPayout).toLocaleString()}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Escrow Status</p>
                  <p className="font-medium capitalize">
                    {cc.escrow?.status?.toLowerCase().replace("_", " ") ??
                      "N/A"}
                  </p>
                </div>
              </div>
              {["ACCEPTED", "REVISION_REQUESTED"].includes(cc.status) && (
                <div className="mt-3 text-right">
                  <span className="text-xs font-medium text-primary">
                    {cc.status === "REVISION_REQUESTED"
                      ? "Resubmit content →"
                      : "Submit content →"}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

"use client";

import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { CreatorMatchResults } from "@/components/campaigns/creator-match-results";

const brandNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campaigns", href: "/dashboard/brand/campaigns" },
  { label: "Creator Discovery", href: "/dashboard/brand/creators" },
  { label: "Payments", href: "/dashboard/brand/payments" },
  { label: "Analytics", href: "/dashboard/brand/analytics" },
  { label: "Settings", href: "/dashboard/brand/settings" },
];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  MATCHING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const creatorStatusColors: Record<string, string> = {
  INVITED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  CONTENT_SUBMITTED: "bg-yellow-100 text-yellow-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
  APPROVED: "bg-purple-100 text-purple-700",
  PAID: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

type CampaignDetail = {
  id: string;
  title: string;
  description: string;
  brief: string | null;
  status: string;
  budget: number;
  budgetPerCreator: number | null;
  maxCreators: number;
  startDate: string | null;
  endDate: string | null;
  targetPlatforms: string[];
  targetFollowers: number | null;
  targetEngagement: number | null;
  createdAt: string;
  nicheTags: Array<{ nicheTag: { name: string } | null }>;
  campaignCreators: Array<{
    id: string;
    status: string;
    matchScore: number | null;
    contentUrl: string | null;
    creator: {
      displayName: string;
      avatarUrl: string | null;
      totalFollowers: number;
      avgEngagement: number;
    } | null;
    escrow: {
      status: string;
      amount: number;
      creatorPayout: number;
    } | null;
  }>;
};

export function CampaignDetailClient({
  campaign,
}: {
  campaign: CampaignDetail;
}) {
  return (
    <DashboardLayout navItems={brandNav}>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/brand/campaigns"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Back to Campaigns
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.title}</h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[campaign.status] ?? "bg-gray-100"}`}
              >
                {campaign.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-muted-foreground">
              {campaign.description}
            </p>
          </div>
        </div>
      </div>

      {/* Campaign Info Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="mt-1 text-xl font-bold">
            ${Number(campaign.budget).toLocaleString()}
          </p>
          {campaign.budgetPerCreator && (
            <p className="text-xs text-muted-foreground">
              ${Number(campaign.budgetPerCreator).toLocaleString()} per creator
            </p>
          )}
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Creators</p>
          <p className="mt-1 text-xl font-bold">
            {campaign.campaignCreators.length} / {campaign.maxCreators}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Platforms</p>
          <div className="mt-1 flex gap-1">
            {campaign.targetPlatforms.map((p) => (
              <span
                key={p}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Niche Tags</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {campaign.nicheTags.map(
              (nt, i) =>
                nt.nicheTag && (
                  <span
                    key={nt.nicheTag.name}
                    className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600"
                  >
                    {nt.nicheTag.name}
                  </span>
                )
            )}
          </div>
        </div>
      </div>

      {/* Brief */}
      {campaign.brief && (
        <div className="mb-8 rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Campaign Brief</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {campaign.brief}
          </p>
        </div>
      )}

      {/* Creators */}
      {campaign.campaignCreators.length > 0 && (
        <div className="mb-8 rounded-xl border bg-white">
          <div className="border-b p-6">
            <h2 className="font-semibold">Campaign Creators</h2>
          </div>
          <div className="divide-y">
            {campaign.campaignCreators.map((cc) => (
              <div
                key={cc.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  {cc.creator?.avatarUrl ? (
                    <img
                      src={cc.creator.avatarUrl}
                      alt={cc.creator.displayName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400">
                      {cc.creator?.displayName?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {cc.creator?.displayName ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cc.creator?.totalFollowers.toLocaleString()} followers ·{" "}
                      {cc.creator?.avgEngagement.toFixed(1)}% eng.
                      {cc.matchScore && ` · Score: ${cc.matchScore}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {cc.escrow && (
                    <span className="text-sm font-medium">
                      ${Number(cc.escrow.amount).toLocaleString()}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${creatorStatusColors[cc.status] ?? "bg-gray-100"}`}
                  >
                    {cc.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching (only for ACTIVE or MATCHING campaigns) */}
      {["ACTIVE", "MATCHING", "DRAFT"].includes(campaign.status) && (
        <CreatorMatchResults campaignId={campaign.id} />
      )}
    </DashboardLayout>
  );
}

"use client";

import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

const brandNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campaigns", href: "/dashboard/brand/campaigns" },
  { label: "Creator Discovery", href: "/dashboard/brand/creators" },
  { label: "Payments", href: "/dashboard/brand/payments" },
  { label: "Analytics", href: "/dashboard/brand/analytics" },
  { label: "Settings", href: "/dashboard/brand/settings" },
];

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number;
  maxCreators: number;
  createdAt: string;
  nicheTags: Array<{ nicheTag: { name: string } | null }>;
  campaignCreators: Array<{ id: string; status: string }>;
};

export function CampaignsListClient({
  campaigns,
}: {
  campaigns: CampaignRow[];
}) {
  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-green-100 text-green-700",
    MATCHING: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-purple-100 text-purple-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <DashboardLayout navItems={brandNav}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage all your influencer campaigns
          </p>
        </div>
        <Link
          href="/dashboard/brand/campaigns/new"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          + New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-lg font-medium">No campaigns yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first campaign and our AI will match you with the best
            creators.
          </p>
          <Link
            href="/dashboard/brand/campaigns/new"
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/dashboard/brand/campaigns/${campaign.id}`}
              className="block rounded-xl border bg-white p-6 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{campaign.title}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[campaign.status] ?? "bg-gray-100"}`}
                    >
                      {campaign.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {campaign.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {campaign.nicheTags.map(
                      (nt) =>
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
                <div className="text-right">
                  <p className="text-lg font-bold">
                    ${Number(campaign.budget).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {campaign.campaignCreators.length} / {campaign.maxCreators}{" "}
                    creators
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

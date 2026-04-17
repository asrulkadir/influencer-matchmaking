"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

const brandNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campaigns", href: "/dashboard/brand/campaigns" },
  { label: "Creator Discovery", href: "/dashboard/brand/creators" },
  { label: "Payments", href: "/dashboard/brand/payments" },
  { label: "Analytics", href: "/dashboard/brand/analytics" },
  { label: "Settings", href: "/dashboard/brand/settings" },
];

type Creator = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  totalFollowers: number;
  avgEngagement: number;
  contentRate: number | null;
  isAvailable: boolean;
  tiktokHandle: string | null;
  instagramHandle: string | null;
  nicheTags: Array<{ nicheTag: { name: string } | null }>;
};

export function CreatorDiscoveryClient({
  creators,
  nicheTags,
}: {
  creators: Creator[];
  nicheTags: Array<{ id: string; name: string }>;
}) {
  const [search, setSearch] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");

  const filtered = creators.filter((c) => {
    const matchesSearch = c.displayName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesNiche =
      !selectedNiche ||
      c.nicheTags.some(
        (nt) =>
          nt.nicheTag?.name.toLowerCase() === selectedNiche.toLowerCase()
      );
    return matchesSearch && matchesNiche;
  });

  return (
    <DashboardLayout navItems={brandNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Creator Discovery</h1>
        <p className="text-muted-foreground">
          Browse and find the perfect creators for your campaigns
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search creators..."
          className="w-full max-w-sm rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={selectedNiche}
          onChange={(e) => setSelectedNiche(e.target.value)}
        >
          <option value="">All Niches</option>
          {nicheTags.map((tag) => (
            <option key={tag.id} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-muted-foreground">
            No creators found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((creator) => (
            <div
              key={creator.id}
              className="rounded-xl border bg-white p-6 transition hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-400">
                    {creator.displayName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{creator.displayName}</h3>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {creator.tiktokHandle && (
                      <span>TikTok: @{creator.tiktokHandle}</span>
                    )}
                    {creator.instagramHandle && (
                      <span>IG: @{creator.instagramHandle}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <p className="font-bold">
                    {creator.totalFollowers.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="font-bold">
                    {Number(creator.avgEngagement).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
                <div>
                  <p className="font-bold">
                    {creator.contentRate
                      ? `$${Number(creator.contentRate)}`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Rate</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {creator.nicheTags.map(
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
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

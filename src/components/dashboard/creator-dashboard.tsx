"use client";

interface CreatorDashboardProps {
  creator: any;
  campaigns: any[];
  stats: {
    activeCampaigns: number;
    totalEarnings: number;
    pendingPayments: number;
    invitations: number;
  };
}

export function CreatorDashboard({
  creator,
  campaigns,
  stats,
}: CreatorDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <span className="text-lg font-bold">CreatorMatch</span>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {[
              { label: "Dashboard", href: "/dashboard", active: true },
              { label: "My Campaigns", href: "/dashboard/creator/campaigns" },
              { label: "Invitations", href: "/dashboard/creator/invitations" },
              { label: "Earnings", href: "/dashboard/creator/earnings" },
              { label: "Analytics", href: "/dashboard/creator/analytics" },
              { label: "Portfolio", href: "/dashboard/creator/portfolio" },
              { label: "Profile", href: "/dashboard/creator/profile" },
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

        {/* Social Connections */}
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">TikTok</span>
              <span
                className={`h-2 w-2 rounded-full ${creator.tiktokHandle ? "bg-green-400" : "bg-gray-300"}`}
              />
            </div>
            {creator.tiktokHandle && (
              <p className="mt-1 text-xs text-muted-foreground">
                @{creator.tiktokHandle} ·{" "}
                {creator.tiktokFollowers.toLocaleString()} followers
              </p>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Instagram</span>
              <span
                className={`h-2 w-2 rounded-full ${creator.instagramHandle ? "bg-green-400" : "bg-gray-300"}`}
              />
            </div>
            {creator.instagramHandle && (
              <p className="mt-1 text-xs text-muted-foreground">
                @{creator.instagramHandle} ·{" "}
                {creator.instagramFollowers.toLocaleString()} followers
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Welcome back, {creator.displayName}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your creator overview
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <StatCard
            title="Active Campaigns"
            value={stats.activeCampaigns.toString()}
          />
          <StatCard
            title="Total Earnings"
            value={`$${stats.totalEarnings.toLocaleString()}`}
          />
          <StatCard
            title="Pending Payments"
            value={`$${stats.pendingPayments.toLocaleString()}`}
          />
          <StatCard
            title="New Invitations"
            value={stats.invitations.toString()}
            highlight={stats.invitations > 0}
          />
        </div>

        {/* Creator Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Performance Overview</h2>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Followers
                </p>
                <p className="text-2xl font-bold">
                  {creator.totalFollowers.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Avg Engagement
                </p>
                <p className="text-2xl font-bold">
                  {creator.avgEngagement.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Content Rate</p>
                <p className="text-2xl font-bold">
                  ${creator.contentRate ? Number(creator.contentRate) : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Niche Tags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {creator.nicheTags.map((nt: any) => (
                    <span
                      key={nt.nicheTag.id}
                      className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700"
                    >
                      {nt.nicheTag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="mt-4 space-y-3">
              <a
                href="/dashboard/creator/analytics"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
              >
                <span className="text-sm font-medium">
                  Sync Social Media Stats
                </span>
                <span className="text-xs text-muted-foreground">
                  Last synced:{" "}
                  {creator.lastSyncedAt
                    ? new Date(creator.lastSyncedAt).toLocaleDateString()
                    : "Never"}
                </span>
              </a>
              <a
                href="/dashboard/creator/portfolio"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
              >
                <span className="text-sm font-medium">Update Portfolio</span>
                <span className="text-xs text-muted-foreground">
                  Showcase your best work
                </span>
              </a>
              <a
                href="/dashboard/creator/profile"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
              >
                <span className="text-sm font-medium">
                  Complete Stripe Setup
                </span>
                <span
                  className={`text-xs ${creator.onboardingComplete ? "text-green-500" : "text-orange-500"}`}
                >
                  {creator.onboardingComplete ? "Complete ✓" : "Required for payouts"}
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Campaign List */}
        <div className="rounded-xl border bg-white">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Campaign Activity</h2>
          </div>
          <div className="divide-y">
            {campaigns.map((cc) => (
              <div
                key={cc.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  {cc.campaign.brand?.logo ? (
                    <img
                      src={cc.campaign.brand.logo}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-500">
                      {cc.campaign.brand?.companyName?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">{cc.campaign.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cc.campaign.brand?.companyName}
                      {cc.escrow && (
                        <> · ${Number(cc.escrow.creatorPayout).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <CreatorCampaignBadge status={cc.status} />
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No campaigns yet. You&apos;ll see invitations here once brands
                discover your profile!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-6 ${highlight ? "ring-2 ring-primary" : ""}`}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function CreatorCampaignBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    INVITED: { color: "bg-blue-100 text-blue-700", label: "New Invitation" },
    ACCEPTED: { color: "bg-green-100 text-green-700", label: "Accepted" },
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
    REJECTED: { color: "bg-red-100 text-red-700", label: "Rejected" },
  };

  const { color, label } = config[status] ?? {
    color: "bg-gray-100 text-gray-700",
    label: status,
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

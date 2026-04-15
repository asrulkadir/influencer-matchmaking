import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const [
    { data: users },
    { data: campaigns },
    { data: escrows },
    { data: recentDisputes },
  ] = await Promise.all([
    supabase.from("User").select("role"),
    supabase.from("Campaign").select("status"),
    supabase
      .from("EscrowPayment")
      .select("amount, platformFee, creatorPayout"),
    supabase
      .from("EscrowPayment")
      .select(
        "*, campaignCreator:CampaignCreator(*, creator:CreatorProfile(displayName), campaign:Campaign(title, brand:BrandProfile(companyName)))"
      )
      .eq("status", "DISPUTED")
      .order("updatedAt", { ascending: false })
      .limit(10),
  ]);

  // Group users by role
  const usersByRole: Record<string, number> = {};
  for (const u of users ?? []) {
    usersByRole[u.role] = (usersByRole[u.role] ?? 0) + 1;
  }

  // Group campaigns by status
  const campaignsByStatus: Record<string, number> = {};
  for (const c of campaigns ?? []) {
    campaignsByStatus[c.status] = (campaignsByStatus[c.status] ?? 0) + 1;
  }

  // Escrow aggregation
  const escrowItems = escrows ?? [];
  const escrowStats = {
    totalAmount: escrowItems.reduce((sum, e) => sum + Number(e.amount), 0),
    totalPlatformFee: escrowItems.reduce((sum, e) => sum + Number(e.platformFee), 0),
    totalCreatorPayout: escrowItems.reduce((sum, e) => sum + Number(e.creatorPayout), 0),
    count: escrowItems.length,
  };

  const disputes = recentDisputes ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-lg font-bold">CreatorMatch Admin</span>
          </div>
          <div className="flex gap-4 text-sm">
            <a href="/admin" className="font-medium text-primary">
              Dashboard
            </a>
            <a href="/admin/users" className="text-muted-foreground hover:text-foreground">
              Users
            </a>
            <a href="/admin/campaigns" className="text-muted-foreground hover:text-foreground">
              Campaigns
            </a>
            <a href="/admin/disputes" className="text-muted-foreground hover:text-foreground">
              Disputes
            </a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        {/* Platform Stats */}
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-6">
            <p className="text-sm text-muted-foreground">Total Brands</p>
            <p className="mt-2 text-3xl font-bold">
              {usersByRole["BRAND"] ?? 0}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6">
            <p className="text-sm text-muted-foreground">Total Creators</p>
            <p className="mt-2 text-3xl font-bold">
              {usersByRole["CREATOR"] ?? 0}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6">
            <p className="text-sm text-muted-foreground">Platform Revenue</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              $
              {escrowStats.totalPlatformFee.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6">
            <p className="text-sm text-muted-foreground">Total Escrow Volume</p>
            <p className="mt-2 text-3xl font-bold">
              ${escrowStats.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Campaign Status Breakdown */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Campaign Status</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(campaignsByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{status.replace("_", " ")}</span>
                  <span className="text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Disputes */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">
              Active Disputes ({disputes.length})
            </h2>
            <div className="mt-4 space-y-3">
              {disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="rounded-lg border border-orange-200 bg-orange-50 p-3"
                >
                  <p className="text-sm font-medium">
                    {dispute.campaignCreator.creator.displayName} ↔{" "}
                    {dispute.campaignCreator.campaign.brand.companyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${Number(dispute.amount).toLocaleString()} ·{" "}
                    {dispute.campaignCreator.campaign.title}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="rounded bg-green-500 px-3 py-1 text-xs font-medium text-white">
                      Release to Creator
                    </button>
                    <button type="button" className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white">
                      Refund to Brand
                    </button>
                  </div>
                </div>
              ))}
              {disputes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active disputes
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

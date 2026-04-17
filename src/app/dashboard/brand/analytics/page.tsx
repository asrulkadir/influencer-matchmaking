import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { BrandAnalyticsClient } from "./analytics-client";

export default async function BrandAnalyticsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: brand } = await supabase
    .from("BrandProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!brand) redirect("/onboarding");

  // Fetch analytics for all creators in brand's campaigns
  const { data: campaignCreators } = await supabase
    .from("CampaignCreator")
    .select("creatorId, campaign:Campaign!inner(brandId)")
    .eq("campaign.brandId", brand.id);

  const creatorIds = [
    ...new Set((campaignCreators ?? []).map((cc) => cc.creatorId)),
  ];

  let reports: any[] = [];
  let aggregated = {
    totalImpressions: 0,
    totalReach: 0,
    avgEngagement: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
  };

  if (creatorIds.length > 0) {
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 6);

    const { data } = await supabase
      .from("AnalyticsReport")
      .select("*")
      .in("creatorId", creatorIds)
      .gte("periodStart", periodStart.toISOString())
      .order("periodStart", { ascending: false });

    reports = data ?? [];
    if (reports.length > 0) {
      aggregated = {
        totalImpressions: reports.reduce((s, r) => s + r.impressions, 0),
        totalReach: reports.reduce((s, r) => s + r.reach, 0),
        avgEngagement:
          reports.reduce((s, r) => s + r.engagement, 0) / reports.length,
        totalLikes: reports.reduce((s, r) => s + r.likes, 0),
        totalComments: reports.reduce((s, r) => s + r.comments, 0),
        totalShares: reports.reduce((s, r) => s + r.shares, 0),
        totalSaves: reports.reduce((s, r) => s + r.saves, 0),
      };
    }
  }

  return (
    <BrandAnalyticsClient data={{ reports, aggregated }} />
  );
}

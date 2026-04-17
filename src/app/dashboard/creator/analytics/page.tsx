import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreatorAnalyticsClient } from "./analytics-client";

export default async function CreatorAnalyticsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!creator) redirect("/onboarding");

  const periodStart = new Date();
  periodStart.setMonth(periodStart.getMonth() - 6);

  const { data: reports } = await supabase
    .from("AnalyticsReport")
    .select("*")
    .eq("creatorId", creator.id)
    .gte("periodStart", periodStart.toISOString())
    .order("periodStart", { ascending: false });

  const items = reports ?? [];
  const aggregated = {
    totalImpressions: items.reduce((s, r) => s + r.impressions, 0),
    totalReach: items.reduce((s, r) => s + r.reach, 0),
    avgEngagement:
      items.length > 0
        ? items.reduce((s, r) => s + r.engagement, 0) / items.length
        : 0,
    totalLikes: items.reduce((s, r) => s + r.likes, 0),
    totalComments: items.reduce((s, r) => s + r.comments, 0),
    totalShares: items.reduce((s, r) => s + r.shares, 0),
    totalSaves: items.reduce((s, r) => s + r.saves, 0),
  };

  return <CreatorAnalyticsClient data={{ reports: items, aggregated }} />;
}

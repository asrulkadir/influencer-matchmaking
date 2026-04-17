import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { CampaignDetailClient } from "./campaign-detail-client";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: brand } = await supabase
    .from("BrandProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!brand) redirect("/onboarding");

  const { data: campaign } = await supabase
    .from("Campaign")
    .select(
      "*, nicheTags:CampaignNicheTag(nicheTag:NicheTag(name)), campaignCreators:CampaignCreator(*, creator:CreatorProfile(displayName, avatarUrl, totalFollowers, avgEngagement), escrow:EscrowPayment(status, amount, creatorPayout))"
    )
    .eq("id", id)
    .eq("brandId", brand.id)
    .single();

  if (!campaign) notFound();

  return <CampaignDetailClient campaign={campaign} />;
}

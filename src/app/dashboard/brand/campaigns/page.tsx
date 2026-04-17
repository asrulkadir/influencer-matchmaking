import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { CampaignsListClient } from "./campaigns-client";

export default async function BrandCampaignsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: brand } = await supabase
    .from("BrandProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!brand) redirect("/onboarding");

  const { data: campaigns } = await supabase
    .from("Campaign")
    .select(
      "*, nicheTags:CampaignNicheTag(nicheTag:NicheTag(name)), campaignCreators:CampaignCreator(id, status)"
    )
    .eq("brandId", brand.id)
    .order("createdAt", { ascending: false });

  return <CampaignsListClient campaigns={campaigns ?? []} />;
}

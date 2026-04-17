import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreatorPortfolioClient } from "./portfolio-client";

export default async function CreatorPortfolioPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!creator) redirect("/onboarding");

  // Fetch portfolio items
  const { data: portfolioItems } = await supabase
    .from("PortfolioItem")
    .select("*")
    .eq("creatorId", creator.id)
    .order("createdAt", { ascending: false });

  // Fetch completed campaigns as additional portfolio items
  const { data: completedCampaigns } = await supabase
    .from("CampaignCreator")
    .select(
      "id, contentUrl, submittedAt, campaign:Campaign(title, brand:BrandProfile(companyName))"
    )
    .eq("creatorId", creator.id)
    .in("status", ["APPROVED", "PAID"])
    .order("submittedAt", { ascending: false });

  return (
    <CreatorPortfolioClient
      portfolioItems={portfolioItems ?? []}
      completedWork={completedCampaigns ?? []}
      creatorId={creator.id}
    />
  );
}

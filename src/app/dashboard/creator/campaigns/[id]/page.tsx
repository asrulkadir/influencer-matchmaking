import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { CampaignWorkspaceClient } from "./workspace-client";

export default async function CreatorCampaignWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!creator) redirect("/onboarding");

  const { data: cc } = await supabase
    .from("CampaignCreator")
    .select(
      "*, campaign:Campaign(*, brand:BrandProfile(companyName, logo, website)), escrow:EscrowPayment(status, amount, creatorPayout, currency)"
    )
    .eq("campaignId", id)
    .eq("creatorId", creator.id)
    .single();

  if (!cc) notFound();

  return <CampaignWorkspaceClient campaignCreator={cc} />;
}

import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreatorCampaignsClient } from "./campaigns-client";

export default async function CreatorCampaignsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!creator) redirect("/onboarding");

  const { data: campaignCreators } = await supabase
    .from("CampaignCreator")
    .select(
      "*, campaign:Campaign(*, brand:BrandProfile(companyName, logo)), escrow:EscrowPayment(status, amount, creatorPayout)"
    )
    .eq("creatorId", creator.id)
    .in("status", [
      "ACCEPTED",
      "CONTENT_SUBMITTED",
      "REVISION_REQUESTED",
      "APPROVED",
      "PAID",
    ])
    .order("createdAt", { ascending: false });

  return <CreatorCampaignsClient campaigns={campaignCreators ?? []} />;
}

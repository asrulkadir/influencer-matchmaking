import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreatorInvitationsClient } from "./invitations-client";

export default async function CreatorInvitationsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!creator) redirect("/onboarding");

  const { data: invitations } = await supabase
    .from("CampaignCreator")
    .select(
      "*, campaign:Campaign(*, brand:BrandProfile(companyName, logo, website))"
    )
    .eq("creatorId", creator.id)
    .eq("status", "INVITED")
    .order("createdAt", { ascending: false });

  return <CreatorInvitationsClient invitations={invitations ?? []} />;
}

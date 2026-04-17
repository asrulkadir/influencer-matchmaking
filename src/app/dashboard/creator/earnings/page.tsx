import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreatorEarningsClient } from "./earnings-client";

export default async function CreatorEarningsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select("id, stripeAccountId, onboardingComplete")
    .eq("userId", session.user.id)
    .single();

  if (!creator) redirect("/onboarding");

  const { data: escrows } = await supabase
    .from("EscrowPayment")
    .select(
      "*, campaignCreator:CampaignCreator!inner(creatorId, campaign:Campaign(title, brand:BrandProfile(companyName)))"
    )
    .eq("campaignCreator.creatorId", creator.id)
    .order("createdAt", { ascending: false });

  const payments = escrows ?? [];
  const totalEarnings = payments
    .filter((p) => p.status === "RELEASED")
    .reduce((sum, p) => sum + Number(p.creatorPayout), 0);
  const pendingPayments = payments
    .filter((p) => p.status === "FUNDED")
    .reduce((sum, p) => sum + Number(p.creatorPayout), 0);

  return (
    <CreatorEarningsClient
      payments={payments}
      totalEarnings={totalEarnings}
      pendingPayments={pendingPayments}
      stripeConnected={!!creator.stripeAccountId && creator.onboardingComplete}
    />
  );
}

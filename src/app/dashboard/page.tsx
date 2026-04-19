import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { BrandDashboard } from "@/components/dashboard/brand-dashboard";
import { CreatorDashboard } from "@/components/dashboard/creator-dashboard";
import { RoleSwitcher } from "@/components/dashboard/role-switcher";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const requestedRole =
    typeof params.role === "string" ? params.role : undefined;

  // If the caller asked for a different role, hand off to the client-side
  // RoleSwitcher which will update the DB + refresh the JWT, then redirect
  // back here without the query-param.
  if (
    requestedRole &&
    requestedRole.toUpperCase() !== session.user.role
  ) {
    return <RoleSwitcher role={requestedRole} />;
  }

  if (session.user.role === "BRAND") {
    const { data: brand } = await supabase
      .from("BrandProfile")
      .select("*")
      .eq("userId", session.user.id)
      .single();

    if (!brand) redirect("/onboarding?role=brand");

    const { data: campaigns } = await supabase
      .from("Campaign")
      .select("*, campaignCreators:CampaignCreator(*, creator:CreatorProfile(displayName, avatarUrl, avgEngagement), escrow:EscrowPayment(status, amount))")
      .eq("brandId", brand.id)
      .order("createdAt", { ascending: false })
      .limit(5);

    const { count: activeCampaigns } = await supabase
      .from("Campaign")
      .select("id", { count: "exact", head: true })
      .eq("brandId", brand.id)
      .in("status", ["ACTIVE", "IN_PROGRESS", "MATCHING"]);

    const { count: totalCreators } = await supabase
      .from("CampaignCreator")
      .select("id, campaign:Campaign!inner(brandId)", { count: "exact", head: true })
      .eq("campaign.brandId", brand.id)
      .in("status", ["ACCEPTED", "CONTENT_SUBMITTED", "APPROVED", "PAID"]);

    const { data: spentData } = await supabase
      .from("EscrowPayment")
      .select("amount, campaignCreator:CampaignCreator!inner(campaign:Campaign!inner(brandId))")
      .eq("campaignCreator.campaign.brandId", brand.id)
      .eq("status", "RELEASED");

    const totalSpent = (spentData ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

    const { count: pendingApprovals } = await supabase
      .from("CampaignCreator")
      .select("id, campaign:Campaign!inner(brandId)", { count: "exact", head: true })
      .eq("campaign.brandId", brand.id)
      .eq("status", "CONTENT_SUBMITTED");

    return (
      <BrandDashboard
        brand={brand}
        campaigns={campaigns ?? []}
        stats={{
          activeCampaigns: activeCampaigns ?? 0,
          totalCreators: totalCreators ?? 0,
          totalSpent,
          pendingApprovals: pendingApprovals ?? 0,
        }}
      />
    );
  }

  if (session.user.role === "CREATOR") {
    const { data: creator } = await supabase
      .from("CreatorProfile")
      .select("*, nicheTags:CreatorNicheTag(*, nicheTag:NicheTag(*)), campaignCreators:CampaignCreator(*, campaign:Campaign(*, brand:BrandProfile(companyName, logo)), escrow:EscrowPayment(status, amount, creatorPayout))")
      .eq("userId", session.user.id)
      .single();

    if (!creator) redirect("/onboarding?role=creator");

    const activeCampaigns = (creator.campaignCreators ?? []).filter(
      (cc: { status: string }) =>
        ["ACCEPTED", "CONTENT_SUBMITTED"].includes(cc.status)
    ).length;

    const { data: earningsData } = await supabase
      .from("EscrowPayment")
      .select("creatorPayout, campaignCreator:CampaignCreator!inner(creatorId)")
      .eq("campaignCreator.creatorId", creator.id)
      .eq("status", "RELEASED");

    const totalEarnings = (earningsData ?? []).reduce(
      (sum, e) => sum + Number(e.creatorPayout), 0
    );

    const { data: pendingData } = await supabase
      .from("EscrowPayment")
      .select("creatorPayout, campaignCreator:CampaignCreator!inner(creatorId)")
      .eq("campaignCreator.creatorId", creator.id)
      .eq("status", "FUNDED");

    const pendingPayments = (pendingData ?? []).reduce(
      (sum, e) => sum + Number(e.creatorPayout), 0
    );

    const invitations = (creator.campaignCreators ?? []).filter(
      (cc: { status: string }) => cc.status === "INVITED"
    ).length;

    return (
      <CreatorDashboard
        creator={creator}
        campaigns={creator.campaignCreators ?? []}
        stats={{
          activeCampaigns,
          totalEarnings,
          pendingPayments,
          invitations,
        }}
      />
    );
  }

  // Admin
  redirect("/admin");
}

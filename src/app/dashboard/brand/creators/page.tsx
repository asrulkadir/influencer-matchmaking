import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreatorDiscoveryClient } from "./creators-client";

export default async function CreatorDiscoveryPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: brand } = await supabase
    .from("BrandProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!brand) redirect("/onboarding");

  const { data: creators } = await supabase
    .from("CreatorProfile")
    .select(
      "id, displayName, avatarUrl, totalFollowers, avgEngagement, contentRate, isAvailable, tiktokHandle, instagramHandle, nicheTags:CreatorNicheTag(nicheTag:NicheTag(name))"
    )
    .eq("isAvailable", true)
    .order("avgEngagement", { ascending: false })
    .limit(50);

  const { data: nicheTags } = await supabase
    .from("NicheTag")
    .select("id, name")
    .order("name");

  return (
    <CreatorDiscoveryClient
      creators={creators ?? []}
      nicheTags={nicheTags ?? []}
    />
  );
}

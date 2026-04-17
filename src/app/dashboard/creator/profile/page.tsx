import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreatorProfileClient } from "./profile-client";

export default async function CreatorProfilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select(
      "*, nicheTags:CreatorNicheTag(*, nicheTag:NicheTag(*))"
    )
    .eq("userId", session.user.id)
    .single();

  if (!creator) redirect("/onboarding");

  const { data: allNicheTags } = await supabase
    .from("NicheTag")
    .select("id, name")
    .order("name");

  return (
    <CreatorProfileClient
      creator={creator}
      allNicheTags={allNicheTags ?? []}
    />
  );
}

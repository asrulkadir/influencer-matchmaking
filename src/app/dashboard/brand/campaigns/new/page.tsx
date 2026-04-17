import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { NewCampaignClient } from "./new-campaign-client";

export default async function NewCampaignPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const { data: brand } = await supabase
    .from("BrandProfile")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!brand) redirect("/onboarding");

  const { data: nicheTags } = await supabase
    .from("NicheTag")
    .select("id, name")
    .order("name");

  return <NewCampaignClient nicheTags={nicheTags ?? []} />;
}

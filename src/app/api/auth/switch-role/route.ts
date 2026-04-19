import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";

/**
 * POST /api/auth/switch-role
 * Switch the user's active role. Returns { needsOnboarding: true } when the
 * user has no profile for the requested role yet.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await request.json();
    if (role !== "BRAND" && role !== "CREATOR") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if the user already has a profile for the target role
    const profileTable = role === "BRAND" ? "BrandProfile" : "CreatorProfile";
    const { data: profile } = await supabase
      .from(profileTable)
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ needsOnboarding: true });
    }

    // Update the user's active role
    const { error } = await supabase
      .from("User")
      .update({ role })
      .eq("id", session.user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to switch role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { z } from "zod";
import type { UserRole } from "@/lib/database.types";

const brandSchema = z.object({
  role: z.literal("BRAND"),
  companyName: z.string().min(1).max(200),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
});

const creatorSchema = z.object({
  role: z.literal("CREATOR"),
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  tiktokHandle: z.string().max(100).optional(),
  instagramHandle: z.string().max(100).optional(),
});

const onboardingSchema = z.discriminatedUnion("role", [brandSchema, creatorSchema]);

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional().nullable(),
  contentRate: z.number().positive().optional().nullable(),
  tiktokHandle: z.string().max(100).optional().nullable(),
  instagramHandle: z.string().max(100).optional().nullable(),
  tiktokFollowers: z.number().int().min(0).optional(),
  tiktokEngagement: z.number().min(0).optional(),
  instagramFollowers: z.number().int().min(0).optional(),
  instagramEngagement: z.number().min(0).optional(),
});

/**
 * POST /api/onboarding — Complete user onboarding by creating a profile.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = onboardingSchema.parse(body);

    const userRole: UserRole = validated.role;

    // Update the user's role
    const { error: roleError } = await supabase
      .from("User")
      .update({ role: userRole })
      .eq("id", session.user.id);

    if (roleError) throw roleError;

    if (validated.role === "BRAND") {
      // Check if profile already exists
      const { data: existing } = await supabase
        .from("BrandProfile")
        .select("id")
        .eq("userId", session.user.id)
        .single();

      if (existing) {
        return NextResponse.json({ error: "Brand profile already exists" }, { status: 409 });
      }

      const { error } = await supabase.from("BrandProfile").insert({
        userId: session.user.id,
        companyName: validated.companyName,
        website: validated.website || null,
        industry: validated.industry || null,
        subscriptionTier: "FREE",
        campaignsUsed: 0,
        outreachUsed: 0,
      });

      if (error) throw error;
    } else {
      // Creator profile
      const { data: existing } = await supabase
        .from("CreatorProfile")
        .select("id")
        .eq("userId", session.user.id)
        .single();

      if (existing) {
        return NextResponse.json({ error: "Creator profile already exists" }, { status: 409 });
      }

      const { error } = await supabase.from("CreatorProfile").insert({
        userId: session.user.id,
        displayName: validated.displayName,
        bio: validated.bio || null,
        tiktokHandle: validated.tiktokHandle || null,
        instagramHandle: validated.instagramHandle || null,
        tiktokFollowers: 0,
        tiktokEngagement: 0,
        instagramFollowers: 0,
        instagramEngagement: 0,
        totalFollowers: 0,
        avgEngagement: 0,
        isAvailable: true,
        onboardingComplete: false,
      });

      if (error) throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/onboarding — Update an existing creator profile.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = profileUpdateSchema.parse(body);

    const { data: creator } = await supabase
      .from("CreatorProfile")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    const tiktokFollowers = validated.tiktokFollowers ?? 0;
    const instagramFollowers = validated.instagramFollowers ?? 0;
    const tiktokEngagement = validated.tiktokEngagement ?? 0;
    const instagramEngagement = validated.instagramEngagement ?? 0;
    const totalFollowers = tiktokFollowers + instagramFollowers;
    const avgEngagement =
      tiktokFollowers + instagramFollowers > 0
        ? (tiktokEngagement * tiktokFollowers +
            instagramEngagement * instagramFollowers) /
          (tiktokFollowers + instagramFollowers)
        : 0;

    const { error } = await supabase
      .from("CreatorProfile")
      .update({
        displayName: validated.displayName,
        bio: validated.bio ?? null,
        contentRate: validated.contentRate ?? null,
        tiktokHandle: validated.tiktokHandle ?? null,
        instagramHandle: validated.instagramHandle ?? null,
        tiktokFollowers,
        tiktokEngagement,
        instagramFollowers,
        instagramEngagement,
        totalFollowers,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
      })
      .eq("id", creator.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

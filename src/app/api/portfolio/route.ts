import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { z } from "zod";

const addItemSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
  platform: z.enum(["tiktok", "instagram", "youtube", "other"]),
});

const updateItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  url: z.url().optional(),
  platform: z.enum(["tiktok", "instagram", "youtube", "other"]).optional(),
});

/** Helper: get creator profile for the current user */
async function getCreatorForUser(userId: string) {
  const { data } = await supabase
    .from("CreatorProfile")
    .select("id")
    .eq("userId", userId)
    .single();
  return data;
}

/**
 * POST /api/portfolio — Add a portfolio item for the authenticated creator.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = addItemSchema.parse(body);

    const creator = await getCreatorForUser(session.user.id);
    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    const { data: item, error } = await supabase
      .from("PortfolioItem")
      .insert({
        creatorId: creator.id,
        title: validated.title,
        url: validated.url,
        platform: validated.platform,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ portfolioItem: item }, { status: 201 });
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
 * PATCH /api/portfolio — Update a portfolio item (owner only).
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = updateItemSchema.parse(body);

    const creator = await getCreatorForUser(session.user.id);
    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    // Ensure the item belongs to this creator
    const { data: existing } = await supabase
      .from("PortfolioItem")
      .select("id")
      .eq("id", id)
      .eq("creatorId", creator.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Portfolio item not found" },
        { status: 404 }
      );
    }

    const { data: item, error } = await supabase
      .from("PortfolioItem")
      .update(fields)
      .eq("id", id)
      .eq("creatorId", creator.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ portfolioItem: item });
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
 * DELETE /api/portfolio — Remove a portfolio item (owner only).
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "Portfolio item id is required" },
        { status: 400 }
      );
    }

    const creator = await getCreatorForUser(session.user.id);
    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    // Verify ownership before deleting
    const { data: existing } = await supabase
      .from("PortfolioItem")
      .select("id")
      .eq("id", id)
      .eq("creatorId", creator.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Portfolio item not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("PortfolioItem")
      .delete()
      .eq("id", id)
      .eq("creatorId", creator.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

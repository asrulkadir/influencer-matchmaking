import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const lookupSchema = z.object({
  platform: z.enum(["tiktok", "instagram"]),
  username: z.string().min(1).max(100),
});

/**
 * POST /api/creators/social-lookup — Look up a social media username and return follower/engagement stats.
 *
 * For TikTok: uses the public profile scraping endpoint (no OAuth needed).
 * For Instagram: uses the public web profile data.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { platform, username } = lookupSchema.parse(body);

    // Sanitize username (remove @ prefix if present)
    const cleanUsername = username.replace(/^@/, "").trim();

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (platform === "tiktok") {
      const stats = await lookupTikTok(cleanUsername);
      return NextResponse.json(stats);
    }

    const stats = await lookupInstagram(cleanUsername);
    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Look up a TikTok user's public profile stats.
 * Uses TikTok's Research API if configured, otherwise falls back to the
 * public web profile endpoint.
 */
async function lookupTikTok(
  username: string
): Promise<{ followers: number; engagement: number; found: boolean }> {
  try {
    // Try TikTok Research API (requires approved app)
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (
      clientKey &&
      clientSecret &&
      clientKey !== "your_tiktok_client_key"
    ) {
      // Get client access token (no user OAuth needed for Research API)
      const tokenRes = await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: "client_credentials",
          }),
        }
      );

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (accessToken) {
          const userRes = await fetch(
            "https://open.tiktokapis.com/v2/research/user/info/",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                username,
                fields: [
                  "follower_count",
                  "likes_count",
                  "video_count",
                ],
              }),
            }
          );

          if (userRes.ok) {
            const userData = await userRes.json();
            const user = userData?.data;
            if (user) {
              const followers = user.follower_count ?? 0;
              const likes = user.likes_count ?? 0;
              const videos = user.video_count ?? 0;
              const engagement =
                videos > 0
                  ? Math.round((likes / videos / Math.max(followers, 1)) * 10000) / 100
                  : 0;

              return { followers, engagement, found: true };
            }
          }
        }
      }
    }

    // Fallback: fetch public TikTok profile page and parse meta tags
    const profileRes = await fetch(
      `https://www.tiktok.com/@${encodeURIComponent(username)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CreatorMatch/1.0)",
        },
        redirect: "follow",
      }
    );

    if (!profileRes.ok) {
      return { followers: 0, engagement: 0, found: false };
    }

    const html = await profileRes.text();

    // Try to extract follower count from meta tags or JSON-LD
    const followerMatch = /"followerCount"\s*:\s*(\d+)/.exec(html);
    const heartMatch = /"heartCount"\s*:\s*(\d+)/.exec(html);
    const videoMatch = /"videoCount"\s*:\s*(\d+)/.exec(html);

    if (followerMatch) {
      const followers = Number.parseInt(followerMatch[1], 10);
      const hearts = heartMatch ? Number.parseInt(heartMatch[1], 10) : 0;
      const videos = videoMatch ? Number.parseInt(videoMatch[1], 10) : 0;
      const engagement =
        videos > 0
          ? Math.round((hearts / videos / Math.max(followers, 1)) * 10000) / 100
          : 0;

      return { followers, engagement, found: true };
    }

    return { followers: 0, engagement: 0, found: false };
  } catch {
    return { followers: 0, engagement: 0, found: false };
  }
}

/**
 * Look up an Instagram user's public profile stats.
 * Tries multiple approaches:
 * 1. Instagram mobile API (most reliable)
 * 2. Instagram public HTML page (fallback)
 */
async function lookupInstagram(
  username: string
): Promise<{ followers: number; engagement: number; found: boolean }> {
  // Approach 1: mobile API (most reliable from server-side)
  const apiResult = await lookupInstagramViaApi(username);
  if (apiResult.found) return apiResult;

  // Approach 2: Parse public profile HTML page (fallback)
  const htmlResult = await lookupInstagramViaHtml(username);
  if (htmlResult.found) return htmlResult;

  return { followers: 0, engagement: 0, found: false };
}

async function lookupInstagramViaHtml(
  username: string
): Promise<{ followers: number; engagement: number; found: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `https://www.instagram.com/${encodeURIComponent(username)}/`,
      {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Dest": "document",
        },
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      return { followers: 0, engagement: 0, found: false };
    }

    const html = await res.text();

    // Check if the page is a valid profile (not a login redirect)
    if (html.includes("Login") && !html.includes("follower")) {
      return { followers: 0, engagement: 0, found: false };
    }

    // Try to extract from meta tags (og:description often has "X Followers")
    const metaMatch = /content="([\d,.]+[KMB]?)\s+Followers/i.exec(html);
    if (metaMatch) {
      const followers = parseFollowerString(metaMatch[1]);
      if (followers > 0) {
        return { followers, engagement: 0, found: true };
      }
    }

    // Try shared_data JSON blob
    const sharedDataMatch = /window\._sharedData\s*=\s*({[\s\S]+?});<\/script>/.exec(html);
    if (sharedDataMatch) {
      try {
        const shared = JSON.parse(sharedDataMatch[1]);
        const user =
          shared?.entry_data?.ProfilePage?.[0]?.graphql?.user;
        if (user) {
          const followers = user.edge_followed_by?.count ?? 0;
          let engagement = 0;
          const edges = user.edge_owner_to_timeline_media?.edges ?? [];
          if (edges.length > 0 && followers > 0) {
            const total = edges.reduce(
              (sum: number, e: { node: { edge_liked_by?: { count: number }; edge_media_to_comment?: { count: number } } }) =>
                sum +
                (e.node.edge_liked_by?.count ?? 0) +
                (e.node.edge_media_to_comment?.count ?? 0),
              0
            );
            engagement =
              Math.round((total / edges.length / followers) * 10000) / 100;
          }
          return { followers, engagement, found: true };
        }
      } catch {
        // JSON parse failed, continue
      }
    }

    // Try extracting from JSON-LD or any embedded JSON with follower counts
    const jsonLdMatch = /"interactionStatistic"[\s\S]*?"userInteractionCount"\s*:\s*"?(\d+)"?/.exec(html);
    if (jsonLdMatch) {
      const followers = Number.parseInt(jsonLdMatch[1], 10);
      if (followers > 0) {
        return { followers, engagement: 0, found: true };
      }
    }

    return { followers: 0, engagement: 0, found: false };
  } catch {
    return { followers: 0, engagement: 0, found: false };
  }
}

async function lookupInstagramViaApi(
  username: string
): Promise<{ followers: number; engagement: number; found: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const profileRes = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "x-ig-app-id": "936619743392459",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
        },
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
      }
    );

    clearTimeout(timeout);

    console.log("profileRes", profileRes);

    if (!profileRes.ok) {
      return { followers: 0, engagement: 0, found: false };
    }

    const data = await profileRes.json();
    const user = data?.data?.user;

    if (!user) {
      return { followers: 0, engagement: 0, found: false };
    }

    const followers =
      user.edge_followed_by?.count ?? user.follower_count ?? 0;

    let engagement = 0;
    const recentMedia =
      user.edge_owner_to_timeline_media?.edges ?? [];
    if (recentMedia.length > 0 && followers > 0) {
      const totalInteractions = recentMedia.reduce(
        (sum: number, edge: { node: { edge_liked_by?: { count: number }; edge_media_to_comment?: { count: number } } }) => {
          const likes = edge.node.edge_liked_by?.count ?? 0;
          const comments = edge.node.edge_media_to_comment?.count ?? 0;
          return sum + likes + comments;
        },
        0
      );
      engagement =
        Math.round(
          (totalInteractions / recentMedia.length / followers) * 10000
        ) / 100;
    }

    return { followers, engagement, found: true };
  } catch {
    return { followers: 0, engagement: 0, found: false };
  }
}

/**
 * Parse follower count strings like "1,234", "12.5K", "1.2M", "3B"
 */
function parseFollowerString(str: string): number {
  const clean = str.replaceAll(",", "");
  const match = /^([\d.]+)\s*([KMB])?$/i.exec(clean);
  if (!match) return 0;
  const num = Number.parseFloat(match[1]);
  const suffix = (match[2] ?? "").toUpperCase();
  if (suffix === "K") return Math.round(num * 1_000);
  if (suffix === "M") return Math.round(num * 1_000_000);
  if (suffix === "B") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

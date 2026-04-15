import { supabase } from "./db";

/**
 * Creator Matching Algorithm
 *
 * Scores creators against a campaign's requirements using weighted criteria:
 *  - Niche relevance (40%): Overlap between creator's niche tags and campaign's target niches
 *  - Engagement rate (30%): Higher engagement = better match, normalized against target
 *  - Follower fit (15%): Penalizes too-small and slightly rewards micro-influencer sweet spots
 *  - Availability (10%): Whether creator is currently available
 *  - Platform match (5%): Creator is active on the campaign's target platforms
 *
 * Returns sorted list of creators with match scores (0-100).
 */

interface MatchCriteria {
  campaignId: string;
  nicheTags: string[];        // niche tag IDs
  targetPlatforms: string[];  // ["tiktok", "instagram"]
  targetFollowers: number;    // minimum follower count
  targetEngagement: number;   // minimum engagement rate (e.g., 3.5 = 3.5%)
  maxCreators: number;
  budgetPerCreator?: number;
}

interface MatchResult {
  creatorId: string;
  displayName: string;
  avatarUrl: string | null;
  totalFollowers: number;
  avgEngagement: number;
  contentRate: number | null;
  matchScore: number;
  breakdown: {
    nicheScore: number;
    engagementScore: number;
    followerScore: number;
    availabilityScore: number;
    platformScore: number;
  };
  nicheTags: string[];
  platforms: string[];
}

const WEIGHTS = {
  niche: 0.4,
  engagement: 0.3,
  followers: 0.15,
  availability: 0.1,
  platform: 0.05,
};

export async function matchCreators(
  criteria: MatchCriteria
): Promise<MatchResult[]> {
  // Fetch eligible creators (available, with minimum followers threshold)
  const { data: creators } = await supabase
    .from("CreatorProfile")
    .select("*")
    .eq("isAvailable", true)
    .gte("totalFollowers", Math.floor(criteria.targetFollowers * 0.5));

  if (!creators?.length) return [];

  // Get existing campaign creators to exclude
  const { data: existingCC } = await supabase
    .from("CampaignCreator")
    .select("creatorId")
    .eq("campaignId", criteria.campaignId);

  const excludedCreatorIds = new Set((existingCC ?? []).map((cc) => cc.creatorId));

  // Filter out already-assigned creators
  const eligibleCreators = creators.filter((c) => !excludedCreatorIds.has(c.id));

  // Fetch niche tags for eligible creators
  const creatorIds = eligibleCreators.map((c) => c.id);
  const { data: creatorNicheTags } = await supabase
    .from("CreatorNicheTag")
    .select("creatorId, nicheTagId, nicheTag:NicheTag(name)")
    .in("creatorId", creatorIds);

  // Group niche tags by creator
  const nicheTagsByCreator = new Map<string, Array<{ nicheTagId: string; name: string }>>();
  for (const cnt of creatorNicheTags ?? []) {
    const existing = nicheTagsByCreator.get(cnt.creatorId) ?? [];
    existing.push({ nicheTagId: cnt.nicheTagId, name: (cnt.nicheTag as any)?.name ?? "" });
    nicheTagsByCreator.set(cnt.creatorId, existing);
  }

  const scored = eligibleCreators.map((creator) => {
    const creatorNiches = nicheTagsByCreator.get(creator.id) ?? [];
    const nicheScore = computeNicheScore(
      creatorNiches.map((n) => ({ nicheTagId: n.nicheTagId })),
      criteria.nicheTags
    );
    const engagementScore = computeEngagementScore(
      creator.avgEngagement,
      criteria.targetEngagement
    );
    const followerScore = computeFollowerScore(
      creator.totalFollowers,
      criteria.targetFollowers
    );
    const availabilityScore = creator.isAvailable ? 100 : 0;
    const platformScore = computePlatformScore(creator, criteria.targetPlatforms);

    const totalScore =
      nicheScore * WEIGHTS.niche +
      engagementScore * WEIGHTS.engagement +
      followerScore * WEIGHTS.followers +
      availabilityScore * WEIGHTS.availability +
      platformScore * WEIGHTS.platform;

    return {
      creatorId: creator.id,
      displayName: creator.displayName,
      avatarUrl: creator.avatarUrl,
      totalFollowers: creator.totalFollowers,
      avgEngagement: creator.avgEngagement,
      contentRate: creator.contentRate ? Number(creator.contentRate) : null,
      matchScore: Math.round(totalScore * 100) / 100,
      breakdown: {
        nicheScore: Math.round(nicheScore * 100) / 100,
        engagementScore: Math.round(engagementScore * 100) / 100,
        followerScore: Math.round(followerScore * 100) / 100,
        availabilityScore,
        platformScore: Math.round(platformScore * 100) / 100,
      },
      nicheTags: creatorNiches.map((n) => n.name),
      platforms: getPlatforms(creator),
    };
  });

  // Sort by match score descending
  scored.sort((a: MatchResult, b: MatchResult) => b.matchScore - a.matchScore);

  // If budget constraint exists, filter creators above budget
  let results = scored;
  if (criteria.budgetPerCreator) {
    const budget = criteria.budgetPerCreator;
    results = scored.filter(
      (c: MatchResult) => !c.contentRate || c.contentRate <= budget
    );
  }

  return results.slice(0, criteria.maxCreators * 2); // Return 2x for buffer
}

/**
 * Niche Score: Jaccard similarity between creator's niches and campaign's target niches.
 * 100 if perfect overlap, 0 if no overlap.
 */
function computeNicheScore(
  creatorNiches: Array<{ nicheTagId: string }>,
  targetNicheIds: string[]
): number {
  if (targetNicheIds.length === 0) return 50; // No niche preference = neutral score

  const creatorNicheSet = new Set(creatorNiches.map((cn) => cn.nicheTagId));
  const targetSet = new Set(targetNicheIds);

  const intersection = [...creatorNicheSet].filter((id) => targetSet.has(id));
  const union = new Set([...creatorNicheSet, ...targetSet]);

  return union.size === 0 ? 0 : (intersection.length / union.size) * 100;
}

/**
 * Engagement Score: Sigmoid-based scoring centered around the target engagement rate.
 * Exceeding the target gives bonus points, below target is penalized.
 */
function computeEngagementScore(
  creatorEngagement: number,
  targetEngagement: number
): number {
  if (targetEngagement <= 0) return 50;

  const ratio = creatorEngagement / targetEngagement;

  // Sigmoid normalization: 1x target = 70, 2x target = 95, 0.5x = 30
  const score = 100 / (1 + Math.exp(-4 * (ratio - 1)));
  return Math.min(100, Math.max(0, score));
}

/**
 * Follower Score: bell-curve scoring.
 * Micro-influencers (10k-100k) get slight boost for this platform type.
 * Too far below minimum is heavily penalized.
 */
function computeFollowerScore(
  creatorFollowers: number,
  targetMinFollowers: number
): number {
  if (targetMinFollowers <= 0) return 50;

  const ratio = creatorFollowers / targetMinFollowers;

  if (ratio < 0.5) return 10; // Way too small
  if (ratio < 1) return 30 + (ratio - 0.5) * 80; // Below target, scaled up
  if (ratio <= 5) return 70 + Math.min(30, (ratio - 1) * 7.5); // Sweet spot
  return 80; // Very large creators — still good but not micro-optimized
}

/**
 * Platform Score: 100 if creator is on all target platforms, partial if some.
 */
function computePlatformScore(
  creator: { tiktokHandle: string | null; instagramHandle: string | null },
  targetPlatforms: string[]
): number {
  if (targetPlatforms.length === 0) return 50;

  let matched = 0;
  for (const platform of targetPlatforms) {
    if (platform === "tiktok" && creator.tiktokHandle) matched++;
    if (platform === "instagram" && creator.instagramHandle) matched++;
  }

  return (matched / targetPlatforms.length) * 100;
}

function getPlatforms(creator: {
  tiktokHandle: string | null;
  instagramHandle: string | null;
}): string[] {
  const platforms: string[] = [];
  if (creator.tiktokHandle) platforms.push("tiktok");
  if (creator.instagramHandle) platforms.push("instagram");
  return platforms;
}

/**
 * Run the matching algorithm for a campaign and persist results.
 * Updates campaign status to MATCHING during the process.
 */
export async function runCampaignMatching(campaignId: string) {
  const { data: campaign, error } = await supabase
    .from("Campaign")
    .select("*, nicheTags:CampaignNicheTag(nicheTagId)")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) throw new Error("Campaign not found");

  // Update status to MATCHING
  await supabase
    .from("Campaign")
    .update({ status: "MATCHING" })
    .eq("id", campaignId);

  const results = await matchCreators({
    campaignId,
    nicheTags: campaign.nicheTags.map((nt: { nicheTagId: string }) => nt.nicheTagId),
    targetPlatforms: campaign.targetPlatforms,
    targetFollowers: campaign.targetFollowers ?? 1000,
    targetEngagement: campaign.targetEngagement ?? 2,
    maxCreators: campaign.maxCreators,
    budgetPerCreator: campaign.budgetPerCreator
      ? Number(campaign.budgetPerCreator)
      : undefined,
  });

  // Create CampaignCreator records with INVITED status
  const invites = results.slice(0, campaign.maxCreators).map((result) => ({
    campaignId,
    creatorId: result.creatorId,
    status: "INVITED" as const,
    matchScore: result.matchScore,
  }));

  if (invites.length > 0) {
    await supabase.from("CampaignCreator").upsert(invites, {
      onConflict: "campaignId,creatorId",
      ignoreDuplicates: true,
    });
  }

  // Update campaign status
  await supabase
    .from("Campaign")
    .update({ status: "ACTIVE" })
    .eq("id", campaignId);

  return results;
}

"use client";

import { useState } from "react";

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

interface CreatorMatchResultsProps {
  campaignId: string;
  initialMatches?: MatchResult[];
}

export function CreatorMatchResults({
  campaignId,
  initialMatches,
}: CreatorMatchResultsProps) {
  const [matches, setMatches] = useState<MatchResult[]>(initialMatches ?? []);
  const [loading, setLoading] = useState(false);

  const runMatching = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/match`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        setMatches(data.matches);
      } else {
        alert(data.error);
      }
    } catch {
      alert("Matching failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Creator Matches</h2>
          <p className="text-sm text-muted-foreground">
            AI-scored creators ranked by relevance to your campaign
          </p>
        </div>
        <button
          onClick={runMatching}
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Finding Matches..." : "Run Matching Algorithm"}
        </button>
      </div>

      {matches.length > 0 && (
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div
              key={match.creatorId}
              className="flex items-center gap-6 rounded-xl border bg-white p-6 transition hover:shadow-md"
            >
              {/* Rank */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                #{index + 1}
              </div>

              {/* Avatar */}
              {match.avatarUrl ? (
                <img
                  src={match.avatarUrl}
                  alt={match.displayName}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-400">
                  {match.displayName.charAt(0)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{match.displayName}</h3>
                  <div className="flex gap-1">
                    {match.platforms.map((p) => (
                      <span
                        key={p}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {match.nicheTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-6 text-sm text-muted-foreground">
                  <span>
                    {match.totalFollowers.toLocaleString()} followers
                  </span>
                  <span>{match.avgEngagement.toFixed(1)}% engagement</span>
                  {match.contentRate && (
                    <span>${match.contentRate}/post</span>
                  )}
                </div>
              </div>

              {/* Match Score */}
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {match.matchScore.toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground">Match Score</p>

                {/* Score Breakdown */}
                <div className="mt-2 space-y-1">
                  <ScoreBar
                    label="Niche"
                    score={match.breakdown.nicheScore}
                  />
                  <ScoreBar
                    label="Engagement"
                    score={match.breakdown.engagementScore}
                  />
                  <ScoreBar
                    label="Followers"
                    score={match.breakdown.followerScore}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90">
                  Invite
                </button>
                <button className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50">
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {matches.length === 0 && !loading && (
        <div className="rounded-xl border bg-white py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No matches yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Click &quot;Run Matching Algorithm&quot; to find creators that fit
            your campaign requirements
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-right text-[10px] text-muted-foreground">
        {label}
      </span>
      <div className="h-1.5 w-16 rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

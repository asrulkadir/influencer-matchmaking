"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

const creatorNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Campaigns", href: "/dashboard/creator/campaigns" },
  { label: "Invitations", href: "/dashboard/creator/invitations" },
  { label: "Earnings", href: "/dashboard/creator/earnings" },
  { label: "Analytics", href: "/dashboard/creator/analytics" },
  { label: "Portfolio", href: "/dashboard/creator/portfolio" },
  { label: "Profile", href: "/dashboard/creator/profile" },
];

interface SocialStats {
  followers: number;
  engagement: number;
  found: boolean;
}

export function CreatorProfileClient({
  creator,
  allNicheTags,
}: {
  creator: any;
  allNicheTags: Array<{ id: string; name: string }>;
}) {
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState(creator.displayName ?? "");
  const [bio, setBio] = useState(creator.bio ?? "");
  const [contentRate, setContentRate] = useState(
    creator.contentRate?.toString() ?? ""
  );
  const [tiktokHandle, setTiktokHandle] = useState(
    creator.tiktokHandle ?? ""
  );
  const [instagramHandle, setInstagramHandle] = useState(
    creator.instagramHandle ?? ""
  );
  const [tiktokStats, setTiktokStats] = useState<SocialStats | null>(null);
  const [instagramStats, setInstagramStats] = useState<SocialStats | null>(
    null
  );
  const [lookingUpTiktok, setLookingUpTiktok] = useState(false);
  const [lookingUpInstagram, setLookingUpInstagram] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Stripe Connect state
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    onboardingComplete: boolean;
  }>({
    connected: !!creator.stripeAccountId,
    onboardingComplete: creator.onboardingComplete ?? false,
  });

  const formId = useId();
  const tiktokTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instagramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check Stripe status on mount and after returning from Stripe onboarding
  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "complete" || creator.stripeAccountId) {
      fetch("/api/creators/stripe-connect")
        .then((res) => res.json())
        .then((data) => {
          if (data.connected !== undefined) {
            setStripeStatus({
              connected: data.connected,
              onboardingComplete: data.onboardingComplete,
            });
          }
        })
        .catch(() => {});
    }
  }, [searchParams, creator.stripeAccountId]);

  // Social media lookup function
  const lookupSocial = useCallback(
    async (platform: "tiktok" | "instagram", username: string) => {
      const cleanUsername = username.replace(/^@/, "").trim();
      if (!cleanUsername) {
        if (platform === "tiktok") setTiktokStats(null);
        else setInstagramStats(null);
        return;
      }

      if (platform === "tiktok") setLookingUpTiktok(true);
      else setLookingUpInstagram(true);

      try {
        const res = await fetch("/api/creators/social-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, username: cleanUsername }),
        });

        if (res.ok) {
          const stats: SocialStats = await res.json();
          if (platform === "tiktok") setTiktokStats(stats);
          else setInstagramStats(stats);
        }
      } catch {
        // Silently fail — user can still save manually
      } finally {
        if (platform === "tiktok") setLookingUpTiktok(false);
        else setLookingUpInstagram(false);
      }
    },
    []
  );

  // Debounced auto-lookup for TikTok
  const handleTiktokChange = (value: string) => {
    setTiktokHandle(value);
    setTiktokStats(null);
    if (tiktokTimerRef.current) clearTimeout(tiktokTimerRef.current);
    tiktokTimerRef.current = setTimeout(() => {
      if (value.trim()) lookupSocial("tiktok", value);
    }, 800);
  };

  // Debounced auto-lookup for Instagram
  const handleInstagramChange = (value: string) => {
    setInstagramHandle(value);
    setInstagramStats(null);
    if (instagramTimerRef.current) clearTimeout(instagramTimerRef.current);
    instagramTimerRef.current = setTimeout(() => {
      if (value.trim()) lookupSocial("instagram", value);
    }, 800);
  };

  // Stripe Connect onboarding
  async function handleStripeSetup() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/creators/stripe-connect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage(data.error ?? "Failed to start Stripe setup");
      }
    } catch {
      setMessage("Failed to connect to Stripe");
    } finally {
      setStripeLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      // If handles changed but we don't have fresh stats, lookup now before saving
      let finalTiktokStats = tiktokStats;
      let finalInstagramStats = instagramStats;

      const tiktokChanged =
        (tiktokHandle || "") !== (creator.tiktokHandle || "");
      const instagramChanged =
        (instagramHandle || "") !== (creator.instagramHandle || "");

      if (tiktokChanged && tiktokHandle && !tiktokStats?.found) {
        setMessage("Looking up TikTok profile...");
        try {
          const res = await fetch("/api/creators/social-lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: "tiktok",
              username: tiktokHandle.replace(/^@/, "").trim(),
            }),
          });
          if (res.ok) {
            finalTiktokStats = await res.json();
            setTiktokStats(finalTiktokStats);
          }
        } catch {
          // continue with old data
        }
      }

      if (instagramChanged && instagramHandle && !instagramStats?.found) {
        setMessage("Looking up Instagram profile...");
        try {
          const res = await fetch("/api/creators/social-lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: "instagram",
              username: instagramHandle.replace(/^@/, "").trim(),
            }),
          });
          if (res.ok) {
            finalInstagramStats = await res.json();
            setInstagramStats(finalInstagramStats);
          }
        } catch {
          // continue with old data
        }
      }

      setMessage("Saving profile...");

      let savedTiktokFollowers = creator.tiktokFollowers ?? 0;
      let savedTiktokEngagement = creator.tiktokEngagement ?? 0;
      let savedInstagramFollowers = creator.instagramFollowers ?? 0;
      let savedInstagramEngagement = creator.instagramEngagement ?? 0;

      if (finalTiktokStats?.found) {
        savedTiktokFollowers = finalTiktokStats.followers;
        savedTiktokEngagement = finalTiktokStats.engagement;
      } else if (tiktokChanged) {
        savedTiktokFollowers = 0;
        savedTiktokEngagement = 0;
      }

      if (finalInstagramStats?.found) {
        savedInstagramFollowers = finalInstagramStats.followers;
        savedInstagramEngagement = finalInstagramStats.engagement;
      } else if (instagramChanged) {
        savedInstagramFollowers = 0;
        savedInstagramEngagement = 0;
      }

      const res = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          contentRate: contentRate ? Number.parseFloat(contentRate) : null,
          tiktokHandle: tiktokHandle || null,
          instagramHandle: instagramHandle || null,
          tiktokFollowers: savedTiktokFollowers,
          tiktokEngagement: savedTiktokEngagement,
          instagramFollowers: savedInstagramFollowers,
          instagramEngagement: savedInstagramEngagement,
        }),
      });
      if (res.ok) {
        setMessage("Profile updated successfully!");
      } else {
        const data = await res.json();
        setMessage(data.error ?? "Failed to update profile.");
      }
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout navItems={creatorNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your creator profile and social connections
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Profile Info */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Profile Information</h2>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor={`${formId}-displayName`} className="block text-sm font-medium">Display Name</label>
              <input
                id={`${formId}-displayName`}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor={`${formId}-bio`} className="block text-sm font-medium">Bio</label>
              <textarea
                id={`${formId}-bio`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor={`${formId}-contentRate`} className="block text-sm font-medium">
                Content Rate ($)
              </label>
              <input
                id={`${formId}-contentRate`}
                type="number"
                value={contentRate}
                onChange={(e) => setContentRate(e.target.value)}
                placeholder="e.g. 500"
                className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {message && (
              <p className="text-sm text-green-600">{message}</p>
            )}
          </div>
        </div>

        {/* Social Connections */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Social Media Accounts</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your handles and we&apos;ll automatically detect your follower count
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor={`${formId}-tiktokHandle`} className="block text-sm font-medium">
                  TikTok Handle
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    @
                  </span>
                  <input
                    id={`${formId}-tiktokHandle`}
                    type="text"
                    value={tiktokHandle}
                    onChange={(e) => handleTiktokChange(e.target.value)}
                    placeholder="username"
                    className="w-full rounded-lg border py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {lookingUpTiktok && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Looking up TikTok profile...
                  </p>
                )}
                {tiktokStats?.found && (
                  <div className="mt-1 rounded-md bg-green-50 px-3 py-1.5 text-xs text-green-700">
                    Found: {tiktokStats.followers.toLocaleString()} followers
                    {tiktokStats.engagement > 0 && (
                      <> &middot; {tiktokStats.engagement}% engagement</>
                    )}
                  </div>
                )}
                {tiktokStats && !tiktokStats.found && (
                  <p className="mt-1 text-xs text-orange-600">
                    Username not found. Check the handle and try again.
                  </p>
                )}
                {!tiktokStats && !lookingUpTiktok && creator.tiktokFollowers > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current: {creator.tiktokFollowers.toLocaleString()} followers
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={`${formId}-instagramHandle`} className="block text-sm font-medium">
                  Instagram Handle
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    @
                  </span>
                  <input
                    id={`${formId}-instagramHandle`}
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => handleInstagramChange(e.target.value)}
                    placeholder="username"
                    className="w-full rounded-lg border py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {lookingUpInstagram && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Looking up Instagram profile...
                  </p>
                )}
                {instagramStats?.found && (
                  <div className="mt-1 rounded-md bg-green-50 px-3 py-1.5 text-xs text-green-700">
                    Found: {instagramStats.followers.toLocaleString()} followers
                    {instagramStats.engagement > 0 && (
                      <> &middot; {instagramStats.engagement}% engagement</>
                    )}
                  </div>
                )}
                {instagramStats && !instagramStats.found && (
                  <p className="mt-1 text-xs text-orange-600">
                    Username not found. Check the handle and try again.
                  </p>
                )}
                {!instagramStats && !lookingUpInstagram && creator.instagramFollowers > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current: {creator.instagramFollowers.toLocaleString()} followers
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Niche Tags */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Niche Tags</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {creator.nicheTags?.map((nt: any) => (
                <span
                  key={nt.nicheTag?.id}
                  className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
                >
                  {nt.nicheTag?.name}
                </span>
              ))}
              {(!creator.nicheTags || creator.nicheTags.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No niche tags selected
                </p>
              )}
            </div>
          </div>

          {/* Stripe Status */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Payout Settings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect Stripe to receive payments when brands approve your content
            </p>
            <div className="mt-4">
              {stripeStatus.connected && stripeStatus.onboardingComplete ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-400" />
                    <span className="text-sm font-medium text-green-700">
                      Stripe Connected — Ready for payouts
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    When a brand approves your submitted content, your earnings
                    will be automatically transferred to your connected Stripe
                    account.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-orange-400" />
                    <span className="text-sm font-medium text-orange-700">
                      {stripeStatus.connected
                        ? "Stripe setup incomplete"
                        : "Stripe not connected"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Connect your Stripe account to receive campaign payouts when
                    brands approve your content. Funds are held in escrow and
                    released to you automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handleStripeSetup}
                    disabled={stripeLoading}
                    className="mt-4 rounded-lg bg-[#635bff] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#5349e0] disabled:opacity-50"
                  >
                    {stripeLoading
                      ? "Connecting..."
                      : stripeStatus.connected
                        ? "Complete Stripe Setup"
                        : "Connect with Stripe"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useId, useState } from "react";
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

export function CreatorProfileClient({
  creator,
  allNicheTags,
}: {
  creator: any;
  allNicheTags: Array<{ id: string; name: string }>;
}) {
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const formId = useId();

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          contentRate: contentRate ? parseFloat(contentRate) : null,
          tiktokHandle: tiktokHandle || null,
          instagramHandle: instagramHandle || null,
        }),
      });
      if (res.ok) {
        setMessage("Profile updated successfully!");
      } else {
        setMessage("Failed to update profile.");
      }
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
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    className="w-full rounded-lg border py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {creator.tiktokFollowers > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {creator.tiktokFollowers.toLocaleString()} followers
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
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    className="w-full rounded-lg border py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {creator.instagramFollowers > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {creator.instagramFollowers.toLocaleString()} followers
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
            <div className="mt-4">
              {creator.stripeConnectId && creator.onboardingComplete ? (
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="text-sm font-medium text-green-700">
                    Stripe Connected — Ready for payouts
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-orange-400" />
                    <span className="text-sm font-medium text-orange-700">
                      Stripe setup incomplete
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Complete your Stripe onboarding to receive campaign payouts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
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

const statusConfig: Record<
  string,
  { color: string; label: string; description: string }
> = {
  INVITED: {
    color: "bg-blue-100 text-blue-700",
    label: "Invited",
    description: "You have been invited to this campaign.",
  },
  ACCEPTED: {
    color: "bg-green-100 text-green-700",
    label: "Accepted — Ready to Work",
    description:
      "You accepted this campaign. Review the brief and submit your content when ready.",
  },
  CONTENT_SUBMITTED: {
    color: "bg-yellow-100 text-yellow-700",
    label: "Content Submitted — Under Review",
    description:
      "Your content is being reviewed by the brand. You will be notified once they respond.",
  },
  REVISION_REQUESTED: {
    color: "bg-orange-100 text-orange-700",
    label: "Revision Requested",
    description:
      "The brand has requested changes. Review their feedback and resubmit.",
  },
  APPROVED: {
    color: "bg-purple-100 text-purple-700",
    label: "Approved",
    description: "Your content has been approved! Payment is being processed.",
  },
  PAID: {
    color: "bg-emerald-100 text-emerald-700",
    label: "Paid ✓",
    description:
      "Campaign completed and payment released. Great job!",
  },
  REJECTED: {
    color: "bg-red-100 text-red-700",
    label: "Rejected",
    description: "This invitation was declined.",
  },
};

type CampaignCreatorData = {
  id: string;
  status: string;
  agreedRate: number | null;
  contentUrl: string | null;
  contentNotes: string | null;
  brandFeedback: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    description: string;
    brief: string | null;
    budget: number;
    startDate: string | null;
    endDate: string | null;
    targetPlatforms: string[];
    brand: {
      companyName: string;
      logo: string | null;
      website: string | null;
    } | null;
  } | null;
  escrow: {
    status: string;
    amount: number;
    creatorPayout: number;
    currency: string;
  } | null;
};

export function CampaignWorkspaceClient({
  campaignCreator: initial,
}: {
  campaignCreator: CampaignCreatorData;
}) {
  const [cc, setCc] = useState(initial);
  const [contentUrl, setContentUrl] = useState(cc.contentUrl ?? "");
  const [contentNotes, setContentNotes] = useState(cc.contentNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campaign = cc.campaign;
  const status = statusConfig[cc.status];
  const canSubmit = ["ACCEPTED", "REVISION_REQUESTED"].includes(cc.status);
  const isCompleted = ["APPROVED", "PAID"].includes(cc.status);

  async function handleSubmit() {
    if (!contentUrl.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${campaign?.id}/workspace`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentUrl: contentUrl.trim(),
            contentNotes: contentNotes.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit content");
        return;
      }
      setCc((prev) => ({
        ...prev,
        ...data.campaignCreator,
        campaign: prev.campaign,
        escrow: prev.escrow,
      }));
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout navItems={creatorNav}>
      <div className="mb-6">
        <Link
          href="/dashboard/creator/campaigns"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Back to My Campaigns
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {campaign?.brand?.logo ? (
              <img
                src={campaign.brand.logo}
                alt=""
                className="h-14 w-14 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-xl font-bold text-gray-400">
                {campaign?.brand?.companyName?.charAt(0) ?? "?"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {campaign?.title ?? "Campaign"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {campaign?.brand?.companyName}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${status?.color ?? "bg-gray-100"}`}
          >
            {status?.label ?? cc.status}
          </span>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`mb-8 rounded-xl border p-4 ${
          cc.status === "REVISION_REQUESTED"
            ? "border-orange-200 bg-orange-50"
            : cc.status === "PAID"
              ? "border-emerald-200 bg-emerald-50"
              : "border-blue-200 bg-blue-50"
        }`}
      >
        <p className="text-sm font-medium">
          {status?.description ?? ""}
        </p>
      </div>

      {/* Info grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Your Payout</p>
          <p className="mt-1 text-xl font-bold">
            ${Number(cc.escrow?.creatorPayout ?? cc.agreedRate ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Escrow</p>
          <p className="mt-1 text-xl font-bold capitalize">
            {cc.escrow?.status?.toLowerCase() ?? "pending"}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Start Date</p>
          <p className="mt-1 text-xl font-bold">
            {campaign?.startDate
              ? new Date(campaign.startDate).toLocaleDateString()
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Deadline</p>
          <p className="mt-1 text-xl font-bold">
            {campaign?.endDate
              ? new Date(campaign.endDate).toLocaleDateString()
              : "—"}
          </p>
        </div>
      </div>

      {/* Platforms */}
      {campaign?.targetPlatforms && campaign.targetPlatforms.length > 0 && (
        <div className="mb-8 flex gap-2">
          <span className="text-sm text-muted-foreground">Platforms:</span>
          {campaign.targetPlatforms.map((p) => (
            <span
              key={p}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Campaign Brief */}
      <div className="mb-8 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Campaign Brief</h2>
        {campaign?.brief ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {campaign.brief}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {campaign?.description}
          </p>
        )}
      </div>

      {/* Brand feedback (if revision requested) */}
      {cc.brandFeedback && cc.status === "REVISION_REQUESTED" && (
        <div className="mb-8 rounded-xl border border-orange-200 bg-orange-50 p-6">
          <h2 className="text-lg font-semibold text-orange-800">
            Brand Feedback
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-orange-700">
            {cc.brandFeedback}
          </p>
        </div>
      )}

      {/* Previous submission */}
      {cc.contentUrl && !canSubmit && (
        <div className="mb-8 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Your Submission</h2>
          <a
            href={cc.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-sm text-primary hover:underline"
          >
            {cc.contentUrl}
          </a>
          {cc.contentNotes && (
            <p className="mt-2 text-sm text-muted-foreground">
              {cc.contentNotes}
            </p>
          )}
          {cc.submittedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Submitted {new Date(cc.submittedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Content submission form */}
      {canSubmit && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">
            {cc.status === "REVISION_REQUESTED"
              ? "Resubmit Content"
              : "Submit Content"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the URL to your published content (e.g., Instagram post, TikTok video, YouTube link)
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              placeholder="Notes for the brand (optional)"
              value={contentNotes}
              onChange={(e) => setContentNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <button
              type="button"
              disabled={submitting || !contentUrl.trim()}
              onClick={handleSubmit}
              className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Content for Review"}
            </button>
          </div>
        </div>
      )}

      {/* Completed state */}
      {isCompleted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-lg font-semibold text-emerald-800">
            {cc.status === "PAID"
              ? "🎉 Campaign Complete — Payment Released!"
              : "✅ Content Approved!"}
          </p>
          {cc.approvedAt && (
            <p className="mt-1 text-sm text-emerald-700">
              Approved on {new Date(cc.approvedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

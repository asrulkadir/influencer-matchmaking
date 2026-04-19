"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { CreatorMatchResults } from "@/components/campaigns/creator-match-results";

const brandNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campaigns", href: "/dashboard/brand/campaigns" },
  { label: "Creator Discovery", href: "/dashboard/brand/creators" },
  { label: "Payments", href: "/dashboard/brand/payments" },
  { label: "Analytics", href: "/dashboard/brand/analytics" },
  { label: "Settings", href: "/dashboard/brand/settings" },
];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  MATCHING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const creatorStatusColors: Record<string, string> = {
  INVITED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  CONTENT_SUBMITTED: "bg-yellow-100 text-yellow-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
  APPROVED: "bg-purple-100 text-purple-700",
  PAID: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

type CampaignDetail = {
  id: string;
  title: string;
  description: string;
  brief: string | null;
  status: string;
  budget: number;
  budgetPerCreator: number | null;
  maxCreators: number;
  startDate: string | null;
  endDate: string | null;
  targetPlatforms: string[];
  targetFollowers: number | null;
  targetEngagement: number | null;
  createdAt: string;
  nicheTags: Array<{ nicheTag: { name: string } | null }>;
  campaignCreators: Array<{
    id: string;
    status: string;
    matchScore: number | null;
    contentUrl: string | null;
    contentNotes: string | null;
    brandFeedback: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
    creator: {
      displayName: string;
      avatarUrl: string | null;
      totalFollowers: number;
      avgEngagement: number;
    } | null;
    escrow: {
      status: string;
      amount: number;
      creatorPayout: number;
    } | null;
  }>;
};

export function CampaignDetailClient({
  campaign: initialCampaign,
}: {
  campaign: CampaignDetail;
}) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleReview = async (
    ccId: string,
    action: "approve" | "request_revision"
  ) => {
    if (
      action === "approve" &&
      !confirm("Approve this content? This will release the escrow payment to the creator.")
    )
      return;
    setReviewingId(ccId);
    setReviewError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${campaign.id}/workspace`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignCreatorId: ccId,
            action,
            brandFeedback: feedbackText.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error ?? "Failed to submit review");
        return;
      }
      // Update the local campaign state
      setCampaign((prev) => ({
        ...prev,
        campaignCreators: prev.campaignCreators.map((c) =>
          c.id === ccId
            ? { ...c, status: data.campaignCreator.status, brandFeedback: feedbackText.trim() || c.brandFeedback }
            : c
        ),
      }));
      setFeedbackText("");
    } catch {
      setReviewError("Something went wrong");
    } finally {
      setReviewingId(null);
    }
  };

  const handlePublish = async () => {
    if (
      !confirm(
        `You are about to commit $${Number(campaign.budget).toLocaleString()} for this campaign.\n\nThis budget will be held in escrow and distributed to creators as they complete work.\n\nProceed?`
      )
    )
      return;

    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error ?? "Failed to publish campaign");
        return;
      }
      setCampaign((prev) => ({ ...prev, status: data.campaign.status }));
    } catch {
      setPublishError("Something went wrong");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <DashboardLayout navItems={brandNav}>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/brand/campaigns"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Back to Campaigns
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.title}</h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[campaign.status] ?? "bg-gray-100"}`}
              >
                {campaign.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-muted-foreground">
              {campaign.description}
            </p>
          </div>
          {campaign.status === "DRAFT" && (
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublish}
              className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {publishing ? "Processing Payment…" : "Fund & Publish Campaign"}
            </button>
          )}
        </div>
        {publishError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {publishError}
          </div>
        )}
        {campaign.status === "DRAFT" && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              💰 Escrow Required — ${Number(campaign.budget).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Your campaign budget will be held in escrow before the campaign
              goes live. Funds are released to creators only after you approve
              their content. Click &quot;Fund &amp; Publish Campaign&quot; to commit your
              budget and make the campaign visible to creators.
            </p>
          </div>
        )}
      </div>

      {/* Campaign Info Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="mt-1 text-xl font-bold">
            ${Number(campaign.budget).toLocaleString()}
          </p>
          {campaign.budgetPerCreator && (
            <p className="text-xs text-muted-foreground">
              ${Number(campaign.budgetPerCreator).toLocaleString()} per creator
            </p>
          )}
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Creators</p>
          <p className="mt-1 text-xl font-bold">
            {campaign.campaignCreators.length} / {campaign.maxCreators}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Platforms</p>
          <div className="mt-1 flex gap-1">
            {campaign.targetPlatforms.map((p) => (
              <span
                key={p}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Niche Tags</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {campaign.nicheTags.map(
              (nt, i) =>
                nt.nicheTag && (
                  <span
                    key={nt.nicheTag.name}
                    className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600"
                  >
                    {nt.nicheTag.name}
                  </span>
                )
            )}
          </div>
        </div>
      </div>

      {/* Brief */}
      {campaign.brief && (
        <div className="mb-8 rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Campaign Brief</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {campaign.brief}
          </p>
        </div>
      )}

      {/* Creators */}
      {campaign.campaignCreators.length > 0 && (
        <div className="mb-8 rounded-xl border bg-white">
          <div className="border-b p-6">
            <h2 className="font-semibold">Campaign Creators</h2>
          </div>
          {reviewError && (
            <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {reviewError}
            </div>
          )}
          <div className="divide-y">
            {campaign.campaignCreators.map((cc) => (
              <div key={cc.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {cc.creator?.avatarUrl ? (
                      <img
                        src={cc.creator.avatarUrl}
                        alt={cc.creator.displayName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400">
                        {cc.creator?.displayName?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {cc.creator?.displayName ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cc.creator?.totalFollowers.toLocaleString()} followers
                        {" · "}
                        {cc.creator?.avgEngagement.toFixed(1)}% eng.
                        {cc.matchScore && ` · Score: ${cc.matchScore}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {cc.escrow && (
                      <span className="text-sm font-medium">
                        ${Number(cc.escrow.amount).toLocaleString()}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${creatorStatusColors[cc.status] ?? "bg-gray-100"}`}
                    >
                      {cc.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Content submitted — show content + review actions */}
                {cc.status === "CONTENT_SUBMITTED" && cc.contentUrl && (
                  <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-xs font-medium text-yellow-800 uppercase">
                      Content Submitted for Review
                    </p>
                    <a
                      href={cc.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-sm font-medium text-primary hover:underline"
                    >
                      {cc.contentUrl}
                    </a>
                    {cc.contentNotes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {cc.contentNotes}
                      </p>
                    )}
                    {cc.submittedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted{" "}
                        {new Date(cc.submittedAt).toLocaleString()}
                      </p>
                    )}
                    <div className="mt-4 space-y-3">
                      <textarea
                        placeholder="Feedback for creator (required for revision request, optional for approval)"
                        value={reviewingId === cc.id ? feedbackText : ""}
                        onFocus={() => setReviewingId(cc.id)}
                        onChange={(e) => {
                          setReviewingId(cc.id);
                          setFeedbackText(e.target.value);
                        }}
                        rows={2}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={reviewingId === cc.id && !feedbackText}
                          onClick={() => handleReview(cc.id, "approve")}
                          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve & Release Payment
                        </button>
                        <button
                          type="button"
                          disabled={
                            reviewingId === cc.id && !feedbackText.trim()
                          }
                          onClick={() => {
                            if (!feedbackText.trim()) {
                              setReviewError(
                                "Please provide feedback when requesting a revision."
                              );
                              return;
                            }
                            handleReview(cc.id, "request_revision");
                          }}
                          className="rounded-lg border border-orange-300 bg-orange-50 px-5 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                        >
                          Request Revision
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show previous content for other statuses */}
                {["APPROVED", "PAID", "REVISION_REQUESTED"].includes(
                  cc.status
                ) &&
                  cc.contentUrl && (
                    <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        {cc.status === "REVISION_REQUESTED"
                          ? "Previous Submission (Revision Requested)"
                          : "Approved Content"}
                      </p>
                      <a
                        href={cc.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm text-primary hover:underline"
                      >
                        {cc.contentUrl}
                      </a>
                      {cc.brandFeedback && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Your feedback:</span>{" "}
                          {cc.brandFeedback}
                        </p>
                      )}
                      {cc.approvedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Approved{" "}
                          {new Date(cc.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching (only after published) */}
      {["ACTIVE", "MATCHING", "IN_PROGRESS"].includes(campaign.status) && (
        <CreatorMatchResults
          campaignId={campaign.id}
          onInvite={() => router.refresh()}
        />
      )}

      {campaign.status === "DRAFT" && (
        <div className="rounded-xl border bg-white py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Publish your campaign first
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Fund the campaign escrow to make it active, then you can run
            matching and invite creators.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

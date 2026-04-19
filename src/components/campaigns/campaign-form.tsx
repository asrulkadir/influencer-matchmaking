"use client";

import { useState } from "react";

interface CampaignFormProps {
  nicheTags: Array<{ id: string; name: string }>;
}

export function CampaignForm({ nicheTags }: CampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    budgetPerCreator: "",
    targetPlatforms: [] as string[],
    targetFollowers: "",
    targetEngagement: "",
    maxCreators: "5",
    nicheTagIds: [] as string[],
    startDate: "",
    endDate: "",
  });

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budget: Number.parseFloat(formData.budget),
          budgetPerCreator: formData.budgetPerCreator
            ? Number.parseFloat(formData.budgetPerCreator)
            : undefined,
          targetFollowers: formData.targetFollowers
            ? Number.parseInt(formData.targetFollowers)
            : undefined,
          targetEngagement: formData.targetEngagement
            ? Number.parseFloat(formData.targetEngagement)
            : undefined,
          maxCreators: Number.parseInt(formData.maxCreators),
          startDate: formData.startDate
            ? new Date(formData.startDate).toISOString()
            : undefined,
          endDate: formData.endDate
            ? new Date(formData.endDate).toISOString()
            : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error ?? "Failed to create campaign");
        return;
      }

      const data = await response.json();
      globalThis.location.href = `/dashboard/brand/campaigns/${data.campaign.id}`;
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platform)
        ? prev.targetPlatforms.filter((p) => p !== platform)
        : [...prev.targetPlatforms, platform],
    }));
  };

  const toggleNiche = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      nicheTagIds: prev.nicheTagIds.includes(id)
        ? prev.nicheTagIds.filter((n) => n !== id)
        : [...prev.nicheTagIds, id],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Create New Campaign</h2>
        <p className="text-muted-foreground">
          Fill in the details and our matching algorithm will find the best
          creators for your campaign.
        </p>
      </div>

      {/* Basic Info */}
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Campaign Details</h3>
        <div>
          <label className="block text-sm font-medium">Campaign Title</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={200}
            className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Summer Fashion Collection Launch"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            required
            minLength={10}
            rows={4}
            className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Describe your campaign goals, content requirements, and deliverables..."
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Budget & Scale</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">
              Total Budget (USD)
            </label>
            <input
              type="number"
              required
              min="100"
              step="0.01"
              className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="5000"
              value={formData.budget}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, budget: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Budget Per Creator (USD)
            </label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="500"
              value={formData.budgetPerCreator}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  budgetPerCreator: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Max Creators
            </label>
            <input
              type="number"
              required
              min="1"
              max="100"
              className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.maxCreators}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxCreators: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* Targeting */}
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Creator Targeting</h3>

        <div>
          <label className="block text-sm font-medium">Target Platforms</label>
          <div className="mt-2 flex gap-3">
            {["tiktok", "instagram"].map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                  formData.targetPlatforms.includes(platform)
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-gray-50"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">
              Min. Followers
            </label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="10000"
              value={formData.targetFollowers}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  targetFollowers: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Min. Engagement Rate (%)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="3.0"
              value={formData.targetEngagement}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  targetEngagement: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Niche Tags</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {nicheTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleNiche(tag.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  formData.nicheTagIds.includes(tag.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-gray-50"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Timeline</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Start Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.startDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">End Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.endDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Campaign"}
        </button>
        <a
          href="/dashboard/brand/campaigns"
          className="rounded-lg border px-8 py-3 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

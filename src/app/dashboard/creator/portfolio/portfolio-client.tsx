"use client";

import { useState } from "react";
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

export function CreatorPortfolioClient({
  portfolioItems,
  completedWork,
  creatorId,
}: {
  portfolioItems: Array<{
    id: string;
    title: string;
    platform: string;
    url: string;
    thumbnailUrl: string | null;
    views: number;
    likes: number;
  }>;
  completedWork: any[];
  creatorId: string;
}) {
  const [items, setItems] = useState(portfolioItems);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState("tiktok");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editPlatform, setEditPlatform] = useState("tiktok");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addItem() {
    if (!newUrl.trim() || !newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          url: newUrl.trim(),
          platform: newPlatform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.portfolioItem) {
          setItems((prev) => [data.portfolioItem, ...prev]);
        }
        setNewTitle("");
        setNewUrl("");
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to add portfolio item");
      }
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: (typeof items)[0]) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.url);
    setEditPlatform(item.platform);
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim() || !editUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          title: editTitle.trim(),
          url: editUrl.trim(),
          platform: editPlatform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((it) =>
            it.id === editingId ? { ...it, ...data.portfolioItem } : it
          )
        );
        setEditingId(null);
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to update");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this portfolio item?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== id));
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to delete");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardLayout navItems={creatorNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground">
          Showcase your best work to attract brands
        </p>
      </div>

      {/* Portfolio Links */}
      <div className="mb-8 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Portfolio Items</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add links to your best content
        </p>
        <div className="mt-4 space-y-3">
          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-3">
            <input
              type="url"
              placeholder="https://..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              className="rounded-lg border px-4 py-2.5 text-sm"
            >
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="other">Other</option>
            </select>
            <button
              type="button"
              onClick={addItem}
              disabled={saving || !newUrl.trim() || !newTitle.trim()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
        {items.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <select
                      value={editPlatform}
                      onChange={(e) => setEditPlatform(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="other">Other</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border px-4 py-1.5 text-xs font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{item.title}</h3>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize">
                        {item.platform}
                      </span>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-sm text-primary hover:underline"
                    >
                      {item.url}
                    </a>
                    {(item.views > 0 || item.likes > 0) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.views.toLocaleString()} views ·{" "}
                        {item.likes.toLocaleString()} likes
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => deleteItem(item.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Campaign Work */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Completed Campaign Work</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Content from campaigns you&apos;ve successfully delivered
        </p>
        {completedWork.length === 0 ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            No completed work yet. Finished campaign content will appear here.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {completedWork.map((work) => (
              <div key={work.id} className="rounded-lg border p-4">
                <h3 className="font-medium">
                  {work.campaign?.title ?? "Campaign"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {work.campaign?.brand?.companyName}
                </p>
                {work.contentUrl && (
                  <a
                    href={work.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    View Content →
                  </a>
                )}
                {work.submittedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted{" "}
                    {new Date(work.submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

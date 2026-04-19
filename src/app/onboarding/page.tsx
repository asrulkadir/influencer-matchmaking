"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, Suspense } from "react";

function OnboardingContent() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleFromUrl = searchParams.get("role") as "brand" | "creator" | null;
  const role = roleFromUrl === "brand" ? "brand" : "creator";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formId = useId();

  // Brand fields
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");

  // Creator fields
  const [displayName, setDisplayName] = useState(session?.user?.name ?? "");
  const [bio, setBio] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          role === "brand"
            ? { role: "BRAND", companyName, website, industry }
            : { role: "CREATOR", displayName, bio, tiktokHandle, instagramHandle }
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to complete onboarding");
      }

      await update();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4">
      <div className="w-full max-w-lg">

          {role === "brand" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Set up your brand profile</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This helps creators understand your brand
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor={`${formId}-companyName`} className="block text-sm font-medium">
                    Company Name *
                  </label>
                  <input
                    id={`${formId}-companyName`}
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Inc."
                    className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-website`} className="block text-sm font-medium">
                    Website
                  </label>
                  <input
                    id={`${formId}-website`}
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-industry`} className="block text-sm font-medium">
                    Industry
                  </label>
                  <select
                    id={`${formId}-industry`}
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select industry</option>
                    <option value="Fashion & Beauty">Fashion &amp; Beauty</option>
                    <option value="Food & Beverage">Food &amp; Beverage</option>
                    <option value="Technology">Technology</option>
                    <option value="Health & Fitness">Health &amp; Fitness</option>
                    <option value="Travel">Travel</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !companyName}
                  className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSubmitting ? "Creating profile..." : "Complete Setup"}
                </button>
              </div>
            </div>
          )}

          {role === "creator" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Set up your creator profile</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tell brands about your content and audience
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor={`${formId}-displayName`} className="block text-sm font-medium">
                    Display Name *
                  </label>
                  <input
                    id={`${formId}-displayName`}
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your creator name"
                    className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-bio`} className="block text-sm font-medium">
                    Bio
                  </label>
                  <textarea
                    id={`${formId}-bio`}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell brands about your content style and audience..."
                    rows={3}
                    className="mt-1 w-full rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`${formId}-tiktokHandle`} className="block text-sm font-medium">
                      TikTok Handle
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        @
                      </span>
                      <input
                        id={`${formId}-tiktokHandle`}
                        type="text"
                        value={tiktokHandle}
                        onChange={(e) => setTiktokHandle(e.target.value)}
                        placeholder="username"
                        className="w-full rounded-lg border py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${formId}-instagramHandle`} className="block text-sm font-medium">
                      Instagram Handle
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        @
                      </span>
                      <input
                        id={`${formId}-instagramHandle`}
                        type="text"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value)}
                        placeholder="username"
                        className="w-full rounded-lg border py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !displayName}
                  className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSubmitting ? "Creating profile..." : "Complete Setup"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

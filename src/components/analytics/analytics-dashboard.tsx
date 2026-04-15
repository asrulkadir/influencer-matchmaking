"use client";

interface AnalyticsData {
  reports: Array<{
    id: string;
    platform: string;
    periodStart: string;
    periodEnd: string;
    followers: number;
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }>;
  aggregated: {
    totalImpressions: number;
    totalReach: number;
    avgEngagement: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
  };
}

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const { aggregated, reports } = data;

  return (
    <div className="space-y-6">
      {/* Aggregate Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Impressions"
          value={aggregated.totalImpressions.toLocaleString()}
        />
        <MetricCard
          title="Total Reach"
          value={aggregated.totalReach.toLocaleString()}
        />
        <MetricCard
          title="Avg Engagement"
          value={`${aggregated.avgEngagement.toFixed(2)}%`}
        />
        <MetricCard
          title="Total Interactions"
          value={(
            aggregated.totalLikes +
            aggregated.totalComments +
            aggregated.totalShares +
            aggregated.totalSaves
          ).toLocaleString()}
        />
      </div>

      {/* Engagement Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Engagement Breakdown</h3>
          <div className="mt-6 space-y-4">
            <EngagementBar
              label="Likes"
              value={aggregated.totalLikes}
              total={
                aggregated.totalLikes +
                aggregated.totalComments +
                aggregated.totalShares +
                aggregated.totalSaves
              }
              color="bg-red-400"
            />
            <EngagementBar
              label="Comments"
              value={aggregated.totalComments}
              total={
                aggregated.totalLikes +
                aggregated.totalComments +
                aggregated.totalShares +
                aggregated.totalSaves
              }
              color="bg-blue-400"
            />
            <EngagementBar
              label="Shares"
              value={aggregated.totalShares}
              total={
                aggregated.totalLikes +
                aggregated.totalComments +
                aggregated.totalShares +
                aggregated.totalSaves
              }
              color="bg-green-400"
            />
            <EngagementBar
              label="Saves"
              value={aggregated.totalSaves}
              total={
                aggregated.totalLikes +
                aggregated.totalComments +
                aggregated.totalShares +
                aggregated.totalSaves
              }
              color="bg-purple-400"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Platform Comparison</h3>
          <div className="mt-6 space-y-6">
            {["tiktok", "instagram"].map((platform) => {
              const platformReports = reports.filter(
                (r) => r.platform === platform
              );
              const avgEng =
                platformReports.length > 0
                  ? platformReports.reduce((s, r) => s + r.engagement, 0) /
                    platformReports.length
                  : 0;
              const totalImpressions = platformReports.reduce(
                (s, r) => s + r.impressions,
                0
              );

              return (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {platform}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {avgEng.toFixed(2)}% avg engagement
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {totalImpressions.toLocaleString()} impressions
                    </span>
                    <span>{platformReports.length} reports</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Reports Table */}
      <div className="rounded-xl border bg-white">
        <div className="border-b p-6">
          <h3 className="font-semibold">Monthly Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3">Platform</th>
                <th className="px-6 py-3">Followers</th>
                <th className="px-6 py-3">Impressions</th>
                <th className="px-6 py-3">Reach</th>
                <th className="px-6 py-3">Engagement</th>
                <th className="px-6 py-3">Likes</th>
                <th className="px-6 py-3">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm">
                    {new Date(report.periodStart).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize">
                      {report.platform}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {report.followers.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {report.impressions.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {report.reach.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium">
                    {report.engagement.toFixed(2)}%
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {report.likes.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {report.comments.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function EngagementBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

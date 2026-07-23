import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminGetAnalytics, useAdminGetRecentActivity, useAdminGetCourseAnalytics, getAdminGetAnalyticsQueryKey, getAdminGetRecentActivityQueryKey, getAdminGetCourseAnalyticsQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, BookOpen, TrendingUp, Activity } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: stats } = useAdminGetAnalytics({ query: { queryKey: getAdminGetAnalyticsQueryKey() } });
  const { data: activity } = useAdminGetRecentActivity({ query: { queryKey: getAdminGetRecentActivityQueryKey() } });
  const { data: courseAnalytics } = useAdminGetCourseAnalytics({ query: { queryKey: getAdminGetCourseAnalyticsQueryKey() } });

  const statCards = [
    { label: "Total Students", value: stats?.totalStudents ?? "—", icon: Users, color: "text-blue-400" },
    { label: "Published Courses", value: stats?.publishedCourses ?? "—", icon: BookOpen, color: "text-primary" },
    { label: "Total Enrollments", value: stats?.totalEnrollments ?? "—", icon: TrendingUp, color: "text-green-400" },
    { label: "Completions (Month)", value: stats?.completionsThisMonth ?? "—", icon: Activity, color: "text-yellow-400" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Platform overview and key metrics</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
                </div>
                <p className={`text-3xl font-mono font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-4">Enrollments by Course</h3>
              {(courseAnalytics?.length ?? 0) === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">No course data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={courseAnalytics ?? []} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: "#6b7280" }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e2535", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#f3f4f6" }} />
                    <Bar dataKey="enrolledCount" fill="#f97316" radius={[0, 4, 4, 0]} name="Enrolled" />
                    <Bar dataKey="completionCount" fill="#22c55e" radius={[0, 4, 4, 0]} name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Activity</h3>
              <div className="space-y-2 overflow-y-auto max-h-[220px]">
                {(activity ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                ) : (
                  (activity ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-2.5">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground font-mono font-semibold">{item.action}</p>
                        {item.detail && <p className="text-xs text-muted-foreground truncate">{item.detail}</p>}
                        {item.username && <p className="text-xs text-muted-foreground">by {item.username}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(item.timestamp)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

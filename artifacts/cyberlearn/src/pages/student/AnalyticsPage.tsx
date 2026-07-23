import { StudentSidebar } from "@/components/StudentSidebar";
import { useGetMyAnalytics, useGetMyStudyTime, useGetMyQuizScores, getGetMyAnalyticsQueryKey, getGetMyStudyTimeQueryKey, getGetMyQuizScoresQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, BookOpen, HelpCircle, TrendingUp } from "lucide-react";

export default function StudentAnalyticsPage() {
  const { data: stats } = useGetMyAnalytics({ query: { queryKey: getGetMyAnalyticsQueryKey() } });
  const { data: studyTime } = useGetMyStudyTime({ query: { queryKey: getGetMyStudyTimeQueryKey() } });
  const { data: quizScores } = useGetMyQuizScores({ query: { queryKey: getGetMyQuizScoresQueryKey() } });

  const statCards = [
    { label: "Study Hours", value: stats ? `${Math.round(stats.totalStudyHours ?? 0)}h` : "—", icon: Clock, color: "text-primary" },
    { label: "Courses Enrolled", value: stats?.totalCoursesEnrolled ?? "—", icon: BookOpen, color: "text-blue-400" },
    { label: "Courses Completed", value: stats?.completedCourses ?? "—", icon: HelpCircle, color: "text-yellow-400" },
    { label: "Avg Quiz Score", value: stats ? `${Math.round(stats.avgQuizScore ?? 0)}%` : "—", icon: TrendingUp, color: "text-green-400" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your learning performance at a glance</p>
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
              <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-4">Study Time (last 30 days)</h3>
              {(studyTime?.length ?? 0) === 0 ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={studyTime ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e2535", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#f3f4f6" }} itemStyle={{ color: "#f97316" }} formatter={(v: any) => [`${v}m`, "Study time"]} />
                    <Bar dataKey="minutes" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quiz Scores</h3>
              {(quizScores?.length ?? 0) === 0 ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">No quiz attempts yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={quizScores ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={d => d.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e2535", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#f3f4f6" }} itemStyle={{ color: "#3b82f6" }} formatter={(v: any) => [`${v}%`, "Score"]} />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

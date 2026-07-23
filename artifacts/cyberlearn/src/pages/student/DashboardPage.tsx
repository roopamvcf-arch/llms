import { Bell, BookOpen, CheckCircle, Award, TrendingUp } from "lucide-react";
import { StudentSidebar } from "@/components/StudentSidebar";
import { useGetStudentDashboard, getGetStudentDashboardQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { cn, getDifficultyColor } from "@/lib/utils";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { data: dashboard, isLoading } = useGetStudentDashboard({ query: { queryKey: getGetStudentDashboardQueryKey() } });

  const stats = dashboard?.stats;
  const statCards = [
    { label: "Enrolled", value: stats?.totalCoursesEnrolled ?? 0, icon: BookOpen, color: "text-blue-400" },
    { label: "Completed", value: stats?.completedCourses ?? 0, icon: CheckCircle, color: "text-green-400" },
    { label: "Badges", value: stats?.badgesEarned ?? 0, icon: Award, color: "text-yellow-400" },
    { label: "Notifications", value: dashboard?.unreadNotifications ?? 0, icon: Bell, color: "text-primary" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-mono font-bold text-foreground">
                Welcome back, <span className="text-primary">{user?.username}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Your learning command center</p>
            </div>
            <Link href="/student/settings">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-mono font-bold text-white cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: user?.avatarColor ?? "#f97316" }}
              >
                {(user?.username ?? "?").slice(0, 2).toUpperCase()}
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={cn("h-4 w-4", color)} />
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
                </div>
                <p className={cn("text-3xl font-mono font-bold", color)}>{isLoading ? "—" : value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Continue Learning</h2>
              <Link href="/student/courses">
                <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
              </Link>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl border border-border bg-card animate-pulse" />)}
              </div>
            ) : (dashboard?.recentCourses?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">No courses yet.</p>
                <Link href="/student/courses">
                  <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-mono font-bold text-primary-foreground hover:bg-primary/90">
                    Browse Courses
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboard?.recentCourses?.slice(0, 6).map(course => (
                  <Link key={course.id} href={`/student/courses/${course.id}/learn`}>
                    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{course.title}</p>
                          <span className={cn("text-xs font-mono mt-0.5", getDifficultyColor(course.difficulty))}>{course.difficulty}</span>
                        </div>
                        <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{course.category ?? "General"}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {(dashboard?.recentBadges?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Recent Badges</h2>
                <Link href="/student/badges">
                  <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
                </Link>
              </div>
              <div className="flex gap-3 flex-wrap">
                {dashboard?.recentBadges?.map(ub => (
                  <div key={ub.id} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: ub.badge?.colorHex ?? "#22c55e" }} />
                    <span className="text-xs font-semibold text-foreground">{ub.badge?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

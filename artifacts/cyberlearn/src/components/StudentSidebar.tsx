import { useLocation, Link } from "wouter";
import { LayoutDashboard, BookOpen, Award, FileText, BarChart2, Settings, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/student/dashboard" },
  { icon: BookOpen, label: "Courses", href: "/student/courses" },
  { icon: Award, label: "Badges", href: "/student/badges" },
  { icon: FileText, label: "Certificates", href: "/student/certificates" },
  { icon: BarChart2, label: "Analytics", href: "/student/analytics" },
  { icon: Settings, label: "Settings", href: "/student/settings" },
];

export function StudentSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-16 flex-col items-center border-r border-border bg-[#171c27] py-4 shrink-0">
      <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
        <Shield className="h-5 w-5 text-primary" />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <button
                data-testid={`nav-${label.toLowerCase()}`}
                title={label}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-mono font-bold text-white"
          style={{ backgroundColor: user?.avatarColor ?? "#f97316" }}
          title={user?.username}
        >
          {getInitials(user?.username ?? "?")}
        </div>
        <button onClick={logout} title="Logout" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-red-400 transition-colors">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

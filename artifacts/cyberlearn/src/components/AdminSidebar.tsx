import { useLocation, Link } from "wouter";
import { LayoutDashboard, BookOpen, Users, Award, FileText, Settings, LogOut, Shield, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
  { icon: BookOpen, label: "Courses", href: "/admin/courses" },
  { icon: Users, label: "Students", href: "/admin/students" },
  { icon: Award, label: "Badges", href: "/admin/badges" },
  { icon: FileText, label: "Certificates", href: "/admin/certificates" },
  { icon: ClipboardList, label: "Audit Log", href: "/admin/audit-log" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-[#171c27] shrink-0">
      <div className="flex flex-col items-center gap-2 border-b border-border px-4 py-4 bg-white/[0.02]">
        <div className="flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-2 py-1 border border-primary/20 shrink-0">
          <img src="/logo.png" alt="VANDE E-KIT Logo" className="h-full w-full object-contain" />
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-mono font-bold text-muted-foreground tracking-widest">Admin Portal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <button
                data-testid={`admin-nav-${label.toLowerCase().replace(" ", "-")}`}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-mono font-bold text-white shrink-0"
            style={{ backgroundColor: user?.avatarColor ?? "#f97316" }}
          >
            {getInitials(user?.username ?? "?")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-red-400 transition-colors">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}

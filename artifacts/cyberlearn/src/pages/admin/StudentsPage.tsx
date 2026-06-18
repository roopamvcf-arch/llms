import { useState } from "react";
import { Search, UserX, UserCheck, BookOpen, Plus } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminListUsers, useAdminSuspendUser, useAdminCreateUser, useAdminEnrollUser, useListCourses, getAdminListUsersQueryKey, getListCoursesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AdminStudentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [enrollModal, setEnrollModal] = useState<{ userId: number; username: string; isActive: boolean } | null>(null);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const { data: result, isLoading } = useAdminListUsers(
    { search: search || undefined },
    { query: { queryKey: getAdminListUsersQueryKey({ search: search || undefined }) } }
  );
  const { data: courses } = useListCourses({}, { query: { queryKey: getListCoursesQueryKey({}) } });

  const suspendMutation = useAdminSuspendUser();
  const createMutation = useAdminCreateUser();
  const enrollMutation = useAdminEnrollUser();

  const users = (result as any)?.users ?? (Array.isArray(result) ? result : []);

  const handleSuspend = (userId: number, currentlyActive: boolean) => {
    suspendMutation.mutate(
      { id: userId, data: { isActive: !currentlyActive } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) }); toast({ title: "Status updated" }); } }
    );
  };

  const handleCreate = () => {
    createMutation.mutate(
      { data: { username: newUser.username, email: newUser.email, password: newUser.password } },
      {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) }); setShowCreate(false); setNewUser({ username: "", email: "", password: "" }); toast({ title: "User created" }); },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error, variant: "destructive" })
      }
    );
  };

  const handleEnroll = () => {
    if (!enrollModal || !selectedCourseId) return;
    enrollMutation.mutate(
      { id: enrollModal.userId, data: { courseId: selectedCourseId } },
      {
        onSuccess: () => { setEnrollModal(null); toast({ title: `${enrollModal.username} enrolled` }); },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error, variant: "destructive" })
      }
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-mono font-bold text-foreground">Students</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage learner accounts</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-mono font-bold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Add Student
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background/50">
                <tr>
                  {["Student", "Email", "Joined", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
                ) : users.filter((u: any) => u.role === "STUDENT").map((user: any) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-mono font-bold text-white shrink-0" style={{ backgroundColor: user.avatarColor ?? "#f97316" }}>
                          {getInitials(user.username)}
                        </div>
                        <span className="font-semibold text-foreground">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-mono", user.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                        {user.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEnrollModal({ userId: user.id, username: user.username, isActive: user.isActive })} title="Enroll in course" className="rounded-lg p-1.5 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10">
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleSuspend(user.id, user.isActive)} title={user.isActive ? "Suspend" : "Activate"} className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl border border-border bg-card p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h2 className="text-lg font-mono font-bold text-foreground">Add Student</h2>
            {[
              { label: "Username", field: "username", type: "text" },
              { label: "Email", field: "email", type: "email" },
              { label: "Password", field: "password", type: "password" },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
                <input type={type} value={(newUser as any)[field]} onChange={e => setNewUser(p => ({ ...p, [field]: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleCreate} disabled={createMutation.isPending} className="flex-1 rounded-lg bg-primary py-2 text-sm font-mono font-bold text-primary-foreground disabled:opacity-50">
                {createMutation.isPending ? "..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {enrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl border border-border bg-card p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h2 className="text-lg font-mono font-bold text-foreground">Enroll {enrollModal.username}</h2>
            <div>
              <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Course</label>
              <select value={selectedCourseId ?? ""} onChange={e => setSelectedCourseId(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="">Select a course...</option>
                {(courses ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEnrollModal(null)} className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleEnroll} disabled={!selectedCourseId || enrollMutation.isPending} className="flex-1 rounded-lg bg-primary py-2 text-sm font-mono font-bold text-primary-foreground disabled:opacity-50">
                {enrollMutation.isPending ? "..." : "Enroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

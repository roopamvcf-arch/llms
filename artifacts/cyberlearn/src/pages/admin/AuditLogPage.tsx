import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminGetAuditLog, getAdminGetAuditLogQueryKey } from "@workspace/api-client-react";
import { formatDateTime } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

export default function AdminAuditLogPage() {
  const { data: result, isLoading } = useAdminGetAuditLog({}, { query: { queryKey: getAdminGetAuditLogQueryKey({}) } });
  const logs = (result as any)?.logs ?? result ?? [];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-0.5">System activity and admin actions</p>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background/50">
                <tr>
                  {["Action", "Detail", "User", "Timestamp"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : (Array.isArray(logs) ? logs : []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <ClipboardList className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No audit log entries yet</p>
                    </td>
                  </tr>
                ) : (Array.isArray(logs) ? logs : []).map((log: any) => (
                  <tr key={log.id} data-testid={`row-audit-${log.id}`} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.detail ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.username ?? "system"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{formatDateTime(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

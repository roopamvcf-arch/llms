import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminGetSettings, useAdminUpdateSettings, getAdminGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useAdminGetSettings({ query: { queryKey: getAdminGetSettingsQueryKey() } });
  const updateMutation = useAdminUpdateSettings();

  const [platformName, setPlatformName] = useState("");
  const [adminPanelEnabled, setAdminPanelEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    if (settings) {
      setPlatformName(settings.platformName ?? "Vande E-Kit");
      setAdminPanelEnabled(settings.adminPanelEnabled ?? true);
      setMaintenanceMode(settings.maintenanceMode ?? false);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(
      { data: { platformName, adminPanelEnabled, maintenanceMode } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getAdminGetSettingsQueryKey() }); toast({ title: "Settings saved" }); } }
    );
  };

  const handleToggleAdminPanel = () => {
    if (adminPanelEnabled) { setShowDisableConfirm(true); } else { setAdminPanelEnabled(true); }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Platform Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure global platform behavior</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Platform Name</label>
              <input value={platformName} onChange={e => setPlatformName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>

            <div className="flex items-center justify-between py-3 border-t border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Admin Panel</p>
                <p className="text-xs text-muted-foreground">Toggle admin portal access</p>
              </div>
              <button onClick={handleToggleAdminPanel} className={`relative h-6 w-11 rounded-full transition-colors ${adminPanelEnabled ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${adminPanelEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Block student access temporarily</p>
              </div>
              <button onClick={() => setMaintenanceMode(!maintenanceMode)} className={`relative h-6 w-11 rounded-full transition-colors ${maintenanceMode ? "bg-yellow-500" : "bg-muted"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${maintenanceMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <button onClick={handleSave} disabled={updateMutation.isPending} className="w-full rounded-lg bg-primary py-2.5 text-sm font-mono font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 uppercase tracking-widest">
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </main>

      {showDisableConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl border border-border bg-card p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
              <h2 className="text-lg font-mono font-bold text-foreground">Disable Admin Panel?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">This will block access to the admin portal. You can re-enable it directly from the database.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDisableConfirm(false)} className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={() => { setAdminPanelEnabled(false); setShowDisableConfirm(false); }} className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-mono font-bold text-white">Disable</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

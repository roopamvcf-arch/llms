import { useState } from "react";
import { StudentSidebar } from "@/components/StudentSidebar";
import { useAuth } from "@/lib/auth";
import { useChangePassword, useUpdateAvatarColor, useGetMyPreferences, useUpdateMyPreferences, getGetMyPreferencesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";

const AVATAR_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#06b6d4", "#f59e0b", "#ef4444"];

export default function StudentSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: prefs } = useGetMyPreferences({ query: { queryKey: getGetMyPreferencesQueryKey() } });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useChangePassword();
  const updateAvatarMutation = useUpdateAvatarColor();
  const updatePrefsMutation = useUpdateMyPreferences();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    changePasswordMutation.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => { toast({ title: "Password updated" }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error, variant: "destructive" })
      }
    );
  };

  const handleAvatarColor = (color: string) => {
    updateAvatarMutation.mutate({ data: { color } }, { onSuccess: () => toast({ title: "Avatar updated" }) });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your account</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Profile</h2>
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-mono font-bold text-white"
                style={{ backgroundColor: user?.avatarColor ?? "#f97316" }}
              >
                {getInitials(user?.username ?? "?")}
              </div>
              <div>
                <p className="font-semibold text-foreground">{user?.username}</p>
                <p className="text-sm text-muted-foreground">{user?.email ?? "No email set"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">Avatar Color</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    data-testid={`color-${color}`}
                    onClick={() => handleAvatarColor(color)}
                    className="h-8 w-8 rounded-full transition-transform hover:scale-110 border-2"
                    style={{ backgroundColor: color, borderColor: user?.avatarColor === color ? "white" : "transparent" }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-3">
              {[
                { label: "Current Password", value: currentPassword, setter: setCurrentPassword, auto: "current-password" },
                { label: "New Password", value: newPassword, setter: setNewPassword, auto: "new-password" },
                { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword, auto: "new-password" },
              ].map(({ label, value, setter, auto }) => (
                <div key={label}>
                  <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
                  <input
                    type="password"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    autoComplete={auto}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-mono font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 uppercase tracking-widest"
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

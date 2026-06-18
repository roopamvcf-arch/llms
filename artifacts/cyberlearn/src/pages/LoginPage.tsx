import { useState } from "react";
import { useLocation } from "wouter";
import { Shield } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (result) => {
          if (result.step === "totp_required") {
            sessionStorage.setItem("tempToken", result.tempToken ?? "");
            setLocation("/admin/totp");
          } else if (result.step === "done" && result.accessToken && result.user) {
            login(result.accessToken, result.user);
            if (result.user.role === "ADMIN") {
              setLocation("/admin/dashboard");
            } else {
              setLocation("/student/dashboard");
            }
          }
        },
        onError: (err: any) => {
          toast({ title: "Login failed", description: err?.data?.error ?? "Invalid credentials", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-mono font-bold text-primary tracking-tight">CyberLearn</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Security training for the modern threat landscape</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                data-testid="input-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                data-testid="input-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              data-testid="button-login"
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-2 w-full rounded-lg bg-primary py-2.5 text-sm font-mono font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors uppercase tracking-widest"
            >
              {loginMutation.isPending ? "Authenticating..." : "Access Terminal"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs text-muted-foreground font-mono">System online • AES-256 encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}

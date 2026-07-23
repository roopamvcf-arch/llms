import { useState } from "react";
import { useLocation } from "wouter";
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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background gradients for premium cyber-aesthetic */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 px-4">
        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-8 shadow-2xl relative">
          {/* Subtle top border highlight */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-primary rounded-t-2xl opacity-80" />

          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-80 items-center justify-center rounded-xl bg-slate-950 p-2 border border-primary/25 shadow-lg shadow-primary/5 transition-transform duration-300 hover:scale-105">
              <img src="/logo.png" alt="VANDE E-KIT Logo" className="h-full w-full object-contain" />
            </div>
            <p className="mt-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Learning Management System</p>
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

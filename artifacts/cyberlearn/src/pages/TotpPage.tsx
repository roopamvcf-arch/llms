import { useState } from "react";
import { useLocation } from "wouter";
import { KeyRound, Shield } from "lucide-react";
import { useVerifyTotp } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function TotpPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const verifyMutation = useVerifyTotp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempToken = sessionStorage.getItem("tempToken") ?? "";
    verifyMutation.mutate(
      { data: { tempToken, totpCode: code } },
      {
        onSuccess: (result) => {
          sessionStorage.removeItem("tempToken");
          if (result.accessToken && result.user) {
            login(result.accessToken, result.user);
            setLocation("/admin/dashboard");
          }
        },
        onError: (err: any) => {
          toast({ title: "Verification failed", description: err?.data?.error ?? "Invalid code", variant: "destructive" });
          setCode("");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-card p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-mono font-bold text-foreground">Two-Factor Auth</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              data-testid="input-totp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-center text-2xl font-mono font-bold text-foreground tracking-[0.5em] placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="000000"
              required
            />
            <button
              data-testid="button-verify-totp"
              type="submit"
              disabled={verifyMutation.isPending || code.length !== 6}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-mono font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors uppercase tracking-widest"
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify Code"}
            </button>
            <button type="button" onClick={() => setLocation("/login")} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

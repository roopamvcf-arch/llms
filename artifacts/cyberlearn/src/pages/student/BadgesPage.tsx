import { Lock, Award } from "lucide-react";
import { StudentSidebar } from "@/components/StudentSidebar";
import { useListBadges, useGetMyBadges, getListBadgesQueryKey, getGetMyBadgesQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function StudentBadgesPage() {
  const { data: allBadges, isLoading: loadingAll } = useListBadges({ query: { queryKey: getListBadgesQueryKey() } });
  const { data: myBadges } = useGetMyBadges({ query: { queryKey: getGetMyBadgesQueryKey() } });

  const earnedIds = new Set((myBadges ?? []).map(b => b.badgeId));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Badge Collection</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(myBadges ?? []).length} / {(allBadges ?? []).length} badges earned
            </p>
          </div>

          {loadingAll ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-36 rounded-xl border border-border bg-card animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(allBadges ?? []).map(badge => {
                const earned = earnedIds.has(badge.id);
                const myBadge = myBadges?.find(b => b.badgeId === badge.id);
                return (
                  <div
                    key={badge.id}
                    data-testid={`badge-${badge.id}`}
                    className={cn(
                      "relative rounded-xl border p-4 text-center transition-all",
                      earned
                        ? "border-green-500/30 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                        : "border-border bg-card opacity-50"
                    )}
                  >
                    {!earned && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                        <Lock className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div
                      className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                      style={{ backgroundColor: (badge.colorHex ?? "#22c55e") + "20", border: `2px solid ${badge.colorHex ?? "#22c55e"}40` }}
                    >
                      {badge.imageUrl ? (
                        <img src={badge.imageUrl} alt={badge.name} className="h-10 w-10 object-contain" />
                      ) : (
                        <Award className="h-7 w-7" style={{ color: badge.colorHex ?? "#22c55e" }} />
                      )}
                    </div>
                    <p className="text-xs font-mono font-bold text-foreground">{badge.name}</p>
                    {badge.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{badge.description}</p>}
                    {earned && myBadge?.earnedAt && (
                      <p className="text-xs text-green-400 mt-1">
                        {new Date(myBadge.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

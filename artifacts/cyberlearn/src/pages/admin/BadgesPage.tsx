import { useState } from "react";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useListBadges, useCreateBadge, useUpdateBadge, useDeleteBadge, getListBadgesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function BadgeForm({ initial, onSubmit, onCancel, loading }: { initial?: any; onSubmit: (d: any) => void; onCancel: () => void; loading: boolean }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [criteriaType, setCriteriaType] = useState(initial?.criteriaType ?? "COURSE_COMPLETE");
  const [criteriaValue, setCriteriaValue] = useState(initial?.criteriaValue ?? "");
  const [colorHex, setColorHex] = useState(initial?.colorHex ?? "#22c55e");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-xl border border-border bg-card p-6 w-full max-w-sm shadow-2xl space-y-3">
        <h2 className="text-lg font-mono font-bold text-foreground">{initial ? "Edit Badge" : "New Badge"}</h2>
        {[
          { label: "Name", value: name, setter: setName },
          { label: "Description", value: description, setter: setDescription },
          { label: "Criteria Value", value: criteriaValue, setter: setCriteriaValue },
        ].map(({ label, value, setter }) => (
          <div key={label}>
            <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
            <input value={value} onChange={e => setter(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Criteria Type</label>
          <select value={criteriaType} onChange={e => setCriteriaType(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            {["COURSE_COMPLETE", "QUIZ_SCORE", "LESSON_COUNT", "STREAK"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)} className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent" />
            <span className="text-sm font-mono text-foreground">{colorHex}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground">Cancel</button>
          <button onClick={() => onSubmit({ name, description, criteriaType, criteriaValue, colorHex })} disabled={loading || !name} className="flex-1 rounded-lg bg-primary py-2 text-sm font-mono font-bold text-primary-foreground disabled:opacity-50">
            {loading ? "..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBadgesPage() {
  const { data: badges, isLoading } = useListBadges({ query: { queryKey: getListBadgesQueryKey() } });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editBadge, setEditBadge] = useState<any | null>(null);

  const createMutation = useCreateBadge();
  const updateMutation = useUpdateBadge();
  const deleteMutation = useDeleteBadge();

  const handleCreate = (data: any) => {
    createMutation.mutate({ data }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListBadgesQueryKey() }); setShowForm(false); toast({ title: "Badge created" }); } });
  };

  const handleUpdate = (data: any) => {
    if (!editBadge) return;
    updateMutation.mutate({ id: editBadge.id, data }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListBadgesQueryKey() }); setEditBadge(null); toast({ title: "Badge updated" }); } });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete badge?")) return;
    deleteMutation.mutate({ id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListBadgesQueryKey() }); toast({ title: "Badge deleted" }); } });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-mono font-bold text-foreground">Badges</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage achievement badges</p>
            </div>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-mono font-bold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> New Badge
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-36 rounded-xl border border-border bg-card animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(badges ?? []).map(badge => (
                <div key={badge.id} data-testid={`badge-${badge.id}`} className="rounded-xl border border-border bg-card p-4 text-center group relative">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditBadge(badge)} className="rounded p-1 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(badge.id)} className="rounded p-1 text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: (badge.colorHex ?? "#22c55e") + "20", border: `2px solid ${badge.colorHex ?? "#22c55e"}40` }}>
                    <Award className="h-7 w-7" style={{ color: badge.colorHex ?? "#22c55e" }} />
                  </div>
                  <p className="text-xs font-mono font-bold text-foreground">{badge.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{badge.criteriaType}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showForm && <BadgeForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} loading={createMutation.isPending} />}
      {editBadge && <BadgeForm initial={editBadge} onSubmit={handleUpdate} onCancel={() => setEditBadge(null)} loading={updateMutation.isPending} />}
    </div>
  );
}

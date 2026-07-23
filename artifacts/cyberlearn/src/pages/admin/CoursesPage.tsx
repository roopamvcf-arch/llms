import { useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useListCourses, useCreateCourse, useUpdateCourse, useDeleteCourse, getListCoursesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { cn, getDifficultyColor } from "@/lib/utils";

import { AssetSelector } from "@/components/AssetSelector";

function CourseForm({ initial, onSubmit, onCancel, loading }: { initial?: any; onSubmit: (data: any) => void; onCancel: () => void; loading: boolean }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "BEGINNER");
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? "");
  const [showAssetSelector, setShowAssetSelector] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-xl border border-border bg-card p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-mono font-bold text-foreground mb-4">{initial ? "Edit Course" : "New Course"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course title" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Network Security" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Thumbnail URL</label>
            <div className="flex gap-2">
              <input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://..." className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button type="button" onClick={() => setShowAssetSelector(true)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono hover:bg-white/5 text-foreground shrink-0">Browse</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
              {["BEGINNER", "INTERMEDIATE", "ADVANCED"].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={() => onSubmit({ title, description, category, difficulty, thumbnailUrl })} disabled={loading || !title} className="flex-1 rounded-lg bg-primary py-2 text-sm font-mono font-bold text-primary-foreground disabled:opacity-50">
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {showAssetSelector && (
        <AssetSelector
          typeFilter="image"
          onSelect={(url) => {
            setThumbnailUrl(url);
            setShowAssetSelector(false);
          }}
          onClose={() => setShowAssetSelector(false)}
        />
      )}
    </div>
  );
}

export default function AdminCoursesPage() {
  const { data: courses, isLoading } = useListCourses({}, { query: { queryKey: getListCoursesQueryKey({}) } });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editCourse, setEditCourse] = useState<any | null>(null);

  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const deleteMutation = useDeleteCourse();

  const handleCreate = (data: any) => {
    createMutation.mutate({ data }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListCoursesQueryKey({}) }); setShowForm(false); toast({ title: "Course created" }); } });
  };

  const handleUpdate = (data: any) => {
    if (!editCourse) return;
    updateMutation.mutate({ id: editCourse.id, data }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListCoursesQueryKey({}) }); setEditCourse(null); toast({ title: "Course updated" }); } });
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    deleteMutation.mutate({ id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListCoursesQueryKey({}) }); toast({ title: "Course deleted" }); } });
  };

  const handleTogglePublish = (course: any) => {
    updateMutation.mutate({ id: course.id, data: { ...course, isPublished: !course.isPublished } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListCoursesQueryKey({}) }) });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-mono font-bold text-foreground">Courses</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{courses?.length ?? 0} courses total</p>
            </div>
            <button data-testid="button-create-course" onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-mono font-bold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> New Course
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />)}</div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-background/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(courses ?? []).map(course => (
                    <tr key={course.id} data-testid={`row-course-${course.id}`} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{course.title}</p>
                        {course.category && <p className="text-xs text-muted-foreground">{course.category}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-mono font-semibold", getDifficultyColor(course.difficulty))}>{course.difficulty}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-mono", course.isPublished ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground")}>
                          {course.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleTogglePublish(course)} title={course.isPublished ? "Unpublish" : "Publish"} className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10">
                            {course.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <Link href={`/admin/courses/${course.id}/edit`}>
                            <button title="Edit content" className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10">
                              <Pencil className="h-4 w-4" />
                            </button>
                          </Link>
                          <button onClick={() => handleDelete(course.id, course.title)} title="Delete" className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(courses ?? []).length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">No courses yet. Create your first one.</div>
              )}
            </div>
          )}
        </div>
      </main>

      {showForm && <CourseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} loading={createMutation.isPending} />}
      {editCourse && <CourseForm initial={editCourse} onSubmit={handleUpdate} onCancel={() => setEditCourse(null)} loading={updateMutation.isPending} />}
    </div>
  );
}

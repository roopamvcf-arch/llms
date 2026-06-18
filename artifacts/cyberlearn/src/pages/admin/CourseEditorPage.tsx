import { useState } from "react";
import { useParams } from "wouter";
import { Plus, ChevronDown, ChevronRight, Video, FileText, HelpCircle, Trash2 } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import {
  useGetCourse, useListModules, useCreateModule, useCreateLesson,
  useDeleteModule, useDeleteLesson,
  getGetCourseQueryKey, getListModulesQueryKey
} from "@workspace/api-client-react";
import type { ModuleWithLessons, Lesson } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const LESSON_TYPE_ICONS: Record<string, any> = { VIDEO: Video, PDF: FileText, QUIZ: HelpCircle };

export default function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id ?? "0");
  const qc = useQueryClient();

  const { data: course } = useGetCourse(courseId, { query: { queryKey: getGetCourseQueryKey(courseId) } });
  const { data: modules } = useListModules(courseId, { query: { queryKey: getListModulesQueryKey(courseId) } });

  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);
  const [addingLessonForModule, setAddingLessonForModule] = useState<number | null>(null);
  const [newLesson, setNewLesson] = useState({ title: "", type: "VIDEO", contentUrl: "" });

  const createModuleMutation = useCreateModule();
  const createLessonMutation = useCreateLesson();
  const deleteModuleMutation = useDeleteModule();
  const deleteLessonMutation = useDeleteLesson();

  const toggleModule = (id: number) => {
    setExpandedModules(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    createModuleMutation.mutate(
      { courseId, data: { title: newModuleTitle, orderIndex: (modules?.length ?? 0) } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getListModulesQueryKey(courseId) }); setNewModuleTitle(""); setAddingModule(false); } }
    );
  };

  const handleAddLesson = (moduleId: number) => {
    if (!newLesson.title.trim()) return;
    createLessonMutation.mutate(
      { moduleId, data: { title: newLesson.title, type: newLesson.type as any, contentUrl: newLesson.contentUrl, orderIndex: 0 } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getListModulesQueryKey(courseId) }); setAddingLessonForModule(null); setNewLesson({ title: "", type: "VIDEO", contentUrl: "" }); } }
    );
  };

  const handleDeleteModule = (moduleId: number) => {
    if (!confirm("Delete module and all its lessons?")) return;
    deleteModuleMutation.mutate({ id: moduleId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListModulesQueryKey(courseId) }) });
  };

  const handleDeleteLesson = (lessonId: number) => {
    if (!confirm("Delete lesson?")) return;
    deleteLessonMutation.mutate({ id: lessonId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListModulesQueryKey(courseId) }) });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-border bg-card overflow-y-auto">
          <div className="border-b border-border p-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Course Editor</p>
            <h2 className="text-sm font-mono font-bold text-foreground mt-1 truncate">{course?.title}</h2>
          </div>
          <div className="p-2">
            {((modules as ModuleWithLessons[]) ?? []).map(module => (
              <div key={module.id} className="mb-1">
                <div className="flex items-center gap-1 rounded-lg hover:bg-white/5 group">
                  <button onClick={() => toggleModule(module.id)} className="flex flex-1 items-center gap-2 px-2 py-2 text-sm text-foreground">
                    {expandedModules.has(module.id) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="font-semibold truncate">{module.title}</span>
                  </button>
                  <button onClick={() => setAddingLessonForModule(module.id)} className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-primary mr-1" title="Add lesson">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteModule(module.id)} className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-red-400 mr-1" title="Delete module">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {expandedModules.has(module.id) && (
                  <div className="ml-5 space-y-0.5">
                    {(module.lessons ?? []).map((lesson) => {
                      const Icon = LESSON_TYPE_ICONS[lesson.type] ?? FileText;
                      return (
                        <div key={lesson.id} className="flex items-center gap-1 rounded-lg hover:bg-white/5 group/lesson">
                          <button onClick={() => setSelectedLesson(lesson)} className="flex flex-1 items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{lesson.title}</span>
                          </button>
                          <button onClick={() => handleDeleteLesson(lesson.id)} className="opacity-0 group-hover/lesson:opacity-100 rounded p-1 text-muted-foreground hover:text-red-400 mr-1">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}

                    {addingLessonForModule === module.id && (
                      <div className="rounded-lg border border-border bg-background p-3 mt-1 space-y-2">
                        <input value={newLesson.title} onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))} placeholder="Lesson title" className="w-full rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none" />
                        <select value={newLesson.type} onChange={e => setNewLesson(p => ({ ...p, type: e.target.value }))} className="w-full rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none">
                          <option value="VIDEO">VIDEO</option>
                          <option value="PDF">PDF</option>
                          <option value="QUIZ">QUIZ</option>
                        </select>
                        <input value={newLesson.contentUrl} onChange={e => setNewLesson(p => ({ ...p, contentUrl: e.target.value }))} placeholder="Content URL" className="w-full rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none" />
                        <div className="flex gap-1">
                          <button onClick={() => setAddingLessonForModule(null)} className="flex-1 rounded py-1 text-xs text-muted-foreground hover:text-foreground border border-border">Cancel</button>
                          <button onClick={() => handleAddLesson(module.id)} disabled={createLessonMutation.isPending} className="flex-1 rounded py-1 text-xs font-bold text-primary-foreground bg-primary">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {addingModule ? (
              <div className="rounded-lg border border-border bg-background p-3 mt-2 space-y-2">
                <input value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="Module title" className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setAddingModule(false)} className="flex-1 rounded-lg border border-border py-1.5 text-sm text-muted-foreground">Cancel</button>
                  <button onClick={handleAddModule} disabled={createModuleMutation.isPending} className="flex-1 rounded-lg bg-primary py-1.5 text-sm font-bold text-primary-foreground">Add</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingModule(true)} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-4 w-4" /> Add Module
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {selectedLesson ? (
            <div className="max-w-lg">
              <h3 className="text-lg font-mono font-bold text-foreground mb-1">{selectedLesson.title}</h3>
              <div className="space-y-3 mt-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Type</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">{selectedLesson.type}</span>
                </div>
                {selectedLesson.contentUrl && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Content URL</p>
                    <p className="text-xs text-foreground break-all font-mono">{selectedLesson.contentUrl}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 opacity-20" />
                <p className="text-sm">Select a lesson to view details</p>
                <p className="text-xs mt-1">Or add modules and lessons using the tree on the left</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

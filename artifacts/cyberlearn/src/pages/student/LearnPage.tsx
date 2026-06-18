import { useState } from "react";
import { useParams } from "wouter";
import { FileText, Video, HelpCircle, StickyNote, X, CheckCircle } from "lucide-react";
import { StudentSidebar } from "@/components/StudentSidebar";
import { VideoWatermark } from "@/components/VideoWatermark";
import { QuizEngine } from "@/components/QuizEngine";
import {
  useGetCourse, useListModules, useGetQuiz, useCompleteLesson, useSubmitQuiz,
  useListVideoNotes, useCreateVideoNote, useDeleteVideoNote,
  getGetCourseQueryKey, getListModulesQueryKey, getGetQuizQueryKey, getListVideoNotesQueryKey
} from "@workspace/api-client-react";
import type { ModuleWithLessons, Lesson } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function LearnPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id ?? "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const { data: course, isLoading: courseLoading } = useGetCourse(courseId, { query: { queryKey: getGetCourseQueryKey(courseId) } });
  const { data: modules } = useListModules(courseId, { query: { queryKey: getListModulesQueryKey(courseId) } });

  const allLessons: Lesson[] = (modules as ModuleWithLessons[] ?? []).flatMap(m => m.lessons ?? []);
  const selectedLesson = allLessons.find(l => l.id === (selectedLessonId ?? allLessons[0]?.id));

  const { data: quiz } = useGetQuiz(selectedLesson?.id ?? 0, {
    query: { enabled: selectedLesson?.type === "QUIZ", queryKey: getGetQuizQueryKey(selectedLesson?.id ?? 0) }
  });

  const { data: videoNotes } = useListVideoNotes(selectedLesson?.id ?? 0, {
    query: { enabled: !!selectedLesson && selectedLesson.type === "VIDEO", queryKey: getListVideoNotesQueryKey(selectedLesson?.id ?? 0) }
  });

  const completeLessonMutation = useCompleteLesson();
  const submitQuizMutation = useSubmitQuiz();
  const createNoteMutation = useCreateVideoNote();
  const deleteNoteMutation = useDeleteVideoNote();

  const handleCompleteLesson = (lessonId: number) => {
    completeLessonMutation.mutate(
      { id: lessonId, data: { completed: true, watchedSeconds: 0 } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
          toast({ title: "Lesson completed!" });
        }
      }
    );
  };

  const handleAddNote = () => {
    if (!selectedLesson || !noteText.trim()) return;
    createNoteMutation.mutate(
      { id: selectedLesson.id, data: { timestampSec: 0, noteText } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListVideoNotesQueryKey(selectedLesson.id) });
          setNoteText("");
        }
      }
    );
  };

  if (courseLoading) {
    return (
      <div className="flex h-screen bg-background">
        <StudentSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <StudentSidebar />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-border bg-card overflow-y-auto shrink-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-mono font-bold text-foreground line-clamp-2">{course?.title}</h2>
          </div>
          <div className="p-2">
            {(modules as ModuleWithLessons[] ?? []).map(module => (
              <div key={module.id} className="mb-2">
                <p className="px-2 py-1.5 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">{module.title}</p>
                {(module.lessons ?? []).map(lesson => {
                  const active = (selectedLesson?.id ?? allLessons[0]?.id) === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors mb-0.5",
                        active ? "bg-primary/15 text-primary" : "text-foreground hover:bg-white/5"
                      )}
                    >
                      {lesson.type === "VIDEO" && <Video className="h-3.5 w-3.5 shrink-0" />}
                      {lesson.type === "PDF" && <FileText className="h-3.5 w-3.5 shrink-0" />}
                      {lesson.type === "QUIZ" && <HelpCircle className="h-3.5 w-3.5 shrink-0" />}
                      <span className="flex-1 truncate">{lesson.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {selectedLesson ? (
            <div className="h-full flex flex-col">
              <div className="border-b border-border px-6 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{selectedLesson.title}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCompleteLesson(selectedLesson.id)}
                    disabled={completeLessonMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs font-mono text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Mark Complete
                  </button>
                  {selectedLesson.type === "VIDEO" && (
                    <button
                      onClick={() => setNotesOpen(!notesOpen)}
                      className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors", notesOpen ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                      Notes
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {selectedLesson.type === "VIDEO" && (
                    <div className="p-6">
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                        {selectedLesson.contentUrl ? (
                          <video src={selectedLesson.contentUrl} controls className="w-full h-full" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Video className="h-12 w-12 opacity-30" />
                          </div>
                        )}
                        <VideoWatermark username={user?.username ?? "user"} />
                      </div>
                    </div>
                  )}

                  {selectedLesson.type === "PDF" && (
                    <div className="p-6 h-full">
                      {selectedLesson.contentUrl ? (
                        <iframe src={selectedLesson.contentUrl} className="w-full h-[70vh] rounded-xl border border-border" title={selectedLesson.title} />
                      ) : (
                        <div className="flex h-48 items-center justify-center rounded-xl border border-border text-muted-foreground">
                          <FileText className="h-8 w-8 opacity-30" />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLesson.type === "QUIZ" && quiz && (
                    <QuizEngine
                      quiz={quiz as any}
                      onSubmit={async (answers) => {
                        const quizAnswers = Object.entries(answers).map(([questionId, selectedOptionIds]) => ({
                          questionId: parseInt(questionId),
                          selectedOptionIds,
                        }));
                        return new Promise((resolve, reject) => {
                          submitQuizMutation.mutate(
                            { id: quiz.id, data: { answers: quizAnswers } },
                            { onSuccess: resolve as any, onError: reject }
                          );
                        });
                      }}
                    />
                  )}
                </div>

                {notesOpen && selectedLesson.type === "VIDEO" && (
                  <aside className="w-80 border-l border-border bg-card overflow-y-auto shrink-0">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <h4 className="text-sm font-mono font-semibold text-foreground">Video Notes</h4>
                      <button onClick={() => setNotesOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4 border-b border-border">
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Add a note..."
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!noteText.trim() || createNoteMutation.isPending}
                        className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-mono font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Add Note
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      {(videoNotes ?? []).map(note => (
                        <div key={note.id} className="rounded-lg border border-border bg-background p-3">
                          <p className="text-xs text-foreground">{note.noteText}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground font-mono">{note.timestampSec}s</span>
                            <button
                              onClick={() => deleteNoteMutation.mutate(
                                { id: note.id },
                                { onSuccess: () => qc.invalidateQueries({ queryKey: getListVideoNotesQueryKey(selectedLesson.id) }) }
                              )}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {(videoNotes ?? []).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
                      )}
                    </div>
                  </aside>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="text-sm">Select a lesson to begin</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

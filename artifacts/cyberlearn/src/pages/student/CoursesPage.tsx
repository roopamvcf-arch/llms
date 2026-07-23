import { useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { StudentSidebar } from "@/components/StudentSidebar";
import { useListCourses, getListCoursesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { cn, getDifficultyColor } from "@/lib/utils";

const DIFFICULTIES = ["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function StudentCoursesPage() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("ALL");

  const { data: courses, isLoading } = useListCourses(
    { search: search || undefined, difficulty: difficulty === "ALL" ? undefined : difficulty },
    { query: { queryKey: getListCoursesQueryKey({ search: search || undefined, difficulty: difficulty === "ALL" ? undefined : difficulty }) } }
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Course Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Master cybersecurity skills at your own pace</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                data-testid="input-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  data-testid={`filter-${d.toLowerCase()}`}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-mono font-semibold transition-colors border",
                    difficulty === d ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-52 rounded-xl border border-border bg-card animate-pulse" />)}
            </div>
          ) : (courses?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No courses found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses?.map(course => (
                <Link key={course.id} href={`/student/courses/${course.id}/learn`}>
                  <div data-testid={`card-course-${course.id}`} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="h-36 w-full object-cover" />
                    ) : (
                      <div className="h-36 w-full bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary/40" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{course.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("text-xs font-mono font-semibold", getDifficultyColor(course.difficulty))}>{course.difficulty}</span>
                        {course.category && <span className="text-xs text-muted-foreground">• {course.category}</span>}
                      </div>
                      {typeof course.progressPercent === "number" && course.progressPercent > 0 ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{course.progressPercent}% complete</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${course.progressPercent}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{course.totalLessons} lessons</span>
                          <span className="text-xs text-muted-foreground">• {course.enrolledCount} enrolled</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

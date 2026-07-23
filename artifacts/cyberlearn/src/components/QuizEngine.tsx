import { useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle, Clock, ChevronRight, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: number;
  optionText: string;
}

interface Question {
  id: number;
  questionText: string;
  type: "MCQ" | "MULTI" | "TRUEFALSE";
  explanation?: string;
  points: number;
  options: Option[];
}

interface Quiz {
  id: number;
  title: string;
  instructions?: string;
  passPercent: number;
  timeLimitSec: number;
  questions: Question[];
}

interface QuizResult {
  score: number;
  maxScore: number;
  passed: boolean;
  breakdown: Record<number, { correct: boolean; correctOptions: number[] }>;
  attemptsLeft: number;
}

interface QuizEngineProps {
  quiz: Quiz;
  onSubmit: (answers: Record<number, number[]>) => Promise<QuizResult>;
  previousAttempts?: number;
}

export function QuizEngine({ quiz, onSubmit, previousAttempts = 0 }: QuizEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimitSec > 0 ? quiz.timeLimitSec : 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (quiz.timeLimitSec > 0 && !result) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quiz.timeLimitSec, result]);

  const question = quiz.questions[currentIndex];

  const toggleOption = (optionId: number) => {
    const qId = question!.id;
    const type = question!.type;
    if (type === "MCQ" || type === "TRUEFALSE") {
      setAnswers(prev => ({ ...prev, [qId]: [optionId] }));
    } else {
      setAnswers(prev => {
        const current = prev[qId] ?? [];
        return { ...prev, [qId]: current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId] };
      });
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await onSubmit(answers);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz.questions.length;

  if (result) {
    const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
    return (
      <div className="space-y-6 p-6">
        <div className={cn("rounded-xl border p-8 text-center", result.passed ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10")}>
          {result.passed ? <Trophy className="mx-auto mb-3 h-12 w-12 text-green-400" /> : <XCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />}
          <h2 className={cn("text-3xl font-mono font-bold mb-2", result.passed ? "text-green-400" : "text-red-400")}>
            {result.passed ? "PASSED" : "FAILED"}
          </h2>
          <p className="text-4xl font-mono font-bold text-foreground mb-1">{pct}%</p>
          <p className="text-muted-foreground text-sm">{result.score}/{result.maxScore} points • {result.attemptsLeft} attempts remaining</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Question Breakdown</h3>
          {quiz.questions.map((q, i) => {
            const br = result.breakdown[q.id];
            return (
              <div key={q.id} className={cn("rounded-lg border p-4", br?.correct ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5")}>
                <div className="flex items-start gap-3">
                  {br?.correct ? <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{i + 1}. {q.questionText}</p>
                    {q.explanation && <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-mono">Question {currentIndex + 1} of {totalQuestions}</span>
          <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentIndex) / totalQuestions) * 100}%` }} />
          </div>
        </div>
        {quiz.timeLimitSec > 0 && (
          <div className={cn("flex items-center gap-1.5 font-mono text-sm", timeLeft < 30 ? "text-red-400" : "text-orange-400")}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-base font-medium text-foreground mb-1">{question.questionText}</p>
        <p className="text-xs text-muted-foreground mb-5">
          {question.type === "MULTI" ? "Select all that apply" : "Select one"}
          {" • "}{question.points} {question.points === 1 ? "point" : "points"}
        </p>

        {question.type === "TRUEFALSE" ? (
          <div className="grid grid-cols-2 gap-3">
            {[{ id: question.options[0]?.id ?? 0, text: "True" }, { id: question.options[1]?.id ?? 1, text: "False" }].map(opt => {
              const selected = (answers[question.id] ?? []).includes(opt.id);
              return (
                <button key={opt.id} onClick={() => toggleOption(opt.id)} className={cn("rounded-lg border p-4 text-center font-mono font-semibold transition-all", selected ? (opt.text === "True" ? "border-green-500 bg-green-500/20 text-green-300" : "border-red-500 bg-red-500/20 text-red-300") : "border-border hover:border-primary/50 text-foreground")}>
                  {opt.text}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {question.options.map(opt => {
              const selected = (answers[question.id] ?? []).includes(opt.id);
              return (
                <button key={opt.id} onClick={() => toggleOption(opt.id)} className={cn("w-full rounded-lg border p-3 text-left text-sm transition-all", selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 text-foreground")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-4 w-4 rounded-full border-2 shrink-0", question.type === "MULTI" ? "rounded" : "rounded-full", selected ? "border-primary bg-primary" : "border-muted-foreground")} />
                    {opt.optionText}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
          Previous
        </button>
        <span className="text-xs text-muted-foreground">{answeredCount}/{totalQuestions} answered</span>
        {currentIndex < totalQuestions - 1 ? (
          <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-mono font-semibold transition-colors">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || answeredCount === 0} className="rounded-lg bg-primary px-4 py-2 text-sm font-mono font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        )}
      </div>
    </div>
  );
}

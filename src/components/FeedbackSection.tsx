import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Send, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { z } from "zod";
import { DB_TABLES, FEEDBACK_FIELD_LIMITS } from "@/config";

export const FEEDBACK_CATEGORIES = ["Bug", "Feedback", "Feature Request"] as const;
type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const feedbackSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(FEEDBACK_FIELD_LIMITS.NAME_MAX_LENGTH, `Name must be less than ${FEEDBACK_FIELD_LIMITS.NAME_MAX_LENGTH} characters`),
  email: z
    .string()
    .trim()
    .max(FEEDBACK_FIELD_LIMITS.EMAIL_MAX_LENGTH, `Email must be less than ${FEEDBACK_FIELD_LIMITS.EMAIL_MAX_LENGTH} characters`)
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  category: z.enum(FEEDBACK_CATEGORIES),
  feedback: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(
      FEEDBACK_FIELD_LIMITS.FEEDBACK_MAX_LENGTH,
      `Comment must be less than ${FEEDBACK_FIELD_LIMITS.FEEDBACK_MAX_LENGTH} characters`,
    ),
});

interface FeedbackEntry {
  id: string;
  name: string;
  category: string;
  feedback: string;
  created_at: string;
}

const PAGE_SIZE = 5;

export const FeedbackSection = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("Bug");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchFeedback = async (pageNum: number) => {
    setLoading(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [{ count }, { data }] = await Promise.all([
      supabase.from(DB_TABLES.USER_FEEDBACK).select("*", { count: "exact", head: true }),
      supabase
        .from(DB_TABLES.USER_FEEDBACK)
        .select("id, name, category, feedback, created_at")
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);

    setTotalCount(count ?? 0);
    setFeedbackList((data as FeedbackEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback(page);
  }, [page]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = feedbackSchema.safeParse({ name, email, category, feedback });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from(DB_TABLES.USER_FEEDBACK).insert({
      name: result.data.name,
      email: result.data.email ? result.data.email : null,
      category: result.data.category,
      feedback: result.data.feedback,
    });

    if (error) {
      toast.error("Failed to submit feedback. Please try again.");
    } else {
      toast.success("Thank you for your feedback!");
      setName("");
      setEmail("");
      setCategory("Bug");
      setFeedback("");
      setOpen(false);
      setPage(0);
      fetchFeedback(0);
    }
    setSubmitting(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const modal = open
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <h2 className="text-base font-semibold">Send feedback</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="fb-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="fb-name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={FEEDBACK_FIELD_LIMITS.NAME_MAX_LENGTH}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <span className="text-sm font-medium">Category</span>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        category === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fb-email" className="text-sm font-medium">
                  Email (optional)
                </label>
                <Input
                  id="fb-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={FEEDBACK_FIELD_LIMITS.EMAIL_MAX_LENGTH}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fb-comment" className="text-sm font-medium">
                  Comment <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="fb-comment"
                  placeholder="Any additional details..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  maxLength={FEEDBACK_FIELD_LIMITS.FEEDBACK_MAX_LENGTH}
                  className="min-h-[96px] resize-none"
                />
                <div className="flex justify-between">
                  {errors.feedback ? (
                    <p className="text-xs text-destructive">{errors.feedback}</p>
                  ) : (
                    <span />
                  )}
                  <p
                    className={`text-xs ${
                      feedback.length > FEEDBACK_FIELD_LIMITS.FEEDBACK_WARNING_THRESHOLD
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {FEEDBACK_FIELD_LIMITS.FEEDBACK_MAX_LENGTH - feedback.length} characters remaining
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit feedback
              </Button>
            </form>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-8">
      {/* Recent Feedback */}
      <Card className="border-border shadow-card">
        <CardHeader className="bg-gradient-to-r from-financial-primary to-financial-success text-primary-foreground rounded-t-lg py-3">
          <CardTitle className="text-xl font-semibold">Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : feedbackList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No feedback yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="space-y-3">
              {feedbackList.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[182px_130px_1fr] gap-x-4 p-3 rounded-lg bg-muted/40 border border-border/30 animate-fade-in items-start"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="shrink-0">
                    <span className="font-medium text-sm">{entry.name}</span>
                    <div className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</div>
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-financial-primary/10 text-financial-primary border border-financial-primary/30">
                      {entry.category}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{entry.feedback}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating feedback button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-financial-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </button>

      {modal}
    </div>
  );
};

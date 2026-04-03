
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  feedback TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feedback"
  ON public.user_feedback
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can submit feedback"
  ON public.user_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

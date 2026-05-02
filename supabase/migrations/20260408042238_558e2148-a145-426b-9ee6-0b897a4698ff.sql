
DROP POLICY "Admins can read feedback" ON public.user_feedback;

CREATE POLICY "Anyone can read feedback"
  ON public.user_feedback
  FOR SELECT
  TO anon, authenticated
  USING (true);

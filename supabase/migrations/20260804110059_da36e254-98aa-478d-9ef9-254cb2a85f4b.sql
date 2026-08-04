ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Feedback';
ALTER TABLE public.user_feedback ALTER COLUMN email DROP NOT NULL;
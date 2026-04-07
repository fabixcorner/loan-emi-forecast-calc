
-- Allow admins to read user_roles
CREATE POLICY "Admins can view roles" ON public.user_roles
AS PERMISSIVE FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow users to see their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

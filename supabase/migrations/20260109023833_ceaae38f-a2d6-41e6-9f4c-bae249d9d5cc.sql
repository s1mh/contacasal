-- Allow deleting profiles
CREATE POLICY "Anyone can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (true);
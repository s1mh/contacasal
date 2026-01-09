-- Add user_id column to profiles table to link profiles to authenticated users
ALTER TABLE public.profiles 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
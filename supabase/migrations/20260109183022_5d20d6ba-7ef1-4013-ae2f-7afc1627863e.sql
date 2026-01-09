-- Add username column with unique constraint
ALTER TABLE public.profiles 
ADD COLUMN username VARCHAR(32);

-- Create unique index for username
CREATE UNIQUE INDEX idx_profiles_username ON public.profiles(username);

-- Create unique index for email (case insensitive, only for non-null emails)
CREATE UNIQUE INDEX idx_profiles_email_unique ON public.profiles(LOWER(email)) 
WHERE email IS NOT NULL;
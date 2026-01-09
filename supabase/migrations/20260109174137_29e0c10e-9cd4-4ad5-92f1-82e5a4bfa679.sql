-- Add pin_code column to profiles table for multi-device authentication
ALTER TABLE public.profiles 
ADD COLUMN pin_code VARCHAR(4);
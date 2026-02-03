-- Remove FK constraint on user_id since anonymous users may not always exist
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
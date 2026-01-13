-- Add profile and cover image columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_image text,
ADD COLUMN IF NOT EXISTS cover_image text;
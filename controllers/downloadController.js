/**
 * downloadController.js - DEPRECATED
 *
 * Direct authenticated access to Supabase Storage files is now handled via full URLs
 * returned in task endpoints (csv_download_url and json_download_url).
 * Frontend should use these URLs with the user's JWT for downloads.
 *
 * Signed URL generation has been removed to simplify and secure access.
 * Ensure Supabase Storage bucket 'user-tasks-store' has appropriate policies:
 * - Authenticated users can read objects where path starts with their user_id.
 * Example policy: auth.uid()::text = split_part(name, '/', 1)
 */
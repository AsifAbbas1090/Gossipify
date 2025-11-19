# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and anon key (for client)
4. Get your service_role key (for server-side operations only - NEVER expose to client)

## 2. Storage Bucket Setup

### Create Storage Bucket

```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('encrypted-media', 'encrypted-media', false);
```

### Storage Bucket Policies

```sql
-- Allow authenticated users to upload encrypted files
CREATE POLICY "Users can upload encrypted media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'encrypted-media');

-- Allow users to read their own encrypted files
CREATE POLICY "Users can read encrypted media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'encrypted-media');

-- Allow users to delete their own encrypted files
CREATE POLICY "Users can delete encrypted media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'encrypted-media');
```

## 3. Database Schema

See `supabase/schema.sql` for complete schema.

## 4. Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
# Service role key should ONLY be used server-side
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 5. RLS Policies

All policies are included in `supabase/schema.sql`. Key points:
- Users can only see messages they sent or received
- Users can only see their own profile
- Blocked users cannot send messages to each other
- Storage access is restricted to authenticated users


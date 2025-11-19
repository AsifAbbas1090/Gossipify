# Supabase bytea Handling

## Important Note

Supabase PostgREST returns `bytea` columns as **base64-encoded strings** by default, not as `Uint8Array`.

When inserting, you can send:
1. Base64 string (recommended) - Supabase converts to bytea
2. Uint8Array - Supabase converts to bytea

When reading, Supabase returns base64 strings for bytea columns.

## Current Implementation

The code handles this by:
- **Inserting**: Sending base64 strings directly (Supabase handles conversion)
- **Reading**: Expecting base64 strings from Supabase

If you encounter issues, you may need to create a PostgreSQL function to handle bytea conversion, or use Supabase's RPC feature.

## Alternative: Use Text Column

If bytea causes issues, you can change the schema to use `TEXT` instead of `BYTEA`:

```sql
ALTER TABLE messages 
  ALTER COLUMN ciphertext TYPE TEXT,
  ALTER COLUMN nonce TYPE TEXT;
```

Then store base64 strings directly. This is simpler but less efficient.


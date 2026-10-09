# Profile photo storage and cleanup

Trustee/key-member, donor and team profile changes enqueue cleanup in the same
database transaction as the profile update or deletion. Only after commit does
the worker check every media reference and delete an unused file. Images still
used by another record are retained. Removing a photo, replacing it with a URL,
replacing it with a base64 upload and deleting the profile use the same logic.

Local cleanup checks all three managed copies: the configured `UPLOAD_DIR`,
the API's `uploads` directory and `public/uploads`. Original source photos and
website fallback portraits outside those directories are retained. Traversal
paths and unrelated external URLs cannot be deleted.

## Production configuration

The connected Vercel Blob store is `anjanadham-profile-images`. Configure:

- `PROFILE_BLOB_BASE_URL`: the HTTPS public origin of this project's Blob store.
- `BLOB_READ_WRITE_TOKEN`: the connected store's secret, available only to the API.
- `CRON_SECRET`: a random secret used by Vercel to authenticate the daily cleanup.

New processed portraits retain their exact bytes. They are stored under
`uploads/portraits` (base64 key-member photos under `uploads/key_members`).
Their existing `/uploads/...` URLs are preserved; the API redirects these paths
to Blob with `Cache-Control: no-store`. No frontend image-host change is required.
Vercel profile uploads fail explicitly if persistent storage is not configured.

Run `node scripts/migrateProfileStorage.js` before removing bundled production
portrait copies. It copies currently referenced profile images and verifies their
SHA-256 hashes without updating any profile records. `.vercelignore` excludes
profile images from both `uploads` and `public/uploads`. Redeploy the API after
migration so these URLs reach the API instead of an immutable deployment asset.
Local copies remain available for development and are included in local cleanup.

## Retries and abandoned uploads

The `profile_file_cleanup` table is created automatically. A failed storage or
database reference check retains the job for retry and records its error; cleanup
never proceeds when reference checks fail. The worker runs after profile changes
and once daily through `/api/v1/media/cleanup` (Vercel cron). An authenticated
admin can also POST to that route to retry eligible jobs. No mail is sent.
Local servers also process pending jobs every five minutes.

New uploads receive a cleanup job due after 24 hours. Files saved to a record are
retained; abandoned files are removed. The admin's existing cleanup endpoint can
remove unused uploads immediately when editing is cancelled. Already cached
browser/Next.js images and files in older immutable deployments are not erased by
object deletion; this feature deletes the active storage object and local copies.

Run isolated verification with `node --test test/profileCleanup.test.js`. Tests
use mocked database/cloud storage and uniquely named temporary files, without
editing or deleting production profiles.

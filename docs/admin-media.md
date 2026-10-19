# Admin image storage

Images are binary files on the Node backend's persistent volume. MySQL `admin_media` is the registry; Markdown is only an optional export. Existing legacy media routes remain available for older files, videos and documents.

## Deployment on the existing Render backend

1. Attach a persistent disk to the **existing backend service**, mounted at `/var/data`. Configure `UPLOAD_DIR=/var/data/uploads`. A normal container directory is not persistent. Render's free web services do not support persistent disks; filesystem uploads require a service with a disk.
2. Set `PUBLIC_API_URL=https://anjanadhamapi.onrender.com` in that backend's environment. Use the actual API origin, with no `/api`, query, credentials or fragment. Production writes require an absolute `UPLOAD_DIR` and an explicit `PUBLIC_API_URL`. Local development defaults to `./uploads` and `http://localhost:5000`.
3. Run `npm run media:migrate` against the existing MySQL database before serving the new endpoints. This additive migration creates the media registry and its admin-UUID mapping, and registers `media.upload`; it does not reset users, content or role assignments. Super Admin already has access. Grant `media.upload` explicitly to other admin roles that should upload images.
4. Restart the backend and restart/rebuild the website and React admin with their existing API URLs. The website's `API_BASE_URL` includes `/api`; the admin's `REACT_APP_API_URL` is the origin without `/api`.
5. Preserve all existing database, JWT and SMTP settings. Never add uploaded binaries or production secrets to Git.

Render stores files only under the mounted disk path across deployments: <https://render.com/docs/disks>. Configuring a pathname alone does **not** attach a disk. This service does not provision paid infrastructure. Vercel/serverless ephemeral filesystems are not a deployment target for this filesystem service.

## API and UI contract

`POST /api/admin/media` requires the existing Bearer JWT, an active account and `media.upload`. Send one multipart field named `file` and optionally `alt` (up to 300 characters). The response is HTTP 201 with `data.id` and `data.url`, plus MIME type, bytes, dimensions and uploading admin UUID. The returned URL is absolute: `PUBLIC_API_URL + /upload/ + generatedFilename`.

The common React admin image uploader and portrait uploader use this endpoint and keep the returned URL directly as their preview/form value. Videos and PDFs retain their existing upload endpoint. UI validation is a convenience; the backend independently validates all bytes.

`GET /api/admin/media` returns up to 100 published media records, newest first. Non-Super Admin users see their own uploads. `DELETE /api/admin/media/:id` requires the same upload permission and ownership (Super Admin can manage all uploads). Deletion returns HTTP 202: references are checked immediately and unreferenced drafts are queued with a one-hour grace period. Removing an image input is not permission to delete an image used elsewhere.

`GET` and `HEAD /upload/:safeFilename` only read a `published` record with a matching generated UUID `.webp` filename. No directory browsing, arbitrary paths, original client filenames or private files are exposed. Headers include `image/webp`, `nosniff`, an ETag and a one-hour cache with revalidation. Canonical media cannot bypass registry checks through `/uploads/admin-media`, including encoded path aliases. Deleting assets stop being served; previously cached copies can remain visible for the cache lifetime.

The Next.js image configuration allows `/upload/**` and legacy `/uploads/**` on the exact configured API origin. Rebuild/restart Next.js after changing that origin.

## Processing and filesystem boundary

- Input: one JPEG, PNG, WebP or AVIF, at most **5 MiB** (5 × 1024 × 1024 bytes). SVG, GIF, executable and other file data are rejected. Client MIME types and names never select the decoder or stored path.
- Real signatures and Sharp metadata must agree; full decoding must succeed. Animated/multipage inputs are rejected. Sharp input limits cap decoded images at **40 megapixels**. Output fits inside **4096 × 4096**, without enlarging smaller images.
- Images are auto-oriented and re-encoded to WebP. EXIF, GPS, ICC and other unneeded input metadata are not copied. Decode warnings and oversized output are rejected.
- UUID v4 names are generated on the server and written exclusively, synced, without overwriting existing files. Storage is `UPLOAD_DIR/admin-media/`. Directory/file symlinks are rejected and file descriptors are checked before streaming. Only intended public images belong here; keep private files outside every public static root. There is no private-file upload mode on this endpoint.
- At most two multipart image requests are processed concurrently per Node process. Permission checks occur before multipart buffering.

The original user table has integer IDs. `admin_media_admins` maps each account to a stable UUID used by `admin_media.uploaded_by_uuid`, preserving attribution when an account is removed.

## Transactions, retention and recovery

File writes and metadata inserts are coordinated in a database transaction. A confirmed rollback removes its newly written file. A lost commit acknowledgement is reconciled against MySQL before removing anything; an unavailable database defers cleanup rather than risking a published image.

On persistent Node servers, a maintenance task runs every 15 minutes. `npm run media:cleanup` also runs it manually on the **same service and disk**:

- Deletion requests wait one hour, then re-check all known CMS references, including absolute URLs and the overview image collection. Referenced images are retained and checked again later.
- Published registry records are retained until deletion is requested, including images used in external Markdown or other websites that MySQL cannot discover. The shared upload controls request cleanup for abandoned/replaced uploads when forms close normally. Uploads from interrupted browser sessions remain recoverable through the admin list and can be explicitly removed later. If queued cleanup finds a CMS reference, it cancels the cleanup request and retains the published image. Removing an image from CMS content alone does not remove its media-library record; request deletion when it is no longer needed.
- Cleanup marks a record `deleting` before unlinking and `deleted` only after unlinking succeeds. Failed jobs remain retryable and are not public. Deleted metadata remains as an audit trail.
- Files with no registry record are removed only after 24 hours and a successful database lookup. A database outage never causes filesystem orphan deletion. Unknown filenames, symlinks and unrelated/private files are not garbage-collected.

Do not restore missing legacy uploads by assuming their database rows contain binary data. Restore them from backups or re-upload the original image.

## Backups

Keep Render disk snapshots enabled and verify restores periodically. Render documents daily disk snapshots retained for at least seven days. Back up the external MySQL database independently using its managed backup facility or scheduled `mysqldump`; disk snapshots alone do not back up MySQL hosted elsewhere. Maintain an encrypted off-service copy of the media directory and matching database backup according to the trust's retention policy. Quiesce uploads/deletion for a coordinated manual backup/restore and reconcile missing files and registry orphans afterwards. These operational backups must be configured on the deployment; changing application code cannot enable backups for an external account.

## Optional Markdown catalog

Run `npm run media:catalog -- ./new-media-index.md` to create a new Markdown file from published MySQL records. It escapes alt text, uses canonical server-derived URLs and refuses to overwrite an existing file. It contains image references, not binary image data, and is never used as the registry or upload destination. Regenerate it after publishing/removing images.

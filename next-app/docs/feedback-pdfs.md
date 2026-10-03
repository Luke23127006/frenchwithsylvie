# Teacher feedback PDFs

Teachers can attach up to three PDFs (5 MB each) to a student's submission.
A whole-number grade from 0 to 100 is required, including when only a PDF is used
for feedback. Existing written reviews remain supported.

## Deployment

Apply `supabase/migrations/20260913000000_add_feedback_attachments.sql` before
deploying the application changes. It creates the private `feedback` bucket,
attachment metadata, cleanup queue, and atomic review save function.

The server uses `SUPABASE_SERVICE_ROLE_KEY` after validating the app's custom JWT
and submission access. No Supabase Auth session is required. Generic upload
actions are restricted to the existing assignment/submission buckets. Preview
and download links expire after five minutes and are issued on demand.

Set `CRON_SECRET` to a random secret in Vercel. `vercel.json` schedules
`GET /api/feedback/cleanup` daily; Vercel supplies the bearer token. Other hosting
platforms can schedule this endpoint with `Authorization: Bearer <CRON_SECRET>`.
Cleanup also runs after upload/review activity.

Uploads remain unpublished until their PDF contents are validated and the review
transaction commits. Unsaved uploads older than 24 hours are discarded. Deleting
attachment metadata (including cascading submission deletion) queues its storage
file for removal. Final deletion waits until the signed upload token has expired
(125 minutes after creation), then runs on the next cleanup pass. Storage errors
leave queue entries for retry. A signed download link already issued can remain
usable for its five-minute lifetime after a review is removed.

## Validation

Run the focused Jest tests and `e2e/feedback.spec.ts` against the local development
server and local Supabase. The browser test creates disposable accounts and data
with no email settings, then removes its fixtures and uploaded files.

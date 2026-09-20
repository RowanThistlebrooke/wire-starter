# BODY — your first Wire page

**A graph. The readings behind it. Your progress photos.**

[index.html](index.html) is the whole page: plain HTML, CSS and JavaScript, with a pinned Supabase browser client. It starts with measured weight and grows as you add readings. No framework or build step.

## First: log weight

1. Create a Supabase project; leave the optional GitHub repository blank.
2. Run [setup.sql](setup.sql) in SQL Editor once. Set your timezone first. If you already ran the original Wire table SQL, keep it and skip this step.
3. In Authentication → Users, create and confirm your personal user.
4. Host this repo as a static site. On Vercel: framework **Other**, no build command, project root as the output. No environment variables needed.
5. Open the page and connect with your project URL, **publishable key** (`sb_publishable_…`), and that user's email/password.
6. Log your measured weight, choose **kg** or **lbs**, and confirm when you measured it. Save, then refresh: the same reading should remain on the graph and in its history.

The database password is not your login password. Project settings stay in this browser; the signed-in session stays in this tab. This repo contains no personal project address, credentials or readings.

## Optional: progress photos

Run [photos.sql](photos.sql) once in the same project, then use the page's photo option. Existing `events` rows and the weight setup stay unchanged.

- Photos are private and dated. The gallery reads them with your signed-in account.
- Use JPEG, PNG or WebP, up to **6 MiB**. Export HEIC to JPEG first.
- A photo is a visual record; it does not generate body-fat, muscle or weight values.
- Uploads use new paths. Existing photos and event rows are not overwritten or deleted.

The optional SQL is safe to rerun. It stops if an existing bucket has incompatible settings or other Storage policies might grant broader access. It does not silently change those settings.

## What the graph means

Each point is a recorded reading, shown in its original units. Weight in kg and weight in lbs stay separate. Additional BODY measurements can use the same layout, one measurement and unit at a time; they are never averaged into a body score.

Lines connect readings. Dashed spans are more than a day apart and do not fill in missing values. Readings retain both **when measured** and **when saved**. This starter shows the original raw record; it does not apply corrections/voids, estimate values, or claim what caused a change.

## One record, different inputs

**Page → events → BODY.** Future MCP and iOS inputs can append to the same record. They do not need another dashboard.

The page currently implements manual weight logging and optional photo uploads. **An MCP server and an automated iOS logging Shortcut are not included yet.**

A simple optional iOS Shortcut can use **Open URLs** with your deployed page's `/?log=weight` address, then be [added to your Home Screen](https://support.apple.com/guide/shortcuts/apd735880972/ios). The page opens weight entry after sign-in; you still enter and save the reading yourself. Put no keys, passwords or tokens in that URL. This repository does not create or install the Shortcut.

### Shared input contract

All inputs append to `public.events`. Read every page of history in a stable order; a failed page must be shown as an error, never as complete history.

| Field | Measured weight | Progress photo |
| --- | --- | --- |
| `event_type` | `measurement` | `progress_photo` |
| `metric` | `weight` | `body_progress` |
| `value` | User-supplied numeric value | `null` |
| `unit` | `kg` or `lbs`, explicitly supplied | `null` |
| `occurred_at` | User-confirmed measurement time | User-confirmed photo time |
| `source` | `pad` for this page | `pad` for this page |
| `source_id` | Stable UUID for one save/retry | Stable UUID for one save/retry |
| `context` | `{ "area": "body" }` | Fields below |

Photo context contains `area: "body"`, `schema_version: 1`, `bucket: "body-progress"`, `path`, `mime_type`, `bytes` and `sha256`. The path is `<authenticated user ID>/<upload UUID>.<extension>`; it references a private Storage object. Do not store photo bytes, public URLs or expiring signed URLs in the event.

Upload the photo with `upsert: false`, confirm the stored object, then append its event. Reuse the same upload path and source ID when retrying that operation. If upload succeeds but the event fails, retain that pending operation so a retry can finish it; do not replace the image or claim the check-in was saved. The browser downloads photos with authentication into temporary Blob URLs and releases them on sign-out.

Future MCP writes use `source: "claude"`: show the exact proposed rows and save only after the user's approval. Future direct Shortcut writes use `source: "shortcut"`. Both supply the authenticated user's ID and reuse an operation ID for uncertain retries. An assistant transcribes a supplied reading; it never invents a measurement or infers weight from a photo.

## If access fails

Check the project URL and Auth login first. If you used the original table SQL with automatic table exposure disabled, run:

```sql
grant usage on schema public to authenticated;
grant select, insert on public.events to authenticated;
```

Keep row-level security enabled. Only a publishable key belongs in this page; never use a secret or service-role key.

Local preview: run `python3 -m http.server 8796 --bind 127.0.0.1` in this folder and open `http://localhost:8796`. Use HTTP/HTTPS, not a directly opened file.

## Film this

> “This is the output. I log my weight, it becomes a point on my graph, and the reading stays underneath. Over time I can add progress photos. Later, my assistant and a phone shortcut can feed the same record.”

[Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) · [Storage access policies](https://supabase.com/docs/guides/storage/security/access-control) · [Upload](https://supabase.com/docs/reference/javascript/file-buckets-upload) · [Private download](https://supabase.com/docs/reference/javascript/file-buckets-download) · [Public API keys](https://supabase.com/docs/guides/api/api-keys)

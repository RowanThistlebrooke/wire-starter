# Your Wire — Episode 1

One page. Save a real reading, see it on a graph, and keep it in your own database.

The website is **[index.html](index.html)**. It contains the layout, styles and JavaScript. No build command, package install, server function or full dashboard is needed. It loads a pinned version of the Supabase browser client from jsDelivr.

## Start here

1. Create a Supabase project. Leave the optional GitHub repository connection blank.
2. In SQL Editor, run **[setup.sql](setup.sql)** once. Change `Europe/Zurich` to your timezone first; the ledger day starts at 6 a.m. there. If you already ran the original Wire `01_the_table.sql`, keep that table and skip this step.
3. Under Authentication → Users, create your personal user and confirm it.
4. Put this repository on a static host. On Vercel, import the repo, use framework **Other**, no build command, and serve the project root. This starter does not need environment variables.
5. Open the page and select **Connect your Wire**. Enter your Supabase project URL and **publishable key** (`sb_publishable_…`), then the email/password from step 3. The Supabase project's Connect dialog supplies the public settings.
6. Enter a real measurement, its value, unit and when it happened. Select **Save reading**. The graph and saved history read it back from your database. Reload to verify it persists.

Project settings are stored in this browser. Each viewer connects their own project; this repository contains no personal database address, credentials or readings. The Supabase session is kept in session storage for this tab. The password is sent only to the selected Supabase project, then cleared from the form.

## What you are building

**You → an `events` row → your history.**

- A graph shows one measurement and one unit at a time. Different units are kept separate.
- Dots are actual recorded readings. Lines connect those readings; dashed segments span more than a day. They do not supply missing values.
- The selected value is displayed exactly as returned by Postgres, with its occurrence time. The list also shows when each row was saved and its recorded source.
- New readings append rows. Retrying an uncertain save reuses the same ID to prevent an accidental duplicate within this open page.
- History is the raw measurement record. This first lesson does not apply corrections/voids, calculate daily scores, infer trends or claim what caused a change. Notes and other event types are not displayed.
- Every page of history is read; a failed read is shown as an error rather than as an empty or complete record.

There is no example data, tracking or AI connection in this first page. The assistant is the next separate lesson, after the save/read loop works.

## If access fails

First check the project URL and the Auth user you created. A database password is not the Wire login password. If you disabled automatic table exposure and used the older table file, run these grants in SQL Editor:

```sql
grant usage on schema public to authenticated;
grant select, insert on public.events to authenticated;
```

Keep row-level security enabled. Do not use a secret or service-role key in this page.

For local preview, run `python3 -m http.server 8796 --bind 127.0.0.1` from this folder and open `http://localhost:8796`. Use HTTP/HTTPS instead of opening the file directly.

## Film this

> “This is the first version of our system. We can record one thing that actually happened, save it to our own database, and see it here. Every point starts with a reading we supplied. The next piece is letting our assistant use that same record.”

## References

[Supabase tables](https://supabase.com/docs/guides/database/tables) · [Public and secret API keys](https://supabase.com/docs/guides/api/api-keys) · [Auth](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) · [Exact numeric readback](https://docs.postgrest.org/en/v14/references/api/tables_views.html#casting-columns)

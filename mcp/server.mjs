// Your workouts over MCP. Claude reads your sets, and writes only the one you gave it.
//
// Two tools. log_set writes one row into sets, inside today's session, exactly
// as you said it: exercise, weight, unit, reps. recent_sets reads them back.
// There is no update and no delete: the tables have no policy for either. It
// signs in as you with the publishable key, so the same row level security that
// protects the page protects this.
//
// This file is the server and both tools, defined once. api/mcp.mjs serves it
// over HTTP on Vercel, behind WIRE_TOKEN.

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { supabaseUrl, publishableKey, isPublishable, login, missing } from './env.mjs';

export const SOURCE = 'claude';
export const VERSION = '1.0.0';

// A session is one visit to the gym: a set logged within this long of the
// last one joins its session, and a later one starts a new session.
const SESSION_GAP = 3 * 3600e3;
const FUTURE_SLACK = 60000;
const NUMBER = /^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/;

// The page's name rule: lower case, anything else an underscore.
export const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// The set as it would land, or why nothing can be written. Asking this writes
// nothing. weight is kept as the text the user gave, so 82.5 stays 82.5.
export function draftSet({ exercise, weight, unit, reps, performed_at }, now = Date.now()) {
  const e = slug(exercise);
  if (!e) return { error: 'exercise is empty' };
  const w = typeof weight === 'number' ? String(weight) : String(weight ?? '').trim();
  if (!NUMBER.test(w) || !Number.isFinite(Number(w)) || Number(w) < 0) return { error: 'weight must be a number, exactly as the user said it' };
  const u = String(unit ?? '').trim().toLowerCase();
  if (!['kg', 'lbs'].includes(u)) return { error: 'unit is kg or lbs, chosen by the user' };
  if (!Number.isInteger(reps) || reps <= 0) return { error: 'reps is a whole number greater than zero, exactly as the user said' };
  const t = performed_at == null ? now : Date.parse(String(performed_at));
  if (!Number.isFinite(t)) return { error: 'performed_at must be an ISO 8601 timestamp with its zone, or left out for now' };
  if (t > now + FUTURE_SLACK) return { error: 'performed_at is in the future' };
  return { row: { exercise: e, weight: w, unit: u, reps, performed_at: new Date(t).toISOString() } };
}

// One set, one source_id: the same set asked twice, by a retry, lands once.
export const sourceIdOf = row => createHash('sha256')
  .update([row.exercise, row.weight, row.unit, row.reps, row.performed_at].join('\n')).digest('hex').slice(0, 32);

// Sign in on the first question, not at startup. A failed sign in is not kept,
// so the next question tries again. A kept session is dropped after a while.
let db = null, authed = null, since = 0;
const KEEP = 30 * 60000;
async function signIn() {
  const gone = missing();
  if (gone.length) throw new Error('set ' + gone.join(', ') + ' in Vercel, then redeploy');
  if (!db) {
    if (!isPublishable(publishableKey())) throw new Error('SUPABASE_PUBLISHABLE_KEY is not a publishable key');
    db = createClient(supabaseUrl(), publishableKey(), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  }
  if (authed && Date.now() - since > KEEP) authed = null;
  authed = authed || db.auth.signInWithPassword(login()).then(({ data, error }) => {
    if (error || !data?.user?.id) { authed = null; throw new Error('sign in failed: ' + (error ? error.message : 'no user')); }
    since = Date.now();
    return data.user.id;
  });
  return { db, who: await authed };
}
export const signedIn = () => signIn();

const text = o => ({ content: [{ type: 'text', text: JSON.stringify(o, null, 2) }] });
const fail = o => ({ ...text(o), isError: true });
const SET_COLUMNS = 'id,session_id,exercise,weight::text,unit,reps,performed_at,recorded_at,source';

// The session this set belongs to: the latest one, if it started within the gap
// before the set; otherwise a new one that starts when the set was performed.
// Asking this writes nothing; the new session is only proposed.
async function sessionFor(db, who, performed_at) {
  const { data, error } = await db.from('sessions').select('id,started_at').eq('user_id', who)
    .lte('started_at', performed_at).order('started_at', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  const latest = data && data[0];
  if (latest && Date.parse(performed_at) - Date.parse(latest.started_at) <= SESSION_GAP) return { existing: latest };
  return { proposed: { started_at: performed_at, source: SOURCE, source_id: 'session:' + performed_at } };
}

// What log_set would write: the set, and the session it goes in, new or existing.
export async function proposeSet(input) {
  const drafted = draftSet(input);
  if (drafted.error) return { error: 'nothing written: ' + drafted.error };
  const { db, who } = await signIn();
  const session = await sessionFor(db, who, drafted.row.performed_at);
  const set = { ...drafted.row, source: SOURCE, source_id: sourceIdOf(drafted.row) };
  return { who, db, set, session };
}

export async function writeSet(input) {
  const p = await proposeSet(input);
  if (p.error) return p;
  const { db, who, set, session } = p;
  let session_id = session.existing?.id, sessionRow = session.existing || null;
  if (!session_id) {
    const { data, error } = await db.from('sessions').insert({ ...session.proposed, user_id: who }).select('id,started_at').single();
    if (!error) { session_id = data.id; sessionRow = data; }
    else if (error.code !== '23505') return { error: 'nothing written: ' + error.message };
    else {
      // a retry: the same session was already made. Find it, never make another.
      const { data: found, error: e2 } = await db.from('sessions').select('id,started_at').eq('user_id', who).eq('source', SOURCE).eq('source_id', session.proposed.source_id).maybeSingle();
      if (e2 || !found) return { error: 'nothing written: ' + (e2 ? e2.message : error.message) };
      session_id = found.id; sessionRow = found;
    }
  }
  const { data, error } = await db.from('sets').insert({ ...set, session_id, user_id: who }).select(SET_COLUMNS).single();
  if (!error) return { written: data, session: sessionRow };
  if (error.code !== '23505') return { error: 'nothing written: ' + error.message };
  const { data: saved, error: readError } = await db.from('sets').select(SET_COLUMNS).eq('user_id', who).eq('source', SOURCE).eq('source_id', set.source_id).maybeSingle();
  if (readError || !saved) return { error: 'nothing written: ' + (readError ? readError.message : error.message) };
  return { already_saved: saved, session: sessionRow, say: 'this exact set was already in your record; nothing new was written' };
}

export async function readRecent({ days = 7, exercise = null, limit = 200 } = {}) {
  if (!Number.isFinite(days) || days <= 0) return { error: 'days must be a number greater than zero' };
  const { db, who } = await signIn();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let q = db.from('sets').select(SET_COLUMNS).eq('user_id', who).gte('performed_at', since)
    .order('performed_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
  if (exercise) q = q.eq('exercise', slug(exercise));
  const { data, error } = await q;
  if (error) return { error: error.message };
  const sessions = [...new Set(data.map(r => r.session_id))];
  return { days, since, ...(exercise ? { exercise: slug(exercise) } : {}), sets: data.length, sessions: sessions.length, rows: data,
    ...(data.length === limit ? { note: `only the latest ${limit} sets are shown; ask for fewer days or one exercise` } : {}) };
}

export function workoutServer() {
  const server = new McpServer({ name: 'workouts', version: VERSION }, {
    instructions:
      'This is a personal workout record, and it is append only: a set can be added, never edited and never ' +
      'removed. Transcribe only: write the exercise, weight, unit and reps exactly as the user said them, never ' +
      'estimate, round, convert or infer one. If any of the four is missing, ask; silence over a guess. Before ' +
      'any write, call log_set without confirmed to get the exact rows, print them to the user, and call log_set ' +
      'again with confirmed true only after the user says yes. Read recent_sets before asking for anything ' +
      'already in it, and reuse the exercise names it shows instead of inventing new spellings.'
  });

  server.tool(
    'log_set',
    'Write one set the user did as one row in sets: exercise (lowercase with underscores), weight exactly as ' +
    'said, unit kg or lbs, reps as a whole number, and when, which defaults to now. The set goes into the ' +
    'latest session if that started within the last three hours, otherwise into a new session, which is ' +
    'proposed alongside. Without confirmed, nothing is written: the exact rows come back for you to print to ' +
    'the user. Pass confirmed true only after the user has seen those rows and said yes. Never call this with ' +
    'a number you were not given. The same set asked twice lands once.',
    {
      exercise: z.string(),
      weight: z.union([z.number(), z.string()]),
      unit: z.enum(['kg', 'lbs']),
      reps: z.number().int().positive(),
      performed_at: z.string().optional(),
      confirmed: z.boolean().optional()
    },
    async ({ exercise, weight, unit, reps, performed_at, confirmed = false }) => {
      try {
        if (!confirmed) {
          const p = await proposeSet({ exercise, weight, unit, reps, performed_at });
          if (p.error) return fail(p);
          return text({ proposed: { set: p.set, session: p.session.existing ? { existing: p.session.existing } : { new: p.session.proposed } },
            say: 'nothing written yet. Print the set, and the new session if there is one, to the user; call log_set again with confirmed true only if they say yes' });
        }
        const out = await writeSet({ exercise, weight, unit, reps, performed_at });
        return out.error ? fail(out) : text(out);
      } catch (e) { return fail({ error: 'nothing written: ' + e.message }); }
    }
  );

  server.tool(
    'recent_sets',
    'Your sets over the last days, newest first, each with its exercise, weight, unit, reps, when it was ' +
    'performed and its session. Optionally one exercise only. It writes nothing.',
    { days: z.number().optional(), exercise: z.string().optional() },
    async ({ days = 7, exercise }) => {
      try { const out = await readRecent({ days, exercise }); return out.error ? fail(out) : text(out); }
      catch (e) { return fail({ error: e.message }); }
    }
  );

  return server;
}

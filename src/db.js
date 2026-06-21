/**
 * Storage layer with interchangeable drivers, chosen by environment variables
 * (first match wins), each falling back to the next, and finally to local files:
 *
 *   SUPABASE_URL + SUPABASE_SERVICE_KEY   -> Supabase (supabase-js REST client)
 *   DATABASE_URL (or POSTGRES_URL)        -> Postgres (pg, incl. Supabase's own
 *                                            connection string; tables auto-created)
 *   MONGODB_URI                           -> MongoDB
 *   (none)                                -> local JSON files in data/ (zero setup)
 *
 * Every driver exposes the same async API:
 *   init(), insert(coll,doc), list(coll), getById(coll,id),
 *   update(coll,id,patch), count(coll)
 *
 * Supabase & Postgres share one schema: a table per collection with columns
 *   id text primary key, created_at timestamptz, data jsonb
 * The full record is stored in `data`, so the flexible (per-type) shape of
 * registrations/orders is preserved. Filtering/sorting happens in the API layer.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'messianic_movement';

const COLLECTIONS = ['registrations', 'orders', 'expenses'];

function newId() { return crypto.randomBytes(12).toString('hex'); }
function withMeta(doc) {
  return { id: doc.id || newId(), createdAt: doc.createdAt || new Date().toISOString(), ...doc };
}

/* ----------------------------- JSON file driver ---------------------------- */
const DATA_DIR = path.join(__dirname, '..', 'data');
const jsonFile = (c) => path.join(DATA_DIR, `${c}.json`);
function jsonReadAll(c) { try { return JSON.parse(fs.readFileSync(jsonFile(c), 'utf8') || '[]'); } catch (e) { return []; } }
function jsonWriteAll(c, arr) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(jsonFile(c), JSON.stringify(arr, null, 2), 'utf8');
}
const jsonDriver = {
  kind: 'json',
  async init() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); for (const c of COLLECTIONS) if (!fs.existsSync(jsonFile(c))) jsonWriteAll(c, []); },
  async insert(c, doc) { const arr = jsonReadAll(c); const r = withMeta(doc); arr.push(r); jsonWriteAll(c, arr); return r; },
  async list(c) { return jsonReadAll(c); },
  async getById(c, id) { return jsonReadAll(c).find((r) => r.id === id) || null; },
  async update(c, id, patch) { const arr = jsonReadAll(c); const i = arr.findIndex((r) => r.id === id); if (i === -1) return null; arr[i] = { ...arr[i], ...patch }; jsonWriteAll(c, arr); return arr[i]; },
  async count(c) { return jsonReadAll(c).length; },
};

/* ------------------------------ Supabase driver ---------------------------- */
function makeSupabaseDriver() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  return {
    kind: 'supabase',
    async init() {
      // Probe each table so misconfiguration fails fast with a clear message.
      for (const c of COLLECTIONS) {
        const { error } = await sb.from(c).select('id', { count: 'exact', head: true });
        if (error) throw new Error(`table "${c}" not reachable (${error.message}). Run supabase_schema.sql in the Supabase SQL editor.`);
      }
    },
    async insert(c, doc) { const r = withMeta(doc); const { error } = await sb.from(c).insert({ id: r.id, created_at: r.createdAt, data: r }); if (error) throw error; return r; },
    async list(c) { const { data, error } = await sb.from(c).select('data'); if (error) throw error; return (data || []).map((row) => row.data); },
    async getById(c, id) { const { data, error } = await sb.from(c).select('data').eq('id', id).maybeSingle(); if (error) throw error; return data ? data.data : null; },
    async update(c, id, patch) { const cur = await this.getById(c, id); if (!cur) return null; const merged = { ...cur, ...patch }; const { error } = await sb.from(c).update({ data: merged }).eq('id', id); if (error) throw error; return merged; },
    async count(c) { const { count, error } = await sb.from(c).select('id', { count: 'exact', head: true }); if (error) throw error; return count || 0; },
  };
}

/* ------------------------------ Postgres driver ---------------------------- */
function makePgDriver() {
  const { Pool } = require('pg');
  const needsSSL = /sslmode=require/.test(PG_URL) || /supabase\.(co|com|net)/.test(PG_URL) || process.env.PGSSL === 'require';
  const pool = new Pool({ connectionString: PG_URL, ssl: needsSSL ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 8000 });
  return {
    kind: 'postgres',
    async init() {
      for (const c of COLLECTIONS) {
        await pool.query(`create table if not exists ${c} (id text primary key, created_at timestamptz not null default now(), data jsonb not null)`);
      }
    },
    async insert(c, doc) { const r = withMeta(doc); await pool.query(`insert into ${c}(id, created_at, data) values($1,$2,$3::jsonb)`, [r.id, r.createdAt, JSON.stringify(r)]); return r; },
    async list(c) { const { rows } = await pool.query(`select data from ${c}`); return rows.map((row) => row.data); },
    async getById(c, id) { const { rows } = await pool.query(`select data from ${c} where id=$1`, [id]); return rows[0] ? rows[0].data : null; },
    async update(c, id, patch) { const cur = await this.getById(c, id); if (!cur) return null; const merged = { ...cur, ...patch }; await pool.query(`update ${c} set data=$1::jsonb where id=$2`, [JSON.stringify(merged), id]); return merged; },
    async count(c) { const { rows } = await pool.query(`select count(*)::int as c from ${c}`); return rows[0].c; },
  };
}

/* ------------------------------- Mongo driver ------------------------------ */
function makeMongoDriver() {
  let mongoDb = null;
  return {
    kind: 'mongo',
    async init() { const { MongoClient } = require('mongodb'); const client = new MongoClient(MONGODB_URI); await client.connect(); mongoDb = client.db(DB_NAME); },
    async insert(c, doc) { const r = withMeta(doc); await mongoDb.collection(c).insertOne({ ...r }); return r; },
    async list(c) { return mongoDb.collection(c).find({}, { projection: { _id: 0 } }).toArray(); },
    async getById(c, id) { return mongoDb.collection(c).findOne({ id }, { projection: { _id: 0 } }); },
    async update(c, id, patch) { await mongoDb.collection(c).updateOne({ id }, { $set: patch }); return this.getById(c, id); },
    async count(c) { return mongoDb.collection(c).countDocuments(); },
  };
}

/* --------------------------------- selector -------------------------------- */
let driver = null;
async function getDb() {
  if (driver) return driver;
  const candidates = [];
  if (SUPABASE_URL && SUPABASE_KEY) candidates.push(['Supabase', makeSupabaseDriver]);
  if (PG_URL) candidates.push(['Postgres', makePgDriver]);
  if (MONGODB_URI) candidates.push(['MongoDB', makeMongoDriver]);

  for (const [name, make] of candidates) {
    try { const d = make(); await d.init(); driver = d; console.log(`[db] Connected to ${name}`); return driver; }
    catch (e) { console.error(`[db] ${name} init failed, trying next option:`, e.message); }
  }
  driver = jsonDriver; await driver.init();
  console.log('[db] Using local JSON file store (set SUPABASE_URL, DATABASE_URL or MONGODB_URI to use a hosted database)');
  return driver;
}

module.exports = { getDb, newId, COLLECTIONS };

/**
 * Mounts the registration + admin API onto an existing Express app.
 *   mountApi(app)
 *
 * Public:
 *   GET  /api/options                 -> option catalog for the form
 *   POST /api/register                -> create a registration
 *
 * Admin (Bearer token from /api/admin/login):
 *   POST /api/admin/login             -> { token }
 *   GET  /api/admin/summary           -> totals (income, expense, net, counts)
 *   GET  /api/admin/orders            -> filtered income (sales + donations)
 *   GET  /api/admin/expenses          -> filtered expenses
 *   GET  /api/admin/registrations     -> filtered registrations
 *   GET  /api/admin/export            -> CSV of any collection (with filters)
 */
const crypto = require('crypto');
const { getDb } = require('./db');
const { seedIfEmpty } = require('./seed');
const OPTIONS = require('./options');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(16).toString('hex');
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// in-memory token store: token -> expiry. Cleared on restart (acceptable for admin).
const sessions = new Map();

function makeToken() {
  const t = crypto.createHmac('sha256', SESSION_SECRET)
    .update(crypto.randomBytes(24).toString('hex') + Date.now())
    .digest('hex');
  sessions.set(t, Date.now() + TOKEN_TTL_MS);
  return t;
}
function tokenValid(t) {
  const exp = sessions.get(t);
  if (!exp) return false;
  if (Date.now() > exp) { sessions.delete(t); return false; }
  return true;
}
function safeEqual(a, b) {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
function requireAdmin(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tokenValid(token)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

/* ------------------------------- validation -------------------------------- */
function isEmail(s) { return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function idsOf(list) { return new Set(list.map((x) => x.id)); }
const PROGRAM_IDS = idsOf(OPTIONS.PROGRAMS);
const EVENT_IDS = idsOf(OPTIONS.EVENTS);
const ROLE_IDS = idsOf(OPTIONS.VOLUNTEER_ROLES);

function validateRegistration(b) {
  const errors = [];
  if (!b || typeof b !== 'object') return ['Invalid payload'];
  if (!b.fullName || String(b.fullName).trim().length < 2) errors.push('Full name is required');
  if (!isEmail(b.email)) errors.push('A valid email is required');
  if (!['event', 'program', 'volunteer'].includes(b.type)) errors.push('Invalid registration type');
  if (b.type === 'event' && !EVENT_IDS.has(b.event)) errors.push('Please choose a valid event');
  if (b.type === 'program' && !PROGRAM_IDS.has(b.program)) errors.push('Please choose a valid program');
  if (b.type === 'volunteer' && !ROLE_IDS.has(b.role)) errors.push('Please choose a valid volunteer role');
  return errors;
}

/* --------------------------------- filtering ------------------------------- */
function applyFilters(rows, q) {
  let out = rows.slice();

  // date range on createdAt
  if (q.from) { const f = new Date(q.from).getTime(); out = out.filter((r) => new Date(r.createdAt).getTime() >= f); }
  if (q.to) { const t = new Date(q.to).getTime() + 24 * 60 * 60 * 1000 - 1; out = out.filter((r) => new Date(r.createdAt).getTime() <= t); }

  // exact-match fields
  for (const field of ['type', 'status', 'channel', 'category', 'role', 'program', 'event', 'method']) {
    if (q[field]) out = out.filter((r) => String(r[field] || '').toLowerCase() === String(q[field]).toLowerCase());
  }

  // amount range
  if (q.min) out = out.filter((r) => Number(r.amount || 0) >= Number(q.min));
  if (q.max) out = out.filter((r) => Number(r.amount || 0) <= Number(q.max));

  // free-text search across common fields
  if (q.q) {
    const needle = String(q.q).toLowerCase();
    out = out.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }

  // sort
  const sortBy = q.sort || 'createdAt';
  const dir = (q.order || 'desc') === 'asc' ? 1 : -1;
  out.sort((a, b) => {
    let va = a[sortBy], vb = b[sortBy];
    if (sortBy === 'amount' || sortBy === 'quantity') { va = Number(va || 0); vb = Number(vb || 0); }
    else if (sortBy === 'createdAt') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
    else { va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase(); }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
  return out;
}

function paginate(rows, q) {
  const page = Math.max(1, parseInt(q.page || '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(q.limit || '50', 10)));
  const total = rows.length;
  const start = (page - 1) * limit;
  return { page, limit, total, pages: Math.ceil(total / limit) || 1, rows: rows.slice(start, start + limit) };
}

function toCSV(rows) {
  if (!rows.length) return '';
  const cols = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set()));
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

/* ---------------------------------- mount ---------------------------------- */
async function mountApi(app) {
  const db = await getDb();
  if (String(process.env.SEED_SAMPLE_DATA || 'true') !== 'false') {
    await seedIfEmpty(db, { log: console.log });
  }

  // ---- public ----
  app.get('/api/options', (req, res) => res.json(OPTIONS));

  app.post('/api/register', async (req, res) => {
    try {
      const errors = validateRegistration(req.body);
      if (errors.length) return res.status(400).json({ error: errors.join('. ') });
      const b = req.body;
      const record = {
        type: b.type,
        fullName: String(b.fullName).trim(),
        email: String(b.email).trim().toLowerCase(),
        phone: b.phone ? String(b.phone).trim() : '',
        event: b.type === 'event' ? b.event : undefined,
        program: b.type === 'program' ? b.program : undefined,
        role: b.type === 'volunteer' ? b.role : undefined,
        area: b.area || undefined,
        availability: Array.isArray(b.availability) ? b.availability.slice(0, 10) : [],
        attendees: b.attendees ? Math.max(1, parseInt(b.attendees, 10) || 1) : undefined,
        skills: b.skills ? String(b.skills).slice(0, 1000) : '',
        message: b.message ? String(b.message).slice(0, 2000) : '',
        status: 'new',
        source: 'web',
        createdAt: new Date().toISOString(),
      };
      const saved = await db.insert('registrations', record);
      res.json({ ok: true, id: saved.id });
    } catch (e) {
      console.error('register error', e);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  });

  // ---- admin auth ----
  app.post('/api/admin/login', (req, res) => {
    if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin password not configured. Set ADMIN_PASSWORD in .env' });
    const pw = (req.body && req.body.password) || '';
    if (!safeEqual(pw, ADMIN_PASSWORD)) return res.status(401).json({ error: 'Incorrect password' });
    res.json({ token: makeToken(), expiresIn: TOKEN_TTL_MS });
  });

  // ---- admin data ----
  app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    const rows = applyFilters(await db.list('orders'), req.query);
    res.json(paginate(rows, req.query));
  });

  app.get('/api/admin/expenses', requireAdmin, async (req, res) => {
    const rows = applyFilters(await db.list('expenses'), req.query);
    res.json(paginate(rows, req.query));
  });

  app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
    const rows = applyFilters(await db.list('registrations'), req.query);
    res.json(paginate(rows, req.query));
  });

  app.get('/api/admin/summary', requireAdmin, async (req, res) => {
    const orders = applyFilters(await db.list('orders'), req.query);
    const expenses = applyFilters(await db.list('expenses'), req.query);
    const paid = (r) => r.status === 'paid';
    const sum = (arr) => arr.reduce((s, r) => s + Number(r.amount || 0), 0);

    const sales = orders.filter((o) => o.type === 'sale');
    const donations = orders.filter((o) => o.type === 'donation');
    const incomeTotal = sum(orders.filter(paid));
    const expenseTotal = sum(expenses.filter(paid));

    // income grouped by month for a simple chart
    const byMonth = {};
    for (const o of orders.filter(paid)) {
      const m = new Date(o.createdAt).toISOString().slice(0, 7);
      byMonth[m] = byMonth[m] || { month: m, income: 0, expense: 0 };
      byMonth[m].income += Number(o.amount || 0);
    }
    for (const e of expenses.filter(paid)) {
      const m = new Date(e.createdAt).toISOString().slice(0, 7);
      byMonth[m] = byMonth[m] || { month: m, income: 0, expense: 0 };
      byMonth[m].expense += Number(e.amount || 0);
    }
    const months = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      currency: 'USD',
      incomeTotal,
      expenseTotal,
      net: incomeTotal - expenseTotal,
      counts: {
        orders: orders.length,
        sales: sales.length,
        donations: donations.length,
        expenses: expenses.length,
        registrations: (await db.list('registrations')).length,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        refundedOrders: orders.filter((o) => o.status === 'refunded').length,
      },
      salesTotal: sum(sales.filter(paid)),
      donationsTotal: sum(donations.filter(paid)),
      months,
    });
  });

  app.get('/api/admin/export', requireAdmin, async (req, res) => {
    const coll = ['orders', 'expenses', 'registrations'].includes(req.query.collection) ? req.query.collection : 'orders';
    const rows = applyFilters(await db.list(coll), req.query);
    const csv = toCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${coll}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  });

  console.log('[api] registration + admin API mounted');
}

module.exports = { mountApi };

/**
 * Seeds realistic SAMPLE data so the admin dashboard is populated out of the box.
 * Only runs when a collection is empty, so it never overwrites real data.
 *
 * Income lives in `orders` (type: 'sale' | 'donation'); outflow in `expenses`.
 * All amounts are in USD to match the existing Stripe donation flow.
 *
 * When you switch on real payments, real records simply accumulate alongside —
 * or clear these by emptying the collections.
 */
const SAMPLE_FLAG = 'sample';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgoISO(maxDays) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, maxDays));
  d.setHours(randInt(7, 21), randInt(0, 59), 0, 0);
  return d.toISOString();
}

const FIRST = ['John', 'Mary', 'David', 'Grace', 'Samuel', 'Esther', 'Daniel', 'Ruth', 'Peter', 'Sarah', 'Emmanuel', 'Joy', 'Michael', 'Faith', 'Joseph', 'Deborah', 'Paul', 'Hannah', 'Stephen', 'Rebecca'];
const LAST = ['Okafor', 'Adeyemi', 'Bello', 'Eze', 'Musa', 'Okon', 'Ibrahim', 'Nwosu', 'Abubakar', 'Chukwu', 'Lawal', 'Ojo', 'Danjuma', 'Akpan', 'Yusuf'];
function person() {
  const f = pick(FIRST), l = pick(LAST);
  return { name: `${f} ${l}`, email: `${f.toLowerCase()}.${l.toLowerCase()}@example.com` };
}

const STORE_ITEMS = [
  { name: 'Daily Fire Devotional', price: 25 },
  { name: 'Leadership Bundle', price: 120 },
  { name: 'Prayers That Move Mountains', price: 18 },
  { name: 'Zion Worship CD', price: 15 },
  { name: 'Regeneration T-Shirt', price: 35 },
  { name: 'The Manual (Discipleship)', price: 40 },
  { name: 'Holy Land Tour Deposit', price: 500 },
];
const DONATION_CATEGORIES = ['General Fund', 'World Bible Education', 'Compassion Works', 'Building Project', 'Global Missions', 'Prayer Force'];
const EXPENSE_CATEGORIES = [
  { category: 'Outreach & Crusade', payees: ['Crusade Logistics', 'PA System Rental', 'Transport'] },
  { category: 'Media & Production', payees: ['Camera Equipment', 'Streaming Service', 'Editing Software'] },
  { category: 'Compassion / Charity', payees: ['Food Bank', 'Orphanage Support', 'Medical Outreach'] },
  { category: 'Facilities', payees: ['Generator Fuel', 'Venue Maintenance', 'Utilities'] },
  { category: 'Staff & Stipends', payees: ['Ministry Stipends', 'Volunteer Welfare'] },
  { category: 'Printing & Materials', payees: ['Book Printing', 'Flyers & Banners'] },
];
const CHANNELS = ['Online (Card)', 'Bank Transfer', 'Cash', 'POS'];

async function seedIfEmpty(db, opts = {}) {
  const log = opts.log || (() => {});

  // ---- Income: store sales + donations ----
  if ((await db.count('orders')) === 0) {
    const orders = [];
    // store sales
    for (let i = 0; i < 55; i++) {
      const item = pick(STORE_ITEMS);
      const qty = randInt(1, 3);
      const p = person();
      orders.push({
        type: 'sale',
        reference: 'ORD-' + randInt(10000, 99999),
        item: item.name,
        category: 'Store',
        quantity: qty,
        amount: item.price * qty,
        currency: 'USD',
        customerName: p.name,
        customerEmail: p.email,
        channel: pick(CHANNELS),
        status: pick(['paid', 'paid', 'paid', 'pending', 'refunded']),
        source: SAMPLE_FLAG,
        createdAt: daysAgoISO(90),
      });
    }
    // donations (income)
    for (let i = 0; i < 45; i++) {
      const p = person();
      orders.push({
        type: 'donation',
        reference: 'DON-' + randInt(10000, 99999),
        item: pick(DONATION_CATEGORIES),
        category: 'Donation',
        quantity: 1,
        amount: pick([10, 20, 25, 50, 75, 100, 150, 250, 500]),
        currency: 'USD',
        customerName: p.name,
        customerEmail: p.email,
        channel: pick(CHANNELS),
        freq: pick(['once', 'once', 'monthly', 'yearly']),
        status: pick(['paid', 'paid', 'paid', 'paid', 'pending']),
        source: SAMPLE_FLAG,
        createdAt: daysAgoISO(90),
      });
    }
    for (const o of orders) await db.insert('orders', o);
    log(`[seed] inserted ${orders.length} sample income records (sales + donations)`);
  }

  // ---- Outflow: expenses ----
  if ((await db.count('expenses')) === 0) {
    const expenses = [];
    for (let i = 0; i < 16; i++) {
      const ec = pick(EXPENSE_CATEGORIES);
      expenses.push({
        reference: 'EXP-' + randInt(10000, 99999),
        category: ec.category,
        payee: pick(ec.payees),
        amount: randInt(40, 450),
        currency: 'USD',
        method: pick(['Bank Transfer', 'Cash', 'Cheque', 'Card']),
        status: pick(['paid', 'paid', 'paid', 'pending']),
        source: SAMPLE_FLAG,
        createdAt: daysAgoISO(90),
      });
    }
    for (const e of expenses) await db.insert('expenses', e);
    log(`[seed] inserted ${expenses.length} sample expense records`);
  }

  // ---- A few sample registrations ----
  if ((await db.count('registrations')) === 0) {
    const samples = [
      { type: 'volunteer', role: 'worship_music', area: 'Worship, Media & Ushering', availability: ['weekends', 'services'] },
      { type: 'volunteer', role: 'media_production', area: 'Worship, Media & Ushering', availability: ['events'] },
      { type: 'event', event: 'crusade_2026', attendees: 2 },
      { type: 'program', program: 'ministry_school' },
      { type: 'volunteer', role: 'compassion', area: 'Prayer & Outreach', availability: ['weekdays'] },
      { type: 'event', event: 'divine_encounter', attendees: 1 },
    ];
    for (const s of samples) {
      const p = person();
      await db.insert('registrations', {
        ...s,
        fullName: p.name,
        email: p.email,
        phone: '+234' + randInt(7000000000, 9099999999),
        status: 'new',
        source: SAMPLE_FLAG,
        createdAt: daysAgoISO(45),
      });
    }
    log(`[seed] inserted ${samples.length} sample registrations`);
  }
}

module.exports = { seedIfEmpty, SAMPLE_FLAG };

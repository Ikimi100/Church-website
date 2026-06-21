# Messianic Movement — Backend, Registrations & Admin Dashboard

This adds three things to the existing site:

1. **Registration form** (`/register.html`) — visitors register to **attend an event**, **join a program/ministry**, or **volunteer to serve**. Submissions are saved to the database.
2. **Admin dashboard** (`/admin.html`) — password-protected. Shows **sales & donations (money in)**, **expenses (money out)**, **net balance**, a month-by-month chart, and the **registrations** list — with advanced filters, sorting, pagination, and CSV export.
3. **API** on top of the existing Express donation server (`server.js`).

> The existing **donations + Stripe** flow is untouched and still works.

---

## Quick start (local)

```bash
npm install
cp .env.example .env        # then edit .env (at minimum set ADMIN_PASSWORD)
npm start
```

Open: http://localhost:3000/ · `/register.html` · `/admin.html`

With **no database configured**, data is stored in local JSON files under `data/`,
so everything runs immediately. The admin is pre-filled with **sample** sales,
donations and expenses so you can see it working.

---

## Choosing a database

The backend auto-selects a driver from your `.env` (first match wins), and falls
back to local files if none is set or a connection fails. Pick **one**:

### Option A — Supabase (recommended)

1. Create a project at https://supabase.com .
2. In the Supabase **SQL editor**, run the contents of **`supabase_schema.sql`**
   (creates the `registrations`, `orders`, `expenses` tables).
3. In **Project Settings → API**, copy the **Project URL** and the **service_role** key.
4. In `.env`:
   ```
   SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   SUPABASE_SERVICE_KEY=YOUR-SERVICE-ROLE-KEY
   ```
5. `npm start` → you'll see `[db] Connected to Supabase`.

> The **service_role** key bypasses Row Level Security and must stay **server-side
> only** — never put it in any browser/frontend code. It already lives only in `.env`.

### Option B — Postgres connection string

Works with **Supabase's own Postgres connection string**, Neon, Railway, RDS, or a
local Postgres. Tables are **auto-created** on first run — no manual SQL needed.

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```
`npm start` → `[db] Connected to Postgres`. (SSL is enabled automatically for
Supabase/`sslmode=require` hosts.)

> Tip: Supabase gives you both an API (Option A) **and** a Postgres connstring
> (Option B). Either reaches the same data — Option B just skips the schema step.

### Option C — MongoDB Atlas

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
MONGODB_DB=messianic_movement
```

---

## Environment variables

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | **Required.** Password for the admin dashboard. Use a long, private value. |
| `SESSION_SECRET` | Signs admin session tokens. Any long random string. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Supabase driver (Option A). |
| `DATABASE_URL` | Postgres driver (Option B). |
| `MONGODB_URI` / `MONGODB_DB` | MongoDB driver (Option C). |
| `SEED_SAMPLE_DATA` | `true` (default) seeds demo data into empty collections; `false` to stop. |
| `STRIPE_SECRET_KEY`, `SMTP_*`, … | Existing donation/receipt settings (unchanged). |

---

## Going from sample data to real data

Sample sales/donations/expenses are tagged `source: "sample"`. When ready:

- **Registrations** are already real — anything submitted via `/register.html` is stored live.
- **Sales / income / expenses:** clear the demo records (empty the `orders` and
  `expenses` tables/files) and set `SEED_SAMPLE_DATA=false`.
- **Real payments:** wire your store checkout to Stripe (the donation flow shows the
  pattern in `server.js`); paid sessions get written into `orders` and appear in the
  admin automatically. You add your own Stripe keys — never stored in code.

---

## Admin dashboard features

- **Summary cards:** Income (in), Expenses (out), Net balance, Activity counts.
- **Chart:** income vs expense by month.
- **Three tabs:** Sales & Donations, Registrations, Expenses.
- **Advanced filters:** search, type, status, channel/method, date range, min/max amount.
- **Sortable** columns, **pagination**, **CSV export** of the current view.
- Login is a password gate (`ADMIN_PASSWORD`) returning an 8-hour session token.

---

## Deploying (important)

`server.js` is a Node app and needs a **Node host** — Render, Railway, or Hostinger
(see `HOSTING_CHECKLIST.md`). Set the env vars in the host's dashboard; start
command `npm start` (Node 18+).

> **GitHub Pages cannot run this backend** — it only serves static files, so
> `/register.html` submissions and `/admin.html` will not work there. Deploy the
> whole project to a Node host and point your domain at it.

---

## Security notes

- Change `ADMIN_PASSWORD` and `SESSION_SECRET` to strong, private values.
- Keep the Supabase **service_role** key (and all of `.env`) server-side only.
- `.env` and `data/` are already in `.gitignore`. Always serve over HTTPS in production.

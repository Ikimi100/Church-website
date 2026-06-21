# Messianic Movement — Backend, Registrations & Admin Dashboard

This adds three things to the existing site:

1. **Registration form** (`/register.html`) — visitors can register to **attend an event**, **join a program/ministry**, or **volunteer to serve**. Submissions are saved to the database.
2. **Admin dashboard** (`/admin.html`) — password-protected. Shows **sales & donations (money in)**, **expenses (money out)**, **net balance**, a month-by-month chart, and the **registrations** list — all with advanced filters, sorting, pagination, and CSV export.
3. **API** on top of the existing Express donation server (`server.js`).

> The site's existing **donations + Stripe** flow is untouched and still works.

---

## Quick start (local)

```bash
npm install
cp .env.example .env        # then edit .env (at minimum set ADMIN_PASSWORD)
npm start
```

Then open:

- Site:      http://localhost:3000/
- Register:  http://localhost:3000/register.html
- Admin:     http://localhost:3000/admin.html

With no database configured, data is stored in local JSON files under `data/`
so everything works immediately. The admin is pre-filled with **sample**
sales, donations and expenses so you can see it in action.

---

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | **Required.** Password for the admin dashboard. Use a long, private value. |
| `SESSION_SECRET` | Signs admin session tokens. Any long random string. |
| `MONGODB_URI` | Your MongoDB Atlas connection string. **Leave blank to use local JSON files.** |
| `MONGODB_DB` | Database name (default `messianic_movement`). |
| `SEED_SAMPLE_DATA` | `true` (default) seeds demo data into empty collections; set `false` to stop. |
| `STRIPE_SECRET_KEY`, `SMTP_*`, … | Existing donation/receipt settings (unchanged). |

---

## Using a hosted database (MongoDB Atlas)

1. Create a free cluster at https://www.mongodb.com/atlas .
2. Create a database user and allow network access.
3. Copy the connection string and paste it into `.env` as `MONGODB_URI`.
4. Restart the server. You'll see `[db] Connected to MongoDB` in the logs.

Registrations and orders now persist in your cluster instead of local files.

---

## Going from sample data to real data

The dashboard ships with **sample** sales/donations/expenses (each tagged
`source: "sample"`). When you're ready for real numbers:

- **Registrations** are already real — anything submitted via `/register.html` is stored live.
- **Sales / income / expenses:** clear the demo records (empty the `orders` and
  `expenses` collections, or delete the matching JSON files in `data/`), and set
  `SEED_SAMPLE_DATA=false`.
- **Real payments:** wire your store checkout to Stripe (the donation flow already
  shows the pattern in `server.js`). Paid Stripe sessions can be written into the
  `orders` collection the same way donations are, and they'll appear in the admin
  automatically. You add your own Stripe keys — they are never stored in the code.

---

## Admin dashboard features

- **Summary cards:** Income (in), Expenses (out), Net balance, Activity counts.
- **Chart:** income vs expense by month.
- **Three tabs:** Sales & Donations, Registrations, Expenses.
- **Advanced filters:** free-text search, type, status, channel/method, date range, min/max amount.
- **Sortable** columns, **pagination**, and **CSV export** of the current view.
- Login is a password gate (`ADMIN_PASSWORD`) returning a session token valid for 8 hours.

---

## Deploying (important)

`server.js` is a Node app and needs a **Node host** — for example **Render**,
**Railway**, or **Hostinger** (see `HOSTING_CHECKLIST.md`). On any of these:

- Set the environment variables above in the host's dashboard.
- Start command: `npm start` (Node 18+).

> **GitHub Pages cannot run this backend** — it only serves static files. If the
> repo currently auto-deploys to GitHub Pages, that deployment will show the
> pages but `/register.html` submissions and `/admin.html` will not work there.
> Deploy the whole project to a Node host instead, and point your domain at it.

---

## Security notes

- Change `ADMIN_PASSWORD` and `SESSION_SECRET` to strong, private values.
- Keep `.env` and `data/` out of source control (already in `.gitignore`).
- Always serve over HTTPS in production.

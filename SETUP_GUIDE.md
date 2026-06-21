# Setup Guide — Connect Everything to Supabase + Set the Admin Password

Follow these once. Takes ~15 minutes. No coding required — just copy/paste.

---

## What you need first
- **Node.js 18 or newer** installed (check with `node -v`).
- The project folder (this repo) on your computer.
- A free **Supabase** account: https://supabase.com

---

## Part 1 — Create the Supabase database

1. Go to https://supabase.com and **sign in / create an account**.
2. Click **New project**. Give it a name (e.g. `messianic-movement`), set a
   strong **database password** (save it somewhere safe), pick a region close to
   Nigeria, and click **Create new project**. Wait ~1 minute for it to finish.
3. In the left sidebar open the **SQL Editor** → **New query**.
4. Open the file **`supabase_schema.sql`** from this project, copy ALL of it,
   paste it into the editor, and click **Run**. You should see "Success".
   (This creates the `registrations`, `orders`, and `expenses` tables.)
5. In the left sidebar open **Project Settings → API**. Copy these two values:
   - **Project URL**  (looks like `https://abcd1234.supabase.co`)
   - **service_role** key  (under "Project API keys" — click reveal, then copy)

   > ⚠️ The **service_role** key is powerful. Keep it private — it only ever goes
   > in the server's `.env` file, never on the website/frontend.

---

## Part 2 — Create your `.env` file (config + admin password)

1. In the project folder, make a copy of **`.env.example`** and name it **`.env`**.
2. Open `.env` in any text editor and fill in these lines:

   ```
   # Supabase
   SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   SUPABASE_SERVICE_KEY=YOUR-SERVICE-ROLE-KEY

   # Admin dashboard
   ADMIN_PASSWORD=ChooseAStrongPasswordHere
   SESSION_SECRET=any-long-random-text-here
   ```

3. **Set the admin password** = whatever you'll type to log in at `/admin.html`.
   Make it long and private. To generate strong random values you can run either:

   ```
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
   (run it twice — use one result for `ADMIN_PASSWORD` if you want a random one,
   and one for `SESSION_SECRET`).

4. Save the file. **Do not commit `.env` to GitHub** (it's already in `.gitignore`).

---

## Part 3 — Run it

```
npm install
npm start
```

You should see in the terminal:

```
[db] Connected to Supabase
Server listening on http://localhost:3000
```

Then open:
- Registration form → http://localhost:3000/register.html
- Admin dashboard   → http://localhost:3000/admin.html
  (log in with the `ADMIN_PASSWORD` you set)

Submit a test registration on `/register.html`, then refresh the admin — it
appears under **Registrations**, and in Supabase you'll see the row under
**Table Editor → registrations**.

> Tip: to start with a clean slate (no demo sales), set `SEED_SAMPLE_DATA=false`
> in `.env`. To keep the demo numbers while you explore, leave it `true`.

---

## Part 4 — Put it online (so it's not just on your computer)

GitHub Pages can't run a backend. Use a **Node host** — e.g. **Render** (free):

1. Push the project to GitHub.
2. On https://render.com → **New → Web Service** → connect the repo.
3. Build command: `npm install` · Start command: `npm start`.
4. In the service's **Environment** tab, add the SAME variables from your `.env`
   (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`,
   plus your Stripe/SMTP keys when ready).
5. Deploy, then point your domain at the Render URL.

---

## Changing the admin password later

1. Open `.env`, change the `ADMIN_PASSWORD` value, save.
2. Restart the server (`npm start`, or "Manual Deploy/Restart" on Render, or set
   it in the host's Environment tab and redeploy).
3. Everyone is logged out and must use the new password. (Sessions last 8 hours.)

---

## Where real money shows up

- **Donations:** once your Stripe keys are in `.env` and the Stripe webhook points
  to `https://YOUR-DOMAIN/webhook`, every completed donation is automatically saved
  to the `orders` table and appears in the admin under **Sales & Donations** with
  `source: stripe` — and counts toward **Income**.
- **Store sales / expenses:** currently sample data. Wire store checkout to Stripe
  the same way (the donation code in `server.js` is the template), and real sales
  will flow into the same dashboard.

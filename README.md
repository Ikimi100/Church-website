Donation backend and Stripe integration

Setup (local)

1. Install Node.js (recommended v18+)
2. Copy `.env.example` to `.env` and fill values (Stripe keys, SMTP)
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

This will serve your static site files and expose endpoints:
- `POST /create-checkout-session` — create a Stripe Checkout session for one-time or subscription donations
- `POST /webhook` — Stripe webhook endpoint (configure in Stripe dashboard)

Stripe notes:
- For one-time gifts, Checkout is created with inline `price_data` using the passed amount.
- For recurring gifts, create `Price` objects in Stripe (monthly/yearly) and set the IDs in `.env` (`STRIPE_MONTHLY_PRICE_ID`, etc.).
- Configure your webhook endpoint in Stripe to `https://YOUR_DOMAIN/webhook` (or `http://localhost:3000/webhook` for local testing using `stripe listen`)

Email receipts:
- The server uses SMTP credentials from `.env` to send receipts via `nodemailer` when a checkout session completes.

Persistence:
- Donations are appended to `donations.json` in the project root. For production use, replace with a real database.

## Deployment notes
- This app now serves static files from `public/` only. Make sure all pages, CSS, JS, and images are inside `public/`.
- Keep `.env` out of source control and configure sensitive keys using your Hostinger environment settings.
- In production, `STRIPE_WEBHOOK_SECRET` is required and the app exits if it is missing.
- Hostinger should use Node.js 18 or newer.
- Use `npm start` to run the application on Hostinger.

For a detailed Hostinger checklist, see `HOSTING_CHECKLIST.md`.

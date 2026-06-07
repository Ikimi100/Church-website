# Hostinger Deployment Checklist

## Before deployment
- Ensure all website pages, styles, scripts, and assets are located inside `public/`.
- Keep `.env` out of source control. Use `HOSTINGER` environment variables instead.
- Confirm `package.json` includes `start: "node server.js"` and `engines.node: ">=18"`.
- Install dependencies with `npm install`.

## Required environment variables
- `PORT` (Hostinger sets this automatically; use `process.env.PORT` in `server.js`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUCCESS_URL` (e.g. `https://yourdomain.com/donate.html`)
- `CANCEL_URL` (e.g. `https://yourdomain.com/donate.html`)
- `STRIPE_MONTHLY_PRICE_ID` (if recurring donations are enabled)
- `STRIPE_YEARLY_PRICE_ID` (if recurring donations are enabled)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `RECEIPT_FROM`

## Stripe setup
- Create Stripe API keys and add them to Hostinger environment variables.
- Configure Stripe webhook to `https://YOUR_DOMAIN/webhook`.
- Confirm webhook signing secret is present in `STRIPE_WEBHOOK_SECRET`.

## Production hardening
- Do not serve source files from the app root; only `public/` is exposed.
- Keep `donations.json` outside the public site folder.
- Use HTTPS/SSL via Hostinger to protect payments and form submissions.
- Add a privacy policy and donation terms page before going live.

## Startup
- Use `npm start` to run the server.
- Confirm Hostinger uses Node >= 18.
- Verify the site loads `index.html` from `public/` and that `script.js` and `style.css` are served correctly.

## Post-deployment validation
- Visit `https://YOUR_DOMAIN/` and confirm the homepage loads.
- Test the donation flow redirect on `donate.html`.
- Confirm a 404 or redirect on `https://YOUR_DOMAIN/server.js` or `/package.json` (server root should not expose source files).
- Confirm that broken image fallback works if any referenced asset is missing.

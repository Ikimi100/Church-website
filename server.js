require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and performance middlewares. The static pages currently use inline
// scripts/handlers, so the CSP allows them while still limiting remote assets.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
      "img-src": ["'self'", "data:", "https:"],
      "connect-src": ["'self'", "https://api.stripe.com"],
      "frame-src": ["'self'", "https://checkout.stripe.com"]
    }
  }
}));
app.use(compression());

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET) console.warn('Warning: STRIPE_SECRET_KEY not set in .env');
const stripe = STRIPE_SECRET ? require('stripe')(STRIPE_SECRET) : null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve only the `public` directory to avoid exposing source files or dotfiles.
// Move static site files into `public/` before deploying.
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'ignore', index: 'index.html' }));

// Require webhook secret in production to avoid accepting unverified events
if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET must be set in production. Exiting.');
  process.exit(1);
}

// Helper to persist donations (simple JSON file)
function appendDonation(record) {
  const file = path.join(__dirname, 'donations.json');
  let arr = [];
  try { arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); } catch (e) { arr = []; }
  arr.push(record);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf8');
}

// Setup nodemailer transporter if SMTP provided
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

app.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.' });
    }

    const { amount, category, freq, name, email } = req.body;
    const successUrl = (process.env.SUCCESS_URL || `http://localhost:${PORT}`) + '/donate.html?session_id={CHECKOUT_SESSION_ID}&category=' + encodeURIComponent(category || 'general') + '&amount=' + encodeURIComponent(amount || '') + '&freq=' + encodeURIComponent(freq || 'once') + '&email=' + encodeURIComponent(email || '');
    const cancelUrl = (process.env.CANCEL_URL || `http://localhost:${PORT}`) + '/donate.html?canceled=1&category=' + encodeURIComponent(category || 'general') + '&amount=' + encodeURIComponent(amount || '') + '&freq=' + encodeURIComponent(freq || 'once') + '&email=' + encodeURIComponent(email || '');

    if (!amount && (!freq || freq === 'once')) {
      return res.status(400).json({ error: 'Amount required for one-time donations' });
    }

    let session;
    if (!freq || freq === 'once') {
      // one-time payment using inline price_data
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `${category || 'Donation'}` },
            unit_amount: Math.round(Number(amount) * 100)
          },
          quantity: 1
        }],
        mode: 'payment',
        customer_email: email || undefined,
        metadata: { category: category || 'general', freq: 'one-time', donor_name: name || '' },
        success_url: successUrl,
        cancel_url: cancelUrl
      });
    } else {
      // subscription path: requires price IDs configured in .env
      let priceId = null;
      if (freq === 'monthly') priceId = process.env.STRIPE_MONTHLY_PRICE_ID;
      if (freq === 'yearly') priceId = process.env.STRIPE_YEARLY_PRICE_ID;
      if (!priceId) return res.status(400).json({ error: 'No price ID configured for the requested frequency' });

      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        customer_email: email || undefined,
        metadata: { category: category || 'general', freq: freq || 'subscription', donor_name: name || '' },
        success_url: successUrl,
        cancel_url: cancelUrl
      });
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Stripe webhook endpoint (raw body required)
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) {
    return res.status(503).send('Stripe is not configured');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (!webhookSecret) {
      console.error('Received webhook but STRIPE_WEBHOOK_SECRET is not configured. Rejecting.');
      return res.status(400).send('Webhook secret not configured');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event types we care about
  (async () => {
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // fetch session including payment details
        const full = await stripe.checkout.sessions.retrieve(session.id);
        const donation = {
          id: full.id,
          amount_total: full.amount_total || 0,
          currency: full.currency || 'usd',
          customer_email: full.customer_details?.email || full.customer_email || '',
          customer_name: full.customer_details?.name || full.metadata?.donor_name || '',
          category: full.metadata?.category || 'general',
          freq: full.metadata?.freq || 'one-time',
          created: new Date().toISOString()
        };
        appendDonation(donation);

        // send receipt email
        if (transporter && donation.customer_email) {
          const from = process.env.RECEIPT_FROM || 'no-reply@example.com';
          const mail = {
            from,
            to: donation.customer_email,
            subject: 'Thank you for your donation',
            text: `Thank you ${donation.customer_name || ''} for your donation of $${(donation.amount_total/100).toFixed(2)} to ${donation.category}. Receipt ID: ${donation.id}`
          };
          try { await transporter.sendMail(mail); } catch (e) { console.error('Failed to send receipt email', e); }
        }
      }

      // You might also handle invoice.payment_succeeded for subscription renewals

    } catch (e) { console.error('Error handling webhook event', e); }
  })();

  res.json({ received: true });
});

app.listen(PORT, () => console.log(`Donation backend listening on http://localhost:${PORT}`));

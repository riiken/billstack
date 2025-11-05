# 💳 Stripe Integration Plan - BillStack v1.5.0

## Overview

After launching the FREE version (v1.0.0) and gathering users, we'll integrate Stripe to offer premium features.

**Timeline:** 2-3 months after v1.0.0 launch

---

## 🎯 Strategy

### Free Tier (Always Free & Unlimited)
✅ Unlimited invoices
✅ GST compliance
✅ Client & item library
✅ Logo upload
✅ PDF generation
✅ Auto-save drafts
✅ Invoice history

### Pro Tier - ₹299/month or ₹2,999/year (Save 17%)
✨ Payment status tracking
✨ Analytics dashboard
✨ Email invoices directly
✨ Recurring invoice templates
✨ Advanced customization (colors, themes)
✨ Multi-currency support
✨ Priority support

---

## 🏗️ Architecture

### Option 1: Client-Side Only (Simpler)
**Pros:**
- No backend server needed
- Lower costs
- Easier to maintain

**Cons:**
- License validation happens client-side
- Can be bypassed by tech-savvy users
- Limited webhook functionality

**Stack:**
- Stripe Checkout (hosted)
- Chrome extension → Stripe Checkout
- Stripe Customer Portal for subscription management
- License stored in `chrome.storage.sync`

### Option 2: Backend + Extension (Recommended)
**Pros:**
- Secure license validation
- Webhook handling
- Better subscription management
- Can track metrics

**Cons:**
- Need to host backend server
- More complex

**Stack:**
- **Backend:** Node.js + Express
- **Database:** PostgreSQL or MongoDB (for subscriptions)
- **Hosting:** Vercel, Railway, or Render (free tiers available)
- **Stripe:** Checkout + Webhooks + Customer Portal

**We'll use Option 2** for better security and control.

---

## 📂 File Structure (New Files for v1.5.0)

```
gst-invoice-extension/
├── manifest.json (update version to 1.5.0)
├── src/
│   ├── popup/
│   │   ├── popup.js (add Pro feature checks)
│   │   ├── popup.html (update UI for Pro features)
│   │   └── styles.css (Pro badges, premium UI)
│   ├── stripe/ (NEW)
│   │   ├── checkout.js (Stripe Checkout integration)
│   │   ├── subscription.js (Subscription management)
│   │   └── license.js (License validation)
│   └── background/
│       └── background.js (add license sync)
└── backend/ (NEW - Separate repo)
    ├── server.js (Express server)
    ├── routes/
    │   ├── checkout.js (Create Stripe checkout session)
    │   ├── webhook.js (Handle Stripe webhooks)
    │   └── license.js (Validate license)
    ├── models/
    │   └── Subscription.js (Database model)
    └── package.json
```

---

## 🔧 Implementation Steps

### Phase 1: Stripe Account Setup (Week 1)

1. **Create Stripe Account**
   - Sign up at https://stripe.com
   - Complete business verification
   - Enable Indian payments (INR)

2. **Create Products in Stripe Dashboard**
   ```
   Product 1: BillStack Pro - Monthly
   - Price: ₹299/month
   - Recurring: Monthly
   - Product ID: prod_monthly_xxx

   Product 2: BillStack Pro - Annual
   - Price: ₹2,999/year
   - Recurring: Yearly
   - Product ID: prod_annual_xxx
   ```

3. **Get API Keys**
   ```
   Test Mode:
   - Publishable Key: pk_test_xxx
   - Secret Key: sk_test_xxx

   Live Mode (after testing):
   - Publishable Key: pk_live_xxx
   - Secret Key: sk_live_xxx
   ```

### Phase 2: Backend Development (Week 2-3)

**Tech Stack:**
- Node.js + Express
- Stripe Node SDK
- PostgreSQL (for subscriptions)
- Hosted on Vercel/Railway

**Endpoints to Create:**

```javascript
// routes/checkout.js
POST /api/checkout
// Creates Stripe Checkout session
// Returns: checkout URL

// routes/webhook.js
POST /api/webhook
// Handles Stripe events:
// - checkout.session.completed
// - customer.subscription.updated
// - customer.subscription.deleted

// routes/license.js
POST /api/validate-license
// Validates extension license
// Returns: { valid: boolean, plan: 'pro'/'free', expiresAt: Date }

GET /api/subscription/:customerId
// Gets subscription status
// Returns: { active: boolean, plan: string, ... }
```

**Database Schema:**

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  license_key VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL, -- 'monthly' or 'annual'
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due'
  current_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_license_key ON subscriptions(license_key);
CREATE INDEX idx_stripe_customer_id ON subscriptions(stripe_customer_id);
```

### Phase 3: Extension Updates (Week 3-4)

**1. Update manifest.json**
```json
{
  "version": "1.5.0",
  "permissions": [
    "storage",
    "identity" // For user identification
  ],
  "host_permissions": [
    "https://your-backend.com/*"
  ]
}
```

**2. Create License Management UI**

Add to `popup.html`:
```html
<!-- Pro Upgrade Section (Settings) -->
<section class="section">
  <h2>Upgrade to Pro</h2>
  <div id="licenseStatus">
    <!-- If Free -->
    <div class="license-free">
      <p>You're on the FREE plan</p>
      <button id="upgradeToPro" class="btn-primary">
        Upgrade to Pro - ₹299/month
      </button>
    </div>

    <!-- If Pro -->
    <div class="license-pro" style="display: none;">
      <p class="pro-badge">✨ PRO Member</p>
      <p>Plan: <span id="planType">Monthly</span></p>
      <p>Expires: <span id="expiryDate">Jan 1, 2026</span></p>
      <button id="manageSubscription" class="btn-secondary">
        Manage Subscription
      </button>
    </div>
  </div>
</section>
```

**3. Create Stripe Integration (src/stripe/checkout.js)**

```javascript
// src/stripe/checkout.js

const BACKEND_URL = 'https://your-backend.com';

async function createCheckoutSession(plan) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: plan, // 'monthly' or 'annual'
        successUrl: chrome.runtime.getURL('src/popup/success.html'),
        cancelUrl: chrome.runtime.getURL('src/popup/popup.html')
      })
    });

    const { checkoutUrl } = await response.json();

    // Open Stripe Checkout in new tab
    chrome.tabs.create({ url: checkoutUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    showToast('Error creating checkout session', 'error');
  }
}

async function validateLicense() {
  const { licenseKey } = await chrome.storage.sync.get(['licenseKey']);

  if (!licenseKey) {
    return { valid: false, plan: 'free' };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/validate-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('License validation error:', error);
    return { valid: false, plan: 'free' };
  }
}

// Export functions
window.StripeCheckout = {
  createCheckoutSession,
  validateLicense
};
```

**4. Update Popup Logic (popup.js)**

```javascript
// Check Pro status on load
async function checkProStatus() {
  const license = await StripeCheckout.validateLicense();

  if (license.valid && license.plan === 'pro') {
    // Enable Pro features
    enableProFeatures();

    // Update UI
    document.getElementById('licenseStatus').classList.add('pro');
    document.getElementById('planType').textContent = license.planType;
    document.getElementById('expiryDate').textContent = new Date(license.expiresAt).toLocaleDateString();
  } else {
    // Disable Pro features
    disableProFeatures();
  }
}

function enableProFeatures() {
  // Enable payment status dropdown
  document.getElementById('paymentStatus').disabled = false;

  // Show analytics dashboard
  document.getElementById('analyticsBtn').style.display = 'block';

  // Enable other Pro features...
}

// Handle upgrade button
document.getElementById('upgradeToPro').addEventListener('click', () => {
  // Show plan selection modal
  showPlanSelectionModal();
});

function showPlanSelectionModal() {
  // Show modal with Monthly vs Annual choice
  // On selection, call: StripeCheckout.createCheckoutSession('monthly');
}
```

**5. Success Page (src/popup/success.html)**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Welcome to Pro!</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="success-container">
    <h1>🎉 Welcome to BillStack Pro!</h1>
    <p>Your subscription is now active.</p>
    <p>Reopen the extension to access Pro features.</p>
    <button onclick="window.close()">Close</button>
  </div>

  <script>
    // Save license key from URL params
    const params = new URLSearchParams(window.location.search);
    const licenseKey = params.get('license');

    if (licenseKey) {
      chrome.storage.sync.set({ licenseKey }, () => {
        console.log('License key saved');
      });
    }
  </script>
</body>
</html>
```

### Phase 4: Backend Implementation (Week 3)

**server.js (Express):**

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create checkout session
app.post('/api/checkout', async (req, res) => {
  const { plan, successUrl, cancelUrl } = req.body;

  // Get price ID based on plan
  const priceId = plan === 'annual'
    ? process.env.STRIPE_ANNUAL_PRICE_ID
    : process.env.STRIPE_MONTHLY_PRICE_ID;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successUrl}?license={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          plan: plan
        }
      }
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Webhook handler
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

async function handleCheckoutCompleted(session) {
  const licenseKey = crypto.randomBytes(16).toString('hex');
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  await pool.query(`
    INSERT INTO subscriptions
    (stripe_customer_id, stripe_subscription_id, license_key, plan, status, current_period_end)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    session.customer,
    session.subscription,
    licenseKey,
    subscription.metadata.plan,
    subscription.status,
    new Date(subscription.current_period_end * 1000)
  ]);
}

// Validate license
app.post('/api/validate-license', async (req, res) => {
  const { licenseKey } = req.body;

  const result = await pool.query(
    'SELECT * FROM subscriptions WHERE license_key = $1 AND status = $2',
    [licenseKey, 'active']
  );

  if (result.rows.length > 0) {
    const sub = result.rows[0];
    res.json({
      valid: true,
      plan: 'pro',
      planType: sub.plan,
      expiresAt: sub.current_period_end
    });
  } else {
    res.json({ valid: false, plan: 'free' });
  }
});

app.listen(process.env.PORT || 3000);
```

### Phase 5: Testing (Week 4)

**Test Mode Checklist:**
- [ ] Checkout flow works
- [ ] Subscription created in Stripe
- [ ] License key saved
- [ ] Pro features unlock
- [ ] Payment status tracking works
- [ ] Analytics dashboard shows
- [ ] Subscription cancellation works
- [ ] License expires after cancellation

**Test Cards (Stripe):**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### Phase 6: Launch v1.5.0 (Week 5)

1. **Test in production**
2. **Update Chrome Web Store listing**
   - Add "In-app purchases" disclosure
   - Update screenshots showing Pro features
   - Update description
3. **Submit v1.5.0 for review**
4. **Announce Pro tier to existing users**

---

## 💰 Revenue Projections

**Conservative Estimate:**
```
Month 1: 1,000 free users → 10 Pro (1% conversion) = ₹2,990/month
Month 3: 5,000 free users → 75 Pro (1.5% conversion) = ₹22,425/month
Month 6: 10,000 free users → 200 Pro (2% conversion) = ₹59,800/month
Year 1: 20,000 free users → 500 Pro (2.5% conversion) = ₹1,49,500/month
```

**Aggressive Estimate:**
```
Year 1: 50,000 free users → 2,000 Pro (4% conversion) = ₹5,98,000/month
```

---

## 📊 Metrics to Track

**Extension Metrics:**
- Free users
- Pro conversions
- Churn rate
- Feature usage (which Pro features are most used)

**Stripe Metrics:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Customer LTV (Lifetime Value)
- Subscription retention

---

## 🔐 Security Considerations

1. **License Validation:**
   - Always validate server-side
   - Don't trust client-side checks
   - Rate-limit validation API

2. **Webhook Security:**
   - Verify Stripe signature
   - Use webhook secret
   - Log all events

3. **Database:**
   - Use environment variables for secrets
   - Enable SSL for PostgreSQL
   - Regular backups

4. **API:**
   - Rate limiting
   - CORS properly configured
   - HTTPS only

---

## 🚀 Deployment

**Backend Hosting Options:**

1. **Vercel (Recommended - Free tier)**
   - Deploy Node.js/Express
   - PostgreSQL via Vercel Postgres
   - Easy deployment

2. **Railway**
   - PostgreSQL included
   - Free $5/month credits
   - Easy scaling

3. **Render**
   - Free PostgreSQL
   - Auto-deploy from Git

**Environment Variables:**
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ANNUAL_PRICE_ID=price_xxx
DATABASE_URL=postgresql://...
NODE_ENV=production
```

---

## 📝 Chrome Web Store Update

When releasing v1.5.0, update:

**Store Listing:**
```
New in v1.5.0:
✨ Pro tier with premium features
✨ Payment status tracking
✨ Advanced analytics dashboard
✨ Recurring invoice templates
✨ Priority support

Free tier remains unlimited!
```

**Privacy Policy:**
- Add section about Stripe payment processing
- Disclose that payment info is handled by Stripe
- Update data collection (email for subscription management)

---

## 🎯 Success Metrics

**Goals for v1.5.0 (First 3 months):**
- 1-2% conversion rate (free → pro)
- 4.5+ star rating maintained
- <5% monthly churn
- Positive user feedback on Pro features

---

## 📞 Support for Pro Users

- Priority email support (24-hour response)
- Dedicated Slack/Discord channel
- Monthly feature requests review
- Direct input on roadmap

---

## 🗓️ Timeline Summary

| Week | Task |
|------|------|
| 1 | Stripe account setup, create products |
| 2 | Backend development (API endpoints) |
| 3 | Extension updates (UI, Stripe integration) |
| 4 | Testing (test mode) |
| 5 | Production testing, launch v1.5.0 |

**Total: 5 weeks from start to launch**

---

## ✅ Pre-Launch Checklist (v1.5.0)

- [ ] Stripe account verified
- [ ] Products created in Stripe
- [ ] Backend deployed and tested
- [ ] Database configured
- [ ] Webhooks configured
- [ ] Extension updated with Pro features
- [ ] Test mode checkout working
- [ ] License validation working
- [ ] Success/cancel pages working
- [ ] Customer Portal working
- [ ] Privacy policy updated
- [ ] Store listing updated
- [ ] Test with real card (live mode)
- [ ] Ready for launch!

---

**This plan will be executed after v1.0.0 gains traction! 🚀**

For now, focus on launching the FREE version and building your user base.

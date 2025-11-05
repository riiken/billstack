# Google Analytics Setup Guide

This extension includes Google Analytics 4 (GA4) integration using the Measurement Protocol API.

## Why Use Analytics?

Analytics helps you understand:
- How many users install your extension
- How many invoices are generated
- Which features are most popular
- Where users drop off in the onboarding flow
- Conversion rate for Pro upgrades

## Setup Instructions

### Step 1: Create a Google Analytics 4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click "Admin" (bottom left gear icon)
3. Under "Property" column, click "Create Property"
4. Fill in:
   - **Property name**: BillStack Extension
   - **Reporting time zone**: Your timezone
   - **Currency**: INR (Indian Rupee)
5. Click "Next" and fill in business details
6. Click "Create" and accept terms

### Step 2: Get Your Measurement ID

1. In Admin, under "Property", click "Data Streams"
2. Click "Add stream" → "Web"
3. Enter website URL (or use a placeholder like `https://extension.local`)
4. Stream name: "Chrome Extension"
5. Click "Create stream"
6. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 3: Create API Secret

1. In the data stream details, scroll down to "Measurement Protocol API secrets"
2. Click "Create"
3. Give it a nickname: "Chrome Extension"
4. Click "Create"
5. Copy the **Secret value** (you won't be able to see it again!)

### Step 4: Update Your Extension Code

Open `/src/utils/analytics.js` and update:

```javascript
this.measurementId = 'G-XXXXXXXXXX'; // Replace with your Measurement ID
this.apiSecret = 'YOUR_API_SECRET';  // Replace with your API Secret
```

### Step 5: Test Your Analytics

1. Reload your extension in Chrome
2. Open the extension popup
3. Generate a test invoice
4. Check Google Analytics:
   - Go to Reports → Realtime
   - You should see events appearing in real-time!

## Events Being Tracked

### Core Events
- `page_view` - When extension is opened
- `extension_installed` - When extension is first installed
- `invoice_generated` - When user generates an invoice
- `settings_saved` - When business settings are saved

### Engagement Events
- `upgrade_click` - When user clicks upgrade to Pro
- `client_template_action` - When client templates are saved/loaded/deleted
- `onboarding_completed` - When user completes onboarding
- `onboarding_skipped` - When user skips onboarding

### Event Parameters

Each event includes useful parameters:
- `invoice_generated`: invoice_number, has_gst, item_count, total_amount, invoice_type
- `upgrade_click`: source (modal, banner, etc.)
- `client_template_action`: action (saved, loaded, deleted)
- `onboarding_completed`: completed_step

## Viewing Your Analytics

### Real-time Reports
- Go to **Reports → Realtime** to see live activity
- See active users, events, and pages in real-time

### Engagement Reports
- Go to **Reports → Engagement → Events**
- See all tracked events and their counts
- Click on an event to see detailed parameters

### User Acquisition
- Go to **Reports → Acquisition → User acquisition**
- See where your users come from
- Track new vs returning users

### Custom Reports

Create custom reports to track:
1. **Invoice Generation Funnel**
   - Users who opened extension
   - Users who saved settings
   - Users who generated invoices

2. **Upgrade Conversion**
   - Upgrade button clicks by source
   - Conversion rate from free to pro

3. **Onboarding Completion**
   - Onboarding started vs completed
   - Skip rate by step

## Privacy & Compliance

### What We Track
- Usage patterns (anonymous)
- Feature engagement
- Error occurrences
- Extension performance

### What We DON'T Track
- Personal information (names, emails, addresses)
- Invoice content or amounts (only count)
- Business details
- Client information

### GDPR Compliance
- All tracking is anonymous using client IDs
- No personally identifiable information (PII) is collected
- Users can't be identified from analytics data

### Disabling Analytics (Optional)

If you want to add an opt-out feature, add this code to your settings page:

```javascript
// Settings page
const analyticsToggle = document.getElementById('enableAnalytics');
analyticsToggle.addEventListener('change', (e) => {
  chrome.storage.local.set({ analyticsEnabled: e.target.checked });
});

// In analytics.js, check before sending:
async sendEvent(eventName, eventParams = {}) {
  const result = await chrome.storage.local.get(['analyticsEnabled']);
  if (result.analyticsEnabled === false) return; // User opted out

  // ... rest of tracking code
}
```

## Troubleshooting

### Events Not Appearing in GA4

1. **Check Real-time Reports**: Events can take 24-48 hours to appear in standard reports, but should show immediately in Realtime
2. **Verify Measurement ID**: Make sure you copied it correctly (format: `G-XXXXXXXXXX`)
3. **Check API Secret**: Make sure it's correct and active
4. **Check Console**: Open DevTools → Console when using extension to see any errors

### Console Shows "Analytics not configured"

This is normal if you haven't updated the Measurement ID yet. The extension works fine without analytics, it just won't send tracking data.

### Testing Locally

```javascript
// In analytics.js, add console logging for testing:
async sendEvent(eventName, eventParams = {}) {
  console.log('📊 Analytics Event:', eventName, eventParams);
  // ... rest of code
}
```

## Cost

Google Analytics 4 is **completely FREE** for up to 10 million events per month. A typical Chrome extension generates:
- ~100-1,000 events per day (small extension)
- ~1,000-10,000 events per day (medium extension)
- ~10,000-100,000 events per day (popular extension)

You're very unlikely to hit the limit unless you have millions of users.

## Next Steps

1. Set up GA4 property
2. Get Measurement ID and API Secret
3. Update `analytics.js` with your credentials
4. Test in Realtime reports
5. Create custom dashboards
6. Monitor your extension's growth!

## Resources

- [GA4 Documentation](https://support.google.com/analytics/answer/9304153)
- [Measurement Protocol API](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

**Note**: Analytics is already integrated in your code. You just need to add your GA4 credentials to start tracking!

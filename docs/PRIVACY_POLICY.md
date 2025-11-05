# Privacy Policy for BillStack - GST Invoice Generator

**Last Updated:** November 4, 2025

## Introduction

BillStack ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains how BillStack handles your data when you use our Chrome extension.

## Summary

**BillStack does NOT collect, transmit, or store any of your personal data on external servers.** All your data stays on your device.

## Data Storage

### What Data We Store Locally

BillStack stores the following data **locally on your device** using Chrome's storage API:

1. **Business Details:**
   - Business name
   - GSTIN
   - Address
   - Email
   - Phone number
   - Business logo (as base64 encoded image)

2. **Client Information:**
   - Client names
   - Client GSTINs
   - Client addresses
   - Client emails
   - Client states

3. **Invoice Data:**
   - Invoice numbers
   - Invoice dates
   - Invoice items
   - Invoice totals
   - Generated invoice history

4. **Saved Items:**
   - Product/service names
   - Rates
   - Descriptions

5. **Settings:**
   - Invoice prefix
   - Payment terms
   - Last invoice number

### Where Data is Stored

All data is stored in **Chrome's local storage** and **Chrome's sync storage** on your device. This data:
- ✅ Stays on your computer/device
- ✅ Is synced across your Chrome browsers (if Chrome sync is enabled)
- ❌ Is NEVER sent to our servers (we don't have any servers!)
- ❌ Is NEVER shared with third parties
- ❌ Is NEVER sold or monetized

## Data We Do NOT Collect

BillStack does NOT collect:
- ❌ Personal identifiable information (PII)
- ❌ Analytics or usage data
- ❌ Browsing history
- ❌ Cookies
- ❌ IP addresses
- ❌ Location data
- ❌ Any data from other websites or tabs

## Permissions Used

### storage
**Why we need it:** To save your business details, client templates, invoice history, and saved items locally on your device.

**What we do with it:** Store and retrieve your invoice data from Chrome's local storage API. This data never leaves your device.

## Third-Party Services

BillStack currently does NOT use any third-party services, analytics, or tracking tools.

**Future Integration (After Stripe Integration):**
When we add payment features, we will use Stripe for payment processing. At that time:
- Stripe will handle payment information (we won't store card details)
- We will update this privacy policy to reflect Stripe's involvement
- You will be notified before any changes take effect

## Data Security

Your data security is important to us:
- ✅ All data is stored locally using Chrome's secure storage API
- ✅ No network transmission of your invoice data
- ✅ No cloud backups (unless you use Chrome sync)
- ✅ Extension runs in isolated environment

## Your Data Rights

Since all your data is stored locally on your device, YOU have complete control:

### How to View Your Data
Your data is stored in Chrome's storage. You can view it using Chrome DevTools.

### How to Delete Your Data
To delete all your data:
1. Right-click the BillStack extension icon
2. Select "Remove from Chrome"
3. All data will be permanently deleted

Alternatively, clear Chrome extension data:
1. Go to Chrome Settings → Privacy and Security
2. Clear browsing data → Advanced
3. Select "Hosted app data" for the time range
4. Click "Clear data"

### How to Export Your Data
BillStack does not currently have a built-in export feature. All data is stored in Chrome's local storage and can be accessed via Chrome DevTools.

## Children's Privacy

BillStack is not intended for use by children under 13 years of age. We do not knowingly collect data from children.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Updating the "Last Updated" date
- Posting a notice in the extension (for major changes)
- Requiring acceptance of new terms (for significant changes)

## GDPR Compliance

For users in the European Economic Area (EEA):
- ✅ We do not process personal data on external servers
- ✅ Data is stored locally on your device (data controller: you)
- ✅ You have complete control over your data
- ✅ No data transfers outside EEA
- ✅ No profiling or automated decision-making

## CCPA Compliance (California)

For California residents:
- ✅ We do not sell your personal information
- ✅ We do not share your data with third parties
- ✅ You have the right to delete your data (by uninstalling the extension)

## Contact Us

If you have any questions about this Privacy Policy, please contact us:

**Email:** [Your support email]

**GitHub:** [Your GitHub repository URL]

## Open Source

BillStack may be open-sourced in the future. If so, you will be able to review the complete source code to verify our privacy claims.

---

## Technical Details

### Chrome Storage API Usage

**chrome.storage.sync:**
- Used for: Business settings, client templates, saved items, logo
- Limit: 100 KB (enforced by Chrome)
- Synced across: Your Chrome browsers (if Chrome sync enabled)

**chrome.storage.local:**
- Used for: Invoice history, drafts, usage stats
- Limit: 10 MB (enforced by Chrome)
- Stored: Only on local device

### No External Network Requests

BillStack makes **ZERO external network requests**. The only network activity:
- Loading Google Fonts stylesheet (Inter font) - standard web font
- No analytics
- No tracking pixels
- No API calls to external servers

### PDF Generation

PDFs are generated **entirely in your browser** using jsPDF library:
- No server-side processing
- No upload to cloud
- PDF is created locally and downloaded directly

---

**By using BillStack, you acknowledge that you have read and understood this Privacy Policy.**

---

*This privacy policy is effective as of November 4, 2025 and will remain in effect except with respect to any changes in its provisions in the future, which will be in effect immediately after being posted on this page.*

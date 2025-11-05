# Chrome Web Store - Required Fields to Publish

## 🚨 You Need to Fill These Before Publishing

---

## 1️⃣ Account Tab - Contact Email

**What to do:**
1. Go to **Account** tab in Chrome Web Store Dashboard
2. Enter your email address
3. Click "Verify Email"
4. Check your email inbox
5. Click verification link

**Email to use:**
```
[Your email address - e.g., youremail@gmail.com]
```

---

## 2️⃣ Privacy Practices Tab

Go to the **Privacy practices** tab and fill in the following:

### A. Single Purpose Description

**Field:** "Single purpose description"

**What to enter (copy-paste this):**
```
Generate GST-compliant invoices with automatic tax calculations and PDF export for Indian businesses.
```

**Character limit:** 180 characters
**This is:** A clear, concise description of what your extension does

---

### B. Remote Code Justification

**Field:** "Remote code justification"

**What to enter (copy-paste this):**
```
This extension does NOT use remote code. All code is bundled within the extension package. The only external resource loaded is the Google Fonts stylesheet (fonts.googleapis.com) for the Inter font, which is a standard web font and does not execute any code.
```

**OR if the field says "Does your extension use remote code?"**

Select: **NO**

---

### C. Permission Justifications

**Field:** "Permissions - storage"

**What to enter (copy-paste this):**
```
The "storage" permission is used to save invoice data, business details, client templates, and saved items locally on the user's device using Chrome's storage API. No data is transmitted to external servers. All data remains on the user's device and can be deleted by uninstalling the extension.
```

---

### D. Data Usage Questions

Answer these questions:

**1. Does this item collect or transmit user data?**
```
NO
```

**2. Does this item handle personal or sensitive user data?**
```
NO
```

**3. Does this item collect web browsing activity data?**
```
NO
```

**4. Does this item use remote code?**
```
NO
```

---

### E. Privacy Policy

**Field:** "Privacy policy"

**What to enter:**
```
[Your hosted privacy policy URL - e.g., GitHub Gist URL]
```

**How to get this:**
1. Go to https://gist.github.com
2. Create new gist
3. Paste entire content from `PRIVACY_POLICY.md`
4. Make it public
5. Click "Create public gist"
6. Click the "Raw" button
7. Copy the URL (looks like: https://gist.githubusercontent.com/username/xxx/raw/...)
8. Paste that URL here

**Example:**
```
https://gist.githubusercontent.com/yourusername/abc123/raw/privacy-policy.md
```

---

### F. Data Usage Certification

**Field:** "I certify that my data usage complies with the Developer Program Policies"

**What to do:**
✅ Check the box to certify

This is safe to check because:
- Your extension doesn't collect any data
- All data is stored locally
- No external servers
- Privacy policy is clear

---

## 📋 Complete Checklist

Go through the tabs in this order:

### Account Tab:
- [ ] Enter contact email
- [ ] Verify email (check inbox)

### Privacy Practices Tab:
- [ ] Single purpose description: "Generate GST-compliant invoices with automatic tax calculations and PDF export for Indian businesses."
- [ ] Remote code: Select "NO" or enter justification
- [ ] Storage permission: Enter justification (see above)
- [ ] Answer all data usage questions: All "NO"
- [ ] Privacy policy URL: [Your GitHub Gist URL]
- [ ] Check certification box

### Store Listing Tab:
- [ ] Name, description, screenshots already filled ✅
- [ ] Category: Productivity ✅
- [ ] Language: English ✅

### Distribution Tab:
- [ ] Visibility: Public
- [ ] Pricing: Free
- [ ] Regions: All regions (or India only)

---

## 🎯 Quick Copy-Paste Guide

**Single Purpose (180 chars max):**
```
Generate GST-compliant invoices with automatic tax calculations and PDF export for Indian businesses.
```

**Storage Permission Justification:**
```
The "storage" permission is used to save invoice data, business details, client templates, and saved items locally on the user's device using Chrome's storage API. No data is transmitted to external servers. All data remains on the user's device and can be deleted by uninstalling the extension.
```

**Remote Code Justification:**
```
This extension does NOT use remote code. All code is bundled within the extension package. The only external resource loaded is the Google Fonts stylesheet (fonts.googleapis.com) for the Inter font, which is a standard web font and does not execute any code.
```

---

## 🚀 After Filling Everything

1. Click **"Save Draft"** (top right)
2. Click **"Submit for Review"** (bottom of page)
3. Confirm submission
4. Wait 1-3 business days for approval
5. You'll get email notification

---

## ❓ Common Issues

**Issue:** "Remote code justification required"
**Fix:** Enter the remote code justification above OR select "NO" if there's a yes/no option

**Issue:** "Privacy policy URL not accessible"
**Fix:** Make sure your GitHub Gist is public and the URL is the RAW URL

**Issue:** "Email not verified"
**Fix:** Check your email spam folder for verification email from Chrome Web Store

**Issue:** "Single purpose too long"
**Fix:** Use exactly 180 characters or less (our text is 108 characters, you're safe!)

---

## 📞 Need Help?

**Chrome Web Store Support:**
- https://support.google.com/chrome_webstore/

**Developer Policies:**
- https://developer.chrome.com/docs/webstore/program-policies/

---

**Follow this guide step-by-step and you'll be able to publish! 🎉**

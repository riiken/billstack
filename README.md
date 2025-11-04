# 📊 BillStack - GST Invoice Generator

> Generate professional GST-compliant invoices in 30 seconds. Built for Indian freelancers, creators, and consultants.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/riiken/billstack)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Current Status: MVP (Week 1 Complete!)

We've built the core functionality:

✅ Invoice form with GST calculation
✅ Automatic CGST/SGST/IGST based on state
✅ Professional invoice generation
✅ Chrome storage for settings & history
✅ Free tier (5 invoices/month)
✅ Invoice history
✅ Number to words (Indian format)

## 📦 How to Load & Test the Extension

### Step 1: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `gst-invoice-extension` folder
5. The extension should now appear in your extensions list!

### Step 2: Pin the Extension

1. Click the puzzle icon in Chrome toolbar
2. Find "BillStack - GST Invoice Generator"
3. Click the pin icon to pin it to your toolbar

### Step 3: Set Up Your Business Details

1. Click the extension icon
2. Click the **Settings** ⚙️ button
3. Fill in your business details:
   - Business/Your Name
   - GSTIN (format: 29XXXXX1234X1ZX)
   - Your State
   - Address
   - Email & Phone (optional)
4. Click **Save Settings**

### Step 4: Generate Your First Invoice

1. Click **Back** to return to main form
2. Fill in client details:
   - Client Name
   - Client State (this determines CGST/SGST vs IGST)
   - Other details (optional)
3. Add invoice items:
   - Click **+ Add Item** to add more items
   - Fill Description, Quantity, Rate
4. Watch the totals calculate automatically!
5. Click **Generate PDF**
6. A print dialog will open - use "Save as PDF" option

## 🎨 Features Implemented

### ✅ Week 1 Features (Current)

- **Invoice Form**: Complete form with all GST fields
- **GST Calculation**:
  - Intra-state: CGST 9% + SGST 9%
  - Inter-state: IGST 18%
- **Business Settings**: Save your details permanently
- **Invoice History**: View and regenerate past invoices
- **Number to Words**: Indian format (Lakhs, Crores)
- **Free Tier**: 5 invoices per month
- **Responsive UI**: Beautiful, modern design

### 🔜 Coming in Week 2

- Chrome Storage improvements
- Client templates (save frequent clients)
- Draft invoices (auto-save)
- Better PDF generation (jsPDF library)
- Settings import/export

### 🔜 Coming in Week 3

- **Pro Features**:
  - Unlimited invoices
  - 3 custom templates (Modern, Classic, Minimal)
  - Recurring invoices
  - Email invoices directly
  - Multi-currency support
  - Payment tracking (Paid/Unpaid)
  - Cloud sync
  - Analytics dashboard
- **Stripe Integration**: Payment for Pro tier

## 🧪 Testing Checklist

Test these scenarios:

- [ ] Settings save and load correctly
- [ ] Invoice number auto-increments
- [ ] CGST+SGST shows for same state
- [ ] IGST shows for different states
- [ ] Totals calculate correctly
- [ ] Number to words works (try ₹1,234, ₹12,345, ₹1,23,456)
- [ ] Can add/remove items
- [ ] Invoice history saves and loads
- [ ] Can regenerate old invoices
- [ ] Free tier counter works (5 invoice limit)
- [ ] Generated PDF looks professional

## 🐛 Known Issues (MVP)

1. **PDF is basic**: Currently opens print dialog. Week 2 will add proper jsPDF generation
2. **No icons**: Using placeholders. Need to create 16x16, 48x48, 128x128 icons
3. **No email**: Email feature coming in Week 3 (Pro)
4. **Client templates**: Coming in Week 2
5. **No offline support**: Will add in Week 2

## 📁 Project Structure

```
gst-invoice-extension/
├── manifest.json              # Extension configuration
├── README.md                  # This file
├── src/
│   ├── popup/
│   │   ├── popup.html        # Main UI
│   │   ├── popup.js          # Core logic
│   │   └── styles.css        # Styling
│   ├── background/
│   │   └── background.js     # Service worker
│   └── utils/                # (Coming Week 2)
└── assets/
    └── icons/                # (Need to create)
```

## 🎯 Development Roadmap

### Week 1 ✅ (DONE!)
- [x] Basic invoice form
- [x] GST calculation
- [x] Settings page
- [x] Invoice history
- [x] Chrome storage
- [x] PDF generation (basic)

### Week 2 (Next)
- [ ] Improved PDF with jsPDF
- [ ] Client templates
- [ ] Draft auto-save
- [ ] Better history UI
- [ ] Icons (16x16, 48x48, 128x128)
- [ ] Form validation improvements
- [ ] Keyboard shortcuts

### Week 3
- [ ] Pro tier features
- [ ] Stripe integration
- [ ] Recurring invoices
- [ ] Email integration
- [ ] Custom templates
- [ ] Cloud sync

### Week 4
- [ ] Testing & bug fixes
- [ ] Chrome Web Store listing
- [ ] Screenshots & marketing
- [ ] ProductHunt launch prep
- [ ] Publish!

## 💡 Tips for Testing

1. **Reset monthly usage** (for testing free tier):
   - Open Chrome DevTools on extension popup
   - Run: `chrome.storage.local.set({ monthlyUsage: { count: 0, month: new Date().getMonth() } })`

2. **Clear all data** (fresh start):
   - Go to `chrome://extensions/`
   - Click "Remove" on the extension
   - Load unpacked again

3. **View storage data**:
   - Right-click extension icon → "Inspect popup"
   - Go to Application tab → Storage → Chrome Storage

## 🎨 TODO: Create Icons

We need icons in these sizes:
- 16x16px (toolbar)
- 48x48px (management)
- 128x128px (Chrome Web Store)

**Design ideas:**
- Simple invoice document icon
- GST text/logo
- Rupee symbol (₹)
- Keep it clean and recognizable

For now, the extension works without icons (Chrome shows default gray icon).

## 🚀 Next Steps

1. **Test everything** in this README checklist
2. **Report bugs** if you find any
3. **Start Week 2** development:
   - jsPDF integration
   - Better PDF design
   - Client templates
4. **Create icons** (or I can help with this)

## 📝 Notes

- This is MVP (Minimum Viable Product) - Week 1 complete!
- Core functionality is working
- Focus is on getting it working, not perfect
- We'll polish and add features in Week 2-4

## 🎉 Congratulations!

**You just built a Chrome extension in a few hours!**

This is your first step toward ₹1.5L/month side income.

Keep building! 💪

---

## 👨‍💻 Author

**BillStack** - Making invoicing simple for Indian freelancers

- Website: Coming Soon
- Support: billstack@example.com

---

**Made with ❤️ in India** | Week 1 Complete ✅ | Week 2 In Progress 🚀

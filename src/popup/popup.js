// BillStack - GST Invoice Generator - Main Logic

// Wrap everything in IIFE to prevent multiple executions
(function() {
  // Prevent multiple script executions
  if (window.billStackInitialized) {
    console.log('BillStack already initialized, skipping...');
    return;
  }
  window.billStackInitialized = true;

// Global state
let businessSettings = null;
let invoiceItems = [];
let currentInvoiceNumber = 1;
let isInitializing = true; // Prevent updates during initialization
let hasInitialized = false; // Prevent multiple initializations

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Prevent duplicate initialization
  if (hasInitialized) {
    console.log('Already initialized, skipping...');
    return;
  }
  hasInitialized = true;
  try {
    // Show UI immediately - no loading screen needed for reopens
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');

    // Load all data first (without UI updates) - but in background
    await loadBusinessSettings();
    await loadLastInvoiceNumber();
    await checkUsage();

    // Setup event listeners
    initializeEventListeners();

    // Setup form (still hidden) - but DON'T add items yet
    setDefaultDates();
    updateBusinessInfoDisplay();

    // Mark initialization complete
    isInitializing = false;

    // Add initial item
    addInitialItem();
  } catch (error) {
    console.error('Initialization error:', error);
    isInitializing = false;
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
  }
});

// Event Listeners
function initializeEventListeners() {
  // Navigation
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  document.getElementById('historyBtn').addEventListener('click', showHistory);
  document.getElementById('backBtn').addEventListener('click', showMainForm);
  document.getElementById('backFromHistoryBtn').addEventListener('click', showMainForm);

  // Settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

  // Invoice form
  document.getElementById('addItemBtn').addEventListener('click', addItem);
  document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
  document.getElementById('generatePdfBtn').addEventListener('click', generatePDF);

  // Client state change (for GST calculation)
  document.getElementById('clientState').addEventListener('change', () => {
    if (!isInitializing) calculateTotals();
  });

  // Upgrade button
  document.getElementById('upgradeBtn').addEventListener('click', showUpgradeModal);
}

// Navigation Functions
function showSettings() {
  document.getElementById('mainForm').style.display = 'none';
  document.getElementById('historyView').style.display = 'none';
  document.getElementById('settingsView').style.display = 'block';
}

function showHistory() {
  document.getElementById('mainForm').style.display = 'none';
  document.getElementById('settingsView').style.display = 'none';
  document.getElementById('historyView').style.display = 'block';
  loadInvoiceHistory();
}

function showMainForm() {
  document.getElementById('settingsView').style.display = 'none';
  document.getElementById('historyView').style.display = 'none';
  document.getElementById('mainForm').style.display = 'block';
}

// Load Business Settings from Chrome Storage
async function loadBusinessSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['businessSettings'], (result) => {
      if (result.businessSettings) {
        businessSettings = result.businessSettings;
        populateSettingsForm();
      }
      resolve();
    });
  });
}

// Populate Settings Form
function populateSettingsForm() {
  if (!businessSettings) return;

  document.getElementById('businessName').value = businessSettings.name || '';
  document.getElementById('businessGSTIN').value = businessSettings.gstin || '';
  document.getElementById('businessState').value = businessSettings.state || '';
  document.getElementById('businessAddress').value = businessSettings.address || '';
  document.getElementById('businessEmail').value = businessSettings.email || '';
  document.getElementById('businessPhone').value = businessSettings.phone || '';
  document.getElementById('invoicePrefix').value = businessSettings.invoicePrefix || 'INV';
  document.getElementById('paymentTerms').value = businessSettings.paymentTerms || '15';
}

// Save Settings
async function saveSettings() {
  const settings = {
    name: document.getElementById('businessName').value,
    gstin: document.getElementById('businessGSTIN').value,
    state: document.getElementById('businessState').value,
    address: document.getElementById('businessAddress').value,
    email: document.getElementById('businessEmail').value,
    phone: document.getElementById('businessPhone').value,
    invoicePrefix: document.getElementById('invoicePrefix').value || 'INV',
    paymentTerms: parseInt(document.getElementById('paymentTerms').value) || 15
  };

  // Validation
  if (!settings.name || !settings.gstin || !settings.state || !settings.address) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  // GSTIN validation
  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinPattern.test(settings.gstin)) {
    showToast('Invalid GSTIN format', 'error');
    return;
  }

  businessSettings = settings;

  chrome.storage.sync.set({ businessSettings: settings }, () => {
    showToast('Settings saved successfully!', 'success');
    updateBusinessInfoDisplay();
    showMainForm();
  });
}

// Update Business Info Display on Main Form
function updateBusinessInfoDisplay() {
  const infoBox = document.getElementById('businessInfo');

  if (businessSettings) {
    infoBox.className = 'info-box filled';
    infoBox.innerHTML = `
      <strong>${businessSettings.name}</strong><br>
      GSTIN: ${businessSettings.gstin}<br>
      ${businessSettings.address}<br>
      ${businessSettings.email ? businessSettings.email + '<br>' : ''}
      ${businessSettings.phone || ''}
    `;
  } else {
    infoBox.className = 'info-box';
    infoBox.innerHTML = '<p class="setup-prompt">⚠️ Please set up your business details in Settings first</p>';
  }
}

// Set Default Dates
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = today;

  // Default due date based on payment terms (15 days default)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (businessSettings?.paymentTerms || 15));
  document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
}

// Load Last Invoice Number
async function loadLastInvoiceNumber() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['lastInvoiceNumber'], (result) => {
      currentInvoiceNumber = (result.lastInvoiceNumber || 0) + 1;
      const prefix = businessSettings?.invoicePrefix || 'INV';
      document.getElementById('invoiceNumber').value = `${prefix}-${String(currentInvoiceNumber).padStart(3, '0')}`;
      resolve();
    });
  });
}

// Add Invoice Item
function addItem() {
  const itemId = Date.now();
  const itemIndex = invoiceItems.length;

  const itemHTML = `
    <div class="invoice-item" data-item-id="${itemId}">
      <div class="item-header">
        <span class="item-number">Item ${itemIndex + 1}</span>
        <button class="remove-item-btn" data-item-id="${itemId}">Remove</button>
      </div>
      <div class="item-row">
        <div class="form-group">
          <label>Description *</label>
          <input type="text" class="item-description" placeholder="Service or product name" required>
        </div>
        <div class="form-group">
          <label>Quantity *</label>
          <input type="number" class="item-quantity" value="1" min="0.01" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Rate (₹) *</label>
          <input type="number" class="item-rate" placeholder="0.00" min="0" step="0.01" required>
        </div>
      </div>
      <div class="item-subtotal">
        Subtotal: ₹<span class="item-subtotal-value">0.00</span>
      </div>
    </div>
  `;

  document.getElementById('itemsList').insertAdjacentHTML('beforeend', itemHTML);

  // Add event listeners to new item
  const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);

  // Remove button listener
  itemElement.querySelector('.remove-item-btn').addEventListener('click', () => {
    removeItem(itemId);
  });

  // Input listeners
  itemElement.querySelector('.item-quantity').addEventListener('input', () => {
    if (!isInitializing) calculateTotals();
  });
  itemElement.querySelector('.item-rate').addEventListener('input', () => {
    if (!isInitializing) calculateTotals();
  });

  invoiceItems.push({ id: itemId, description: '', quantity: 1, rate: 0 });
}

// Add Initial Item
function addInitialItem() {
  addItem();
}

// Remove Item
function removeItem(itemId) {
  const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
  if (itemElement) {
    itemElement.remove();
  }

  invoiceItems = invoiceItems.filter(item => item.id !== itemId);
  calculateTotals();

  // Update item numbers
  document.querySelectorAll('.invoice-item').forEach((item, index) => {
    item.querySelector('.item-number').textContent = `Item ${index + 1}`;
  });
}

// Calculate Totals
function calculateTotals() {
  // Debug: Log every calculation call with stack trace
  console.log('calculateTotals called', new Date().getTime());
  console.trace('Called from:');

  // Skip calculation during initialization to prevent flickering
  if (isInitializing) {
    console.log('Skipping - still initializing');
    return { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
  }

  let subtotal = 0;

  // Calculate subtotal from all items
  document.querySelectorAll('.invoice-item').forEach(itemElement => {
    const quantity = parseFloat(itemElement.querySelector('.item-quantity').value) || 0;
    const rate = parseFloat(itemElement.querySelector('.item-rate').value) || 0;
    const itemSubtotal = quantity * rate;

    itemElement.querySelector('.item-subtotal-value').textContent = itemSubtotal.toFixed(2);
    subtotal += itemSubtotal;
  });

  // Calculate GST
  const yourState = businessSettings?.state || '';
  const clientState = document.getElementById('clientState').value;

  let cgst = 0, sgst = 0, igst = 0, total = subtotal;

  if (yourState && clientState && subtotal > 0) {
    if (yourState === clientState) {
      // Intra-state: CGST + SGST
      cgst = subtotal * 0.09;
      sgst = subtotal * 0.09;
      total = subtotal + cgst + sgst;

      document.getElementById('cgstRow').style.display = 'flex';
      document.getElementById('sgstRow').style.display = 'flex';
      document.getElementById('igstRow').style.display = 'none';
    } else {
      // Inter-state: IGST
      igst = subtotal * 0.18;
      total = subtotal + igst;

      document.getElementById('cgstRow').style.display = 'none';
      document.getElementById('sgstRow').style.display = 'none';
      document.getElementById('igstRow').style.display = 'flex';
    }
  } else {
    // Hide all GST rows if states not selected
    document.getElementById('cgstRow').style.display = 'none';
    document.getElementById('sgstRow').style.display = 'none';
    document.getElementById('igstRow').style.display = 'none';
  }

  // Update display
  document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById('cgst').textContent = `₹${cgst.toFixed(2)}`;
  document.getElementById('sgst').textContent = `₹${sgst.toFixed(2)}`;
  document.getElementById('igst').textContent = `₹${igst.toFixed(2)}`;
  document.getElementById('total').textContent = `₹${total.toFixed(2)}`;

  // Amount in words
  if (total > 0) {
    document.getElementById('amountWords').textContent = `Amount in words: ${numberToWords(Math.round(total))} Rupees Only`;
  } else {
    document.getElementById('amountWords').textContent = '';
  }

  return { subtotal, cgst, sgst, igst, total };
}

// Number to Words (Indian numbering system)
function numberToWords(num) {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertLessThanThousand(n) {
    if (n === 0) return '';

    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');

    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '');
  }

  if (num < 1000) return convertLessThanThousand(num);

  // Indian numbering: Thousands, Lakhs, Crores
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = '';

  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder);

  return result.trim();
}

// Collect Invoice Data
function collectInvoiceData() {
  const items = [];
  document.querySelectorAll('.invoice-item').forEach(itemElement => {
    items.push({
      description: itemElement.querySelector('.item-description').value,
      quantity: parseFloat(itemElement.querySelector('.item-quantity').value),
      rate: parseFloat(itemElement.querySelector('.item-rate').value)
    });
  });

  const totals = calculateTotals();

  return {
    invoiceNumber: document.getElementById('invoiceNumber').value,
    date: document.getElementById('invoiceDate').value,
    dueDate: document.getElementById('dueDate').value,
    yourDetails: businessSettings,
    clientName: document.getElementById('clientName').value,
    clientGSTIN: document.getElementById('clientGSTIN').value,
    clientState: document.getElementById('clientState').value,
    clientAddress: document.getElementById('clientAddress').value,
    clientEmail: document.getElementById('clientEmail').value,
    items: items,
    subtotal: totals.subtotal,
    cgst: totals.cgst,
    sgst: totals.sgst,
    igst: totals.igst,
    total: totals.total,
    totalInWords: numberToWords(Math.round(totals.total))
  };
}

// Validate Invoice Data
function validateInvoiceData(data) {
  if (!data.yourDetails) {
    showToast('Please set up your business details first', 'error');
    return false;
  }

  if (!data.clientName) {
    showToast('Please enter client name', 'error');
    return false;
  }

  if (!data.clientState) {
    showToast('Please select client state', 'error');
    return false;
  }

  if (data.items.length === 0 || !data.items[0].description) {
    showToast('Please add at least one item', 'error');
    return false;
  }

  if (data.items.some(item => !item.description || item.quantity <= 0 || item.rate <= 0)) {
    showToast('Please fill all item details', 'error');
    return false;
  }

  return true;
}

// Check Usage (Free Tier: 5 invoices/month)
async function checkUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['monthlyUsage', 'isPro'], (result) => {
      const isPro = result.isPro || false;
      const usage = result.monthlyUsage || { count: 0, month: new Date().getMonth() };

      // Reset counter if new month
      if (usage.month !== new Date().getMonth()) {
        usage.count = 0;
        usage.month = new Date().getMonth();
        chrome.storage.local.set({ monthlyUsage: usage });
      }

      const usageText = document.getElementById('usageText');
      const upgradeBtn = document.getElementById('upgradeBtn');

      if (isPro) {
        usageText.textContent = '✨ Pro Member - Unlimited Invoices';
        upgradeBtn.style.display = 'none';
      } else {
        usageText.textContent = `${usage.count} of 5 invoices used this month`;

        if (usage.count >= 5) {
          document.getElementById('usageCounter').classList.add('limit-reached');
          upgradeBtn.style.display = 'inline-block';
          document.getElementById('generatePdfBtn').disabled = true;
        }
      }

      resolve({ usage, isPro });
    });
  });
}

// Increment Usage
function incrementUsage() {
  chrome.storage.local.get(['monthlyUsage'], (result) => {
    const usage = result.monthlyUsage || { count: 0, month: new Date().getMonth() };
    usage.count++;
    chrome.storage.local.set({ monthlyUsage: usage }, () => {
      checkUsage();
    });
  });
}

// Save Draft
function saveDraft() {
  const data = collectInvoiceData();

  if (!validateInvoiceData(data)) return;

  chrome.storage.local.set({
    [`draft_${Date.now()}`]: data
  }, () => {
    showToast('Draft saved successfully!', 'success');
  });
}

// Generate PDF (Simple HTML version for now - will integrate jsPDF later)
async function generatePDF() {
  const data = collectInvoiceData();

  if (!validateInvoiceData(data)) return;

  // Check usage
  const { usage, isPro } = await checkUsage();
  if (!isPro && usage.count >= 5) {
    showToast('Monthly limit reached! Upgrade to Pro for unlimited invoices.', 'error');
    return;
  }

  showToast('Generating PDF...', 'info');

  // For MVP, we'll create a printable HTML invoice
  // In Week 3, we'll add proper jsPDF integration
  const invoiceHTML = generateInvoiceHTML(data);

  // Open in new window for printing
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 250);

  // Save invoice to history
  chrome.storage.local.set({
    [`invoice_${data.invoiceNumber}_${Date.now()}`]: data
  });

  // Increment usage and invoice number
  incrementUsage();
  chrome.storage.sync.set({ lastInvoiceNumber: currentInvoiceNumber });

  showToast('Invoice generated! Use browser print to save as PDF.', 'success');

  // Increment invoice number for next invoice
  currentInvoiceNumber++;
  const prefix = businessSettings?.invoicePrefix || 'INV';
  document.getElementById('invoiceNumber').value = `${prefix}-${String(currentInvoiceNumber).padStart(3, '0')}`;
}

// Generate Invoice HTML (for printing)
function generateInvoiceHTML(data) {
  const stateCode = data.yourDetails.state;
  const isIntraState = data.yourDetails.state === data.clientState;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${data.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; border: 2px solid #333; padding: 30px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px double #333; padding-bottom: 20px; }
        .header h1 { font-size: 28px; margin-bottom: 5px; }
        .header p { font-size: 14px; color: #666; }
        .details-row { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .details-box { width: 48%; }
        .details-box h3 { font-size: 14px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }
        .details-box p { font-size: 13px; line-height: 1.6; }
        .invoice-meta { text-align: right; margin-bottom: 20px; }
        .invoice-meta p { margin: 5px 0; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f0f0f0; padding: 12px; text-align: left; border: 1px solid #333; font-size: 13px; }
        td { padding: 10px 12px; border: 1px solid #333; font-size: 13px; }
        .amount-col { text-align: right; }
        .totals { margin-top: 20px; }
        .totals table { width: 350px; margin-left: auto; }
        .totals td { border: none; padding: 8px 12px; }
        .totals .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
        .amount-words { margin-top: 20px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; font-style: italic; font-size: 13px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
        @media print { .invoice-container { border: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>TAX INVOICE</h1>
          <p>Generated by BillStack</p>
        </div>

        <div class="invoice-meta">
          <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-IN')}</p>
          <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString('en-IN')}</p>
        </div>

        <div class="details-row">
          <div class="details-box">
            <h3>FROM (Your Details)</h3>
            <p>
              <strong>${data.yourDetails.name}</strong><br>
              GSTIN: ${data.yourDetails.gstin}<br>
              ${data.yourDetails.address}<br>
              ${data.yourDetails.email ? data.yourDetails.email + '<br>' : ''}
              ${data.yourDetails.phone || ''}
            </p>
          </div>
          <div class="details-box">
            <h3>BILL TO (Client Details)</h3>
            <p>
              <strong>${data.clientName}</strong><br>
              ${data.clientGSTIN ? 'GSTIN: ' + data.clientGSTIN + '<br>' : ''}
              ${data.clientAddress || ''}<br>
              ${data.clientEmail || ''}
            </p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%">Description</th>
              <th style="width: 15%">Quantity</th>
              <th style="width: 15%">Rate (₹)</th>
              <th style="width: 20%" class="amount-col">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>₹${item.rate.toFixed(2)}</td>
                <td class="amount-col">₹${(item.quantity * item.rate).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="amount-col">₹${data.subtotal.toFixed(2)}</td>
            </tr>
            ${isIntraState ? `
              <tr>
                <td>CGST @ 9%:</td>
                <td class="amount-col">₹${data.cgst.toFixed(2)}</td>
              </tr>
              <tr>
                <td>SGST @ 9%:</td>
                <td class="amount-col">₹${data.sgst.toFixed(2)}</td>
              </tr>
            ` : `
              <tr>
                <td>IGST @ 18%:</td>
                <td class="amount-col">₹${data.igst.toFixed(2)}</td>
              </tr>
            `}
            <tr class="total-row">
              <td><strong>TOTAL:</strong></td>
              <td class="amount-col"><strong>₹${data.total.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>

        <div class="amount-words">
          <strong>Amount in words:</strong> ${data.totalInWords} Rupees Only
        </div>

        <div class="footer">
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p>Generated using BillStack - GST Invoice Generator</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Load Invoice History
function loadInvoiceHistory() {
  chrome.storage.local.get(null, (items) => {
    const invoices = Object.keys(items)
      .filter(key => key.startsWith('invoice_'))
      .map(key => ({ key, ...items[key] }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const historyList = document.getElementById('historyList');

    if (invoices.length === 0) {
      historyList.innerHTML = '<p class="empty-state">No invoices generated yet</p>';
      return;
    }

    historyList.innerHTML = invoices.map(inv => `
      <div class="history-item">
        <div class="history-header">
          <span class="history-invoice-number">${inv.invoiceNumber}</span>
          <span class="history-date">${new Date(inv.date).toLocaleDateString('en-IN')}</span>
        </div>
        <div class="history-client">${inv.clientName}</div>
        <div class="history-amount">₹${inv.total.toFixed(2)}</div>
        <div class="history-actions">
          <button class="regenerate-btn" data-key="${inv.key}">Regenerate PDF</button>
          <button class="delete-btn" data-key="${inv.key}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for history buttons
    document.querySelectorAll('.regenerate-btn').forEach(btn => {
      btn.addEventListener('click', () => regenerateInvoice(btn.dataset.key));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteInvoice(btn.dataset.key));
    });
  });
}

// Regenerate Invoice from History
function regenerateInvoice(key) {
  chrome.storage.local.get([key], (result) => {
    const data = result[key];
    if (data) {
      const invoiceHTML = generateInvoiceHTML(data);
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
      showToast('Invoice regenerated!', 'success');
    }
  });
}

// Delete Invoice
function deleteInvoice(key) {
  if (confirm('Are you sure you want to delete this invoice?')) {
    chrome.storage.local.remove([key], () => {
      showToast('Invoice deleted', 'success');
      loadInvoiceHistory();
    });
  }
}

// Show Upgrade Modal
function showUpgradeModal() {
  alert('Upgrade to Pro:\n\n✨ Unlimited invoices\n✨ Custom templates\n✨ Recurring invoices\n✨ Email directly\n✨ Cloud sync\n\nPricing: ₹299/month or ₹2,999/year\n\nComing soon in Week 3!');
}

// Show Toast Notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

})(); // End IIFE

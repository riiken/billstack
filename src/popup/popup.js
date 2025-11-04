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
let autoSaveInterval = null; // Auto-save timer
let lastAutoSaveData = null; // Track last saved data to avoid duplicate saves

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
    await loadClientTemplatesDropdown();

    // Setup event listeners
    initializeEventListeners();

    // Setup real-time validation
    setupRealTimeValidation();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Setup form (still hidden) - but DON'T add items yet
    setDefaultDates();
    updateBusinessInfoDisplay();

    // Mark initialization complete
    isInitializing = false;

    // Restore draft if exists
    await restoreDraft();

    // Add initial item (only if no draft was restored)
    if (invoiceItems.length === 0) {
      addInitialItem();
    }

    // Start auto-save timer
    startAutoSave();
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

  // Client templates
  document.getElementById('saveClientTemplateBtn').addEventListener('click', saveClientTemplate);
  document.getElementById('loadClientTemplate').addEventListener('change', loadClientTemplate);
  document.getElementById('deleteClientTemplateBtn').addEventListener('click', () => {
    const dropdown = document.getElementById('loadClientTemplate');
    const selectedKey = dropdown.value;
    if (selectedKey) {
      const selectedName = dropdown.options[dropdown.selectedIndex].text;
      if (confirm(`Delete client template "${selectedName}"?`)) {
        deleteClientTemplate(selectedKey);
      }
    }
  });

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

// ===== CLIENT TEMPLATES =====

// Load client templates into dropdown
async function loadClientTemplatesDropdown() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (items) => {
      const clientTemplates = Object.keys(items)
        .filter(key => key.startsWith('client_template_'))
        .map(key => ({ key, ...items[key] }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const dropdown = document.getElementById('loadClientTemplate');

      // Clear existing options except first
      dropdown.innerHTML = '<option value="">-- Select a client --</option>';

      // Add client templates
      clientTemplates.forEach(client => {
        const option = document.createElement('option');
        option.value = client.key;
        option.textContent = client.name;
        dropdown.appendChild(option);
      });

      resolve();
    });
  });
}

// Save current client as template
function saveClientTemplate() {
  const clientName = document.getElementById('clientName').value;
  const clientGSTIN = document.getElementById('clientGSTIN').value;
  const clientState = document.getElementById('clientState').value;
  const clientAddress = document.getElementById('clientAddress').value;
  const clientEmail = document.getElementById('clientEmail').value;

  // Validation
  if (!clientName || !clientState) {
    showToast('Please fill in Client Name and State to save template', 'error');
    return;
  }

  // Create template
  const template = {
    name: clientName,
    gstin: clientGSTIN,
    state: clientState,
    address: clientAddress,
    email: clientEmail,
    savedAt: Date.now()
  };

  // Save to storage
  const templateKey = `client_template_${clientName.replace(/\s+/g, '_').toLowerCase()}`;

  chrome.storage.sync.set({ [templateKey]: template }, () => {
    showToast(`Client "${clientName}" saved as template!`, 'success');
    loadClientTemplatesDropdown();
  });
}

// Load selected client template
function loadClientTemplate() {
  const dropdown = document.getElementById('loadClientTemplate');
  const deleteBtn = document.getElementById('deleteClientTemplateBtn');
  const selectedKey = dropdown.value;

  if (!selectedKey) {
    // Hide delete button when no template selected
    deleteBtn.style.display = 'none';
    return;
  }

  // Show delete button
  deleteBtn.style.display = 'block';

  chrome.storage.sync.get([selectedKey], (result) => {
    const template = result[selectedKey];

    if (template) {
      // Fill form with template data
      document.getElementById('clientName').value = template.name || '';
      document.getElementById('clientGSTIN').value = template.gstin || '';
      document.getElementById('clientState').value = template.state || '';
      document.getElementById('clientAddress').value = template.address || '';
      document.getElementById('clientEmail').value = template.email || '';

      // Trigger GST calculation
      if (!isInitializing) calculateTotals();

      showToast(`Client "${template.name}" loaded!`, 'success');
    }
  });
}

// Delete client template
function deleteClientTemplate(templateKey) {
  chrome.storage.sync.remove([templateKey], () => {
    showToast('Client template deleted', 'success');

    // Reset dropdown
    document.getElementById('loadClientTemplate').value = '';
    document.getElementById('deleteClientTemplateBtn').style.display = 'none';

    // Reload dropdown
    loadClientTemplatesDropdown();
  });
}

// ===== DRAFT AUTO-SAVE =====

// Start auto-save timer (every 30 seconds)
function startAutoSave() {
  // Clear existing timer if any
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  // Auto-save every 30 seconds
  autoSaveInterval = setInterval(() => {
    autoSaveDraft();
  }, 30000); // 30 seconds
}

// Auto-save current draft
function autoSaveDraft() {
  // Skip if initializing
  if (isInitializing) return;

  // Collect current form data
  const draftData = {
    clientName: document.getElementById('clientName').value,
    clientGSTIN: document.getElementById('clientGSTIN').value,
    clientState: document.getElementById('clientState').value,
    clientAddress: document.getElementById('clientAddress').value,
    clientEmail: document.getElementById('clientEmail').value,
    invoiceDate: document.getElementById('invoiceDate').value,
    dueDate: document.getElementById('dueDate').value,
    items: invoiceItems.map((item, index) => {
      const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
      if (itemElement) {
        return {
          description: itemElement.querySelector('.item-description').value,
          quantity: parseFloat(itemElement.querySelector('.item-quantity').value) || 0,
          rate: parseFloat(itemElement.querySelector('.item-rate').value) || 0
        };
      }
      return null;
    }).filter(item => item !== null),
    savedAt: Date.now()
  };

  // Check if data has changed (avoid saving identical drafts)
  const dataString = JSON.stringify(draftData);
  if (dataString === lastAutoSaveData) {
    return; // No changes, skip save
  }

  // Check if form has meaningful data (at least client name or an item)
  const hasData = draftData.clientName ||
                  draftData.items.some(item => item.description || item.quantity || item.rate);

  if (!hasData) {
    return; // No meaningful data, skip save
  }

  // Save to storage
  chrome.storage.local.set({ invoice_draft: draftData }, () => {
    lastAutoSaveData = dataString;
    showAutoSaveIndicator();
  });
}

// Restore draft on load
async function restoreDraft() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['invoice_draft'], (result) => {
      const draft = result.invoice_draft;

      if (!draft) {
        resolve();
        return;
      }

      // Check if draft is recent (within 7 days)
      const draftAge = Date.now() - draft.savedAt;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (draftAge > sevenDays) {
        // Draft too old, clear it
        chrome.storage.local.remove(['invoice_draft']);
        resolve();
        return;
      }

      // Restore client details
      if (draft.clientName) document.getElementById('clientName').value = draft.clientName;
      if (draft.clientGSTIN) document.getElementById('clientGSTIN').value = draft.clientGSTIN;
      if (draft.clientState) document.getElementById('clientState').value = draft.clientState;
      if (draft.clientAddress) document.getElementById('clientAddress').value = draft.clientAddress;
      if (draft.clientEmail) document.getElementById('clientEmail').value = draft.clientEmail;

      // Restore dates
      if (draft.invoiceDate) document.getElementById('invoiceDate').value = draft.invoiceDate;
      if (draft.dueDate) document.getElementById('dueDate').value = draft.dueDate;

      // Restore items
      if (draft.items && draft.items.length > 0) {
        // Clear existing items
        invoiceItems = [];
        document.getElementById('itemsList').innerHTML = '';

        // Add draft items
        draft.items.forEach((item, index) => {
          addItem();

          // Fill in the item data
          const itemElement = document.querySelector(`[data-item-id="${invoiceItems[invoiceItems.length - 1].id}"]`);
          if (itemElement) {
            itemElement.querySelector('.item-description').value = item.description || '';
            itemElement.querySelector('.item-quantity').value = item.quantity || 1;
            itemElement.querySelector('.item-rate').value = item.rate || 0;
          }
        });

        // Recalculate totals
        calculateTotals();
      }

      showToast('Draft restored from previous session', 'info');
      resolve();
    });
  });
}

// Clear draft (after generating invoice)
function clearDraft() {
  chrome.storage.local.remove(['invoice_draft'], () => {
    lastAutoSaveData = null;
  });
}

// Show auto-save indicator briefly
function showAutoSaveIndicator() {
  const indicator = document.getElementById('autoSaveIndicator');
  indicator.style.opacity = '1';

  setTimeout(() => {
    indicator.style.opacity = '0';
  }, 2000); // Hide after 2 seconds
}

// ===== FORM VALIDATION =====

// Validate GSTIN format
function isValidGSTIN(gstin) {
  if (!gstin) return true; // Optional field

  // GSTIN format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

// Show validation error
function showError(groupId, message = null) {
  const group = document.getElementById(groupId);
  if (group) {
    group.classList.add('error');
    if (message) {
      const errorSpan = group.querySelector('.error-message');
      if (errorSpan) errorSpan.textContent = message;
    }
  }
}

// Hide validation error
function hideError(groupId) {
  const group = document.getElementById(groupId);
  if (group) {
    group.classList.remove('error');
  }
}

// Clear all validation errors
function clearAllErrors() {
  document.querySelectorAll('.form-group.error').forEach(group => {
    group.classList.remove('error');
  });
}

// Real-time validation setup
function setupRealTimeValidation() {
  // Client Name validation
  const clientName = document.getElementById('clientName');
  clientName.addEventListener('blur', () => {
    if (!clientName.value.trim()) {
      showError('clientNameGroup');
    } else {
      hideError('clientNameGroup');
    }
  });

  clientName.addEventListener('input', () => {
    if (clientName.value.trim()) {
      hideError('clientNameGroup');
    }
  });

  // Client State validation
  const clientState = document.getElementById('clientState');
  clientState.addEventListener('change', () => {
    if (!clientState.value) {
      showError('clientStateGroup', 'Please select a state');
    } else {
      hideError('clientStateGroup');
    }
  });

  // GSTIN validation
  const clientGSTIN = document.getElementById('clientGSTIN');
  clientGSTIN.addEventListener('blur', () => {
    const value = clientGSTIN.value.trim();
    if (value && !isValidGSTIN(value)) {
      showError('clientGSTINGroup');
    } else {
      hideError('clientGSTINGroup');
    }
  });

  clientGSTIN.addEventListener('input', () => {
    const value = clientGSTIN.value.trim();
    if (!value || isValidGSTIN(value)) {
      hideError('clientGSTINGroup');
    }
  });
}

// ===== KEYBOARD SHORTCUTS =====

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Check for Ctrl (Windows/Linux) or Cmd (Mac)
    const isMod = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + S: Save Draft
    if (isMod && e.key === 's') {
      e.preventDefault();

      // Only if on main form
      if (document.getElementById('mainForm').style.display !== 'none') {
        saveDraft();
      }
    }

    // Ctrl/Cmd + G: Generate PDF
    if (isMod && e.key === 'g') {
      e.preventDefault();

      // Only if on main form
      if (document.getElementById('mainForm').style.display !== 'none') {
        generatePDF();
      }
    }

    // Ctrl/Cmd + H: Open History
    if (isMod && e.key === 'h') {
      e.preventDefault();

      // Only if on main form
      if (document.getElementById('mainForm').style.display !== 'none') {
        showHistory();
      }
    }

    // Ctrl/Cmd + ,: Open Settings
    if (isMod && e.key === ',') {
      e.preventDefault();

      // Only if on main form
      if (document.getElementById('mainForm').style.display !== 'none') {
        showSettings();
      }
    }

    // Escape: Go back to main form
    if (e.key === 'Escape') {
      const settingsVisible = document.getElementById('settingsForm').style.display !== 'none';
      const historyVisible = document.getElementById('historyView').style.display !== 'none';

      if (settingsVisible || historyVisible) {
        e.preventDefault();
        showMain();
      }
    }

    // Ctrl/Cmd + I: Add new item
    if (isMod && e.key === 'i') {
      e.preventDefault();

      // Only if on main form
      if (document.getElementById('mainForm').style.display !== 'none') {
        addItem();
        showToast('New item added', 'info');
      }
    }
  });
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
  // Clear previous errors
  clearAllErrors();

  let isValid = true;
  const errors = [];

  // Validate business details
  if (!data.yourDetails) {
    showToast('⚠️ Please set up your business details in Settings first', 'error');
    return false;
  }

  // Validate client name
  if (!data.clientName || !data.clientName.trim()) {
    showError('clientNameGroup');
    errors.push('Client name is required');
    isValid = false;
  }

  // Validate client state
  if (!data.clientState) {
    showError('clientStateGroup', 'Please select a state');
    errors.push('Client state is required');
    isValid = false;
  }

  // Validate GSTIN format if provided
  if (data.clientGSTIN && !isValidGSTIN(data.clientGSTIN)) {
    showError('clientGSTINGroup');
    errors.push('Invalid GSTIN format');
    isValid = false;
  }

  // Validate items
  if (data.items.length === 0 || !data.items[0].description) {
    showToast('⚠️ Please add at least one item to the invoice', 'error');
    errors.push('At least one item is required');
    isValid = false;
  }

  // Validate item details
  data.items.forEach((item, index) => {
    if (!item.description || item.description.trim() === '') {
      errors.push(`Item ${index + 1}: Description is required`);
      isValid = false;
    }
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      isValid = false;
    }
    if (item.rate <= 0) {
      errors.push(`Item ${index + 1}: Rate must be greater than 0`);
      isValid = false;
    }
  });

  // Show consolidated error message if validation failed
  if (!isValid && errors.length > 0) {
    const errorMessage = errors.slice(0, 3).join(', ');
    showToast(`⚠️ ${errorMessage}${errors.length > 3 ? ', and more...' : ''}`, 'error');
  }

  return isValid;
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
  // Trigger manual save using auto-save logic
  autoSaveDraft();
  showToast('Draft saved manually!', 'success');
}

// Preview PDF - opens in browser without downloading
function previewPDF() {
  const data = collectInvoiceData();

  if (!validateInvoiceData(data)) return;

  try {
    // Generate PDF using jsPDF helper
    const doc = createPDFFromData(data);

    // Create blob and open in new window (no download)
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Open in new window with proper filename
    const previewWindow = window.open(pdfUrl, '_blank');

    if (previewWindow) {
      // Set the window title
      previewWindow.document.title = `Invoice ${data.invoiceNumber} - Preview`;
      showToast('Preview opened in new tab', 'info');
    } else {
      showToast('Please allow pop-ups to preview invoices', 'error');
    }
  } catch (error) {
    console.error('PDF preview error:', error);
    showToast('Error previewing PDF', 'error');
  }
}

// Generate PDF using jsPDF
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

  try {
    // Generate PDF using jsPDF helper
    const doc = createPDFFromData(data);

    // Save the PDF
    doc.save(`Invoice-${data.invoiceNumber}.pdf`);

    // Save invoice to history
    chrome.storage.local.set({
      [`invoice_${data.invoiceNumber}_${Date.now()}`]: data
    });

    // Increment usage and invoice number
    incrementUsage();
    chrome.storage.sync.set({ lastInvoiceNumber: currentInvoiceNumber });

    showToast('Invoice PDF generated successfully!', 'success');

    // Clear draft after successful generation
    clearDraft();

    // Increment invoice number for next invoice
    currentInvoiceNumber++;
    const prefix = businessSettings?.invoicePrefix || 'INV';
    document.getElementById('invoiceNumber').value = `${prefix}-${String(currentInvoiceNumber).padStart(3, '0')}`;

    // Reset form for next invoice (optional - you can comment this out if you want to keep the data)
    // clearFormForNextInvoice();

  } catch (error) {
    console.error('PDF generation error:', error);
    showToast('Error generating PDF. Please try again.', 'error');
  }
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

// Helper function to create PDF from invoice data using jsPDF
function createPDFFromData(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const isIntraState = data.yourDetails.state === data.clientState;

  // Header with gradient-like color
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', 105, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated by BillStack', 105, 25, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Invoice metadata (top right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  let y = 45;
  doc.text(`Invoice #: ${data.invoiceNumber}`, 140, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(data.date).toLocaleDateString('en-IN')}`, 140, y + 6);
  doc.text(`Due: ${new Date(data.dueDate).toLocaleDateString('en-IN')}`, 140, y + 12);

  // From Details
  y = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FROM:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.yourDetails.name, 15, y + 7);
  doc.setFontSize(9);
  doc.text(`GSTIN: ${data.yourDetails.gstin}`, 15, y + 13);

  // Split address into lines
  const fromAddress = doc.splitTextToSize(data.yourDetails.address, 80);
  doc.text(fromAddress, 15, y + 19);

  let fromY = y + 19 + (fromAddress.length * 5);

  if (data.yourDetails.email) {
    doc.text(data.yourDetails.email, 15, fromY + 5);
    fromY += 5;
  }
  if (data.yourDetails.phone) {
    doc.text(data.yourDetails.phone, 15, fromY + 5);
  }

  // Bill To Details - position below FROM section with enough space
  y = Math.max(95, fromY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BILL TO:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.clientName, 15, y + 7);
  doc.setFontSize(9);

  if (data.clientGSTIN) {
    doc.text(`GSTIN: ${data.clientGSTIN}`, 15, y + 13);
  }

  let clientY = y + (data.clientGSTIN ? 19 : 13);

  if (data.clientAddress) {
    const toAddress = doc.splitTextToSize(data.clientAddress, 80);
    doc.text(toAddress, 15, clientY);
    clientY += toAddress.length * 5;
  }

  if (data.clientEmail) {
    doc.text(data.clientEmail, 15, clientY + 5);
  }

  // Items Table - position with proper spacing
  y = Math.max(135, clientY + 15);

  // Table headers
  doc.setFillColor(240, 240, 240);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Description', 17, y + 5);
  doc.text('Qty', 125, y + 5);
  doc.text('Rate', 150, y + 5);
  doc.text('Amount', 185, y + 5, { align: 'right' });

  // Table items
  doc.setFont('helvetica', 'normal');
  y += 8;

  data.items.forEach((item) => {
    y += 7;
    const description = doc.splitTextToSize(item.description, 105);
    doc.text(description, 17, y);
    doc.text(String(item.quantity), 125, y);
    doc.text(`Rs ${item.rate.toFixed(2)}`, 145, y);
    doc.text(`Rs ${(item.quantity * item.rate).toFixed(2)}`, 193, y, { align: 'right' });

    if (description.length > 1) {
      y += (description.length - 1) * 5;
    }
  });

  // Line above totals
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);

  // Totals section
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  doc.text('Subtotal:', 145, y);
  doc.text(`Rs ${data.subtotal.toFixed(2)}`, 193, y, { align: 'right' });

  if (isIntraState) {
    y += 6;
    doc.setFontSize(9);
    doc.text('CGST @ 9%:', 145, y);
    doc.text(`Rs ${data.cgst.toFixed(2)}`, 193, y, { align: 'right' });

    y += 5;
    doc.text('SGST @ 9%:', 145, y);
    doc.text(`Rs ${data.sgst.toFixed(2)}`, 193, y, { align: 'right' });
  } else {
    y += 6;
    doc.setFontSize(9);
    doc.text('IGST @ 18%:', 145, y);
    doc.text(`Rs ${data.igst.toFixed(2)}`, 193, y, { align: 'right' });
  }

  // Total line
  y += 7;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(145, y, 195, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', 145, y);
  doc.text(`Rs ${data.total.toFixed(2)}`, 193, y, { align: 'right' });

  // Amount in words
  y += 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const amountWords = doc.splitTextToSize(`Amount in words: ${data.totalInWords} Rupees Only`, 180);
  doc.text(amountWords, 15, y);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('This is a computer-generated invoice and does not require a signature.', 105, 280, { align: 'center' });
  doc.text('Generated using BillStack - GST Invoice Generator', 105, 285, { align: 'center' });

  return doc;
}

// Regenerate Invoice from History
function regenerateInvoice(key) {
  chrome.storage.local.get([key], (result) => {
    const data = result[key];
    if (data) {
      try {
        const doc = createPDFFromData(data);
        doc.save(`Invoice-${data.invoiceNumber}.pdf`);
        showToast('Invoice PDF regenerated!', 'success');
      } catch (error) {
        console.error('PDF regeneration error:', error);
        showToast('Error regenerating PDF', 'error');
      }
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

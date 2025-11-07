// BillStack - GST Invoice Generator - Main Logic

// Wrap everything in IIFE to prevent multiple executions
(function() {
  // Prevent multiple script executions
  if (window.billStackInitialized) {
    console.log('BillStack already initialized, skipping...');
    return;
  }
  window.billStackInitialized = true;

// Configuration
const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdWOQmkaGb2RBLLtc_FPk95KOXR1Es9nXXj1ckKApjfhZq-UQ/viewform?usp=sharing&ouid=117269674292990812029';

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
    await loadBusinessLogo(); // Fix: Load logo on initialization

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

    // Track page view
    if (typeof analytics !== 'undefined') {
      analytics.trackPageView('main_form', 'Invoice Generator');
    }
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
  document.getElementById('analyticsBtn').addEventListener('click', showAnalytics);
  document.getElementById('backFromAnalyticsBtn').addEventListener('click', showHistory);

  // Settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

  // Logo upload
  document.getElementById('uploadLogoBtn').addEventListener('click', () => {
    document.getElementById('businessLogo').click();
  });
  document.getElementById('businessLogo').addEventListener('change', handleLogoUpload);
  document.getElementById('removeLogoBtn').addEventListener('click', removeLogo);

  // Saved Items Library
  document.getElementById('addSavedItemBtn').addEventListener('click', addSavedItem);

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

  // Feedback buttons
  document.getElementById('feedbackBtn').addEventListener('click', openFeedbackForm);
  document.getElementById('feedbackBtnHeader').addEventListener('click', openFeedbackForm);
  document.getElementById('feedbackLinkMain').addEventListener('click', (e) => {
    e.preventDefault();
    openFeedbackForm();
  });

  // Setup accordions
  setupAccordions();
}

// Setup Accordion functionality
function setupAccordions() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.accordion-section');
      section.classList.toggle('collapsed');

      // Optional: Close other accordions when opening one (uncomment if you want this behavior)
      // accordionHeaders.forEach(otherHeader => {
      //   if (otherHeader !== header) {
      //     const otherSection = otherHeader.closest('.accordion-section');
      //     otherSection.classList.add('collapsed');
      //   }
      // });
    });
  });
}

// Navigation Functions
function showSettings() {
  document.getElementById('mainForm').style.display = 'none';
  document.getElementById('historyView').style.display = 'none';
  document.getElementById('analyticsView').style.display = 'none';
  document.getElementById('settingsView').style.display = 'block';

  // Update active nav button
  document.getElementById('historyBtn').classList.remove('active');
  document.getElementById('settingsBtn').classList.add('active');

  loadBusinessLogo(); // Load logo preview
  loadSavedItems(); // Load saved items library
}

function showHistory() {
  document.getElementById('mainForm').style.display = 'none';
  document.getElementById('settingsView').style.display = 'none';
  document.getElementById('historyView').style.display = 'block';
  document.getElementById('analyticsView').style.display = 'none';

  // Update active nav button
  document.getElementById('settingsBtn').classList.remove('active');
  document.getElementById('historyBtn').classList.add('active');

  loadInvoiceHistory();
}

async function showAnalytics() {
  // Check if user is Pro
  const { isPro } = await new Promise((resolve) => {
    chrome.storage.local.get(['isPro'], (result) => {
      resolve({ isPro: result.isPro || false });
    });
  });

  document.getElementById('mainForm').style.display = 'none';
  document.getElementById('settingsView').style.display = 'none';
  document.getElementById('historyView').style.display = 'none';
  document.getElementById('analyticsView').style.display = 'block';

  if (isPro) {
    document.getElementById('analyticsData').style.display = 'block';
    document.getElementById('analyticsUpgrade').style.display = 'none';
    calculateAnalytics();
  } else {
    document.getElementById('analyticsData').style.display = 'none';
    document.getElementById('analyticsUpgrade').style.display = 'block';
  }
}

function calculateAnalytics() {
  chrome.storage.local.get(null, (items) => {
    const invoices = Object.keys(items)
      .filter(key => key.startsWith('invoice_'))
      .map(key => items[key]);

    if (invoices.length === 0) {
      return;
    }

    // Calculate total revenue
    const totalRevenue = invoices.reduce((sum, inv) => {
      const total = inv.total || inv.totals?.total || 0;
      return sum + total;
    }, 0);
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;

    // Total invoices
    document.getElementById('totalInvoices').textContent = invoices.length;

    // Unpaid amount (Pro feature - for now show 0)
    const unpaidAmount = invoices
      .filter(inv => inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'overdue')
      .reduce((sum, inv) => {
        const total = inv.total || inv.totals?.total || 0;
        return sum + total;
      }, 0);
    document.getElementById('unpaidAmount').textContent = `₹${unpaidAmount.toFixed(2)}`;

    // Top client
    const clientRevenue = {};
    invoices.forEach(inv => {
      const client = inv.clientName || 'Unknown';
      const total = inv.total || inv.totals?.total || 0;
      clientRevenue[client] = (clientRevenue[client] || 0) + total;
    });
    const topClient = Object.keys(clientRevenue).reduce((a, b) =>
      clientRevenue[a] > clientRevenue[b] ? a : b, '');
    document.getElementById('topClient').textContent = topClient || '-';

    // Monthly breakdown
    const monthlyData = {};
    invoices.forEach(inv => {
      const date = new Date(inv.date);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      const total = inv.total || inv.totals?.total || 0;
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + total;
    });

    const monthlyHTML = Object.keys(monthlyData).map(month => `
      <div class="month-item">
        <span class="month-name">${month}</span>
        <span class="month-amount">₹${monthlyData[month].toFixed(2)}</span>
      </div>
    `).join('');

    document.getElementById('monthlyBreakdown').innerHTML = monthlyHTML || '<p class="empty-state">No data available yet</p>';

    // Payment status chart
    const paidCount = invoices.filter(inv => inv.paymentStatus === 'paid').length;
    const unpaidCount = invoices.filter(inv => inv.paymentStatus !== 'paid').length;
    const total = invoices.length;

    document.getElementById('paidCount').textContent = paidCount;
    document.getElementById('unpaidCount').textContent = unpaidCount;
    document.getElementById('paidBar').style.width = `${(paidCount / total) * 100}%`;
    document.getElementById('unpaidBar').style.width = `${(unpaidCount / total) * 100}%`;
  });
}

function showMainForm() {
  document.getElementById('settingsView').style.display = 'none';
  document.getElementById('historyView').style.display = 'none';
  document.getElementById('analyticsView').style.display = 'none';
  document.getElementById('mainForm').style.display = 'block';

  // Clear active nav buttons (main form has no active button)
  document.getElementById('settingsBtn').classList.remove('active');
  document.getElementById('historyBtn').classList.remove('active');
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

    // Track settings saved
    if (typeof analytics !== 'undefined') {
      analytics.trackSettingsSaved();
    }
  });
}

// ==================== LOGO UPLOAD ====================

// Handle Logo Upload
function handleLogoUpload(event) {
  const file = event.target.files[0];

  if (!file) return;

  // Check file size (max 500KB)
  if (file.size > 500 * 1024) {
    showToast('Logo size must be less than 500KB', 'error');
    return;
  }

  // Check file type
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    showToast('Logo must be PNG or JPG format', 'error');
    return;
  }

  // Read file as base64
  const reader = new FileReader();
  reader.onload = function(e) {
    const logoData = e.target.result;

    // Save to storage (use local storage for logo to avoid sync quota limits)
    chrome.storage.local.set({ businessLogo: logoData }, () => {
      // Update preview
      displayLogoPreview(logoData);
      showToast('Logo uploaded successfully!', 'success');
    });
  };
  reader.readAsDataURL(file);
}

// Display Logo Preview
function displayLogoPreview(logoData) {
  const logoImage = document.getElementById('logoImage');
  const placeholder = document.querySelector('.logo-placeholder');
  const removeBtn = document.getElementById('removeLogoBtn');

  if (logoData) {
    logoImage.src = logoData;
    logoImage.style.display = 'block';
    placeholder.style.display = 'none';
    removeBtn.style.display = 'inline-block';
  } else {
    logoImage.style.display = 'none';
    placeholder.style.display = 'flex';
    removeBtn.style.display = 'none';
  }
}

// Remove Logo
function removeLogo() {
  if (confirm('Are you sure you want to remove the logo?')) {
    chrome.storage.local.remove('businessLogo', () => {
      displayLogoPreview(null);
      document.getElementById('businessLogo').value = '';
      showToast('Logo removed', 'info');
    });
  }
}

// Load Logo on Settings Page
async function loadBusinessLogo() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['businessLogo'], (result) => {
      if (result.businessLogo) {
        displayLogoPreview(result.businessLogo);
      } else {
        // No logo - show placeholder
        displayLogoPreview(null);
      }
      resolve();
    });
  });
}

// ==================== SAVED ITEMS LIBRARY ====================

// Add new item to library
async function addSavedItem() {
  const name = document.getElementById('newItemName').value.trim();
  const rate = parseFloat(document.getElementById('newItemRate').value);
  const description = document.getElementById('newItemDescription').value.trim();

  // Validation
  if (!name) {
    showToast('Please enter item name', 'error');
    return;
  }

  if (!rate || rate <= 0) {
    showToast('Please enter a valid rate', 'error');
    return;
  }

  // Check if user is Pro
  const { isPro } = await new Promise((resolve) => {
    chrome.storage.local.get(['isPro'], (result) => {
      resolve({ isPro: result.isPro || false });
    });
  });

  // Check existing saved items count (Free limit: 10)
  const items = await new Promise((resolve) => {
    chrome.storage.sync.get(null, (result) => resolve(result));
  });

  const existingSavedItems = Object.keys(items).filter(key => key.startsWith('saved_item_'));

  if (!isPro && existingSavedItems.length >= 10) {
    showToast('⚠️ Free plan limited to 10 saved items. Upgrade to Pro for unlimited!', 'error');
    showUpgradeModal();
    return;
  }

  // Create saved item
  const savedItem = {
    name: name,
    rate: rate,
    description: description || '',
    savedAt: Date.now()
  };

  // Save to storage
  const itemKey = `saved_item_${Date.now()}`;

  chrome.storage.sync.set({ [itemKey]: savedItem }, () => {
    showToast(`"${name}" added to library!`, 'success');

    // Clear form
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemRate').value = '';
    document.getElementById('newItemDescription').value = '';

    // Reload list
    loadSavedItems();
  });
}

// Load saved items into Settings view
function loadSavedItems() {
  chrome.storage.sync.get(null, (items) => {
    const savedItems = Object.keys(items)
      .filter(key => key.startsWith('saved_item_'))
      .map(key => ({ key, ...items[key] }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const savedItemsList = document.getElementById('savedItemsList');
    const noItemsMsg = document.getElementById('noSavedItems');

    if (savedItems.length === 0) {
      noItemsMsg.style.display = 'block';
      savedItemsList.innerHTML = '<p class="empty-state" id="noSavedItems">No saved items yet. Add your first item below.</p>';
      return;
    }

    // Hide empty message
    if (noItemsMsg) noItemsMsg.style.display = 'none';

    // Generate saved items cards
    const itemsHTML = savedItems.map(item => `
      <div class="saved-item-card" data-key="${item.key}">
        <div class="saved-item-info">
          <div class="saved-item-name">${item.name}</div>
          ${item.description ? `<div class="saved-item-desc">${item.description}</div>` : ''}
          <div class="saved-item-rate">₹${item.rate.toFixed(2)}</div>
        </div>
        <button class="delete-saved-item-btn" data-key="${item.key}" style="background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">Delete</button>
      </div>
    `).join('');

    savedItemsList.innerHTML = itemsHTML;

    // Add delete event listeners
    document.querySelectorAll('.delete-saved-item-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteSavedItem(btn.dataset.key));
    });
  });
}

// Delete saved item
function deleteSavedItem(itemKey) {
  if (confirm('Are you sure you want to delete this saved item?')) {
    chrome.storage.sync.remove([itemKey], () => {
      showToast('Saved item deleted', 'success');
      loadSavedItems();
    });
  }
}

// Get all saved items for dropdown (used in invoice items)
function getSavedItemsForDropdown(callback) {
  chrome.storage.sync.get(null, (items) => {
    const savedItems = Object.keys(items)
      .filter(key => key.startsWith('saved_item_'))
      .map(key => ({ key, ...items[key] }))
      .sort((a, b) => a.name.localeCompare(b.name));

    callback(savedItems);
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
async function saveClientTemplate() {
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

  // Check if user is Pro
  const { isPro } = await new Promise((resolve) => {
    chrome.storage.local.get(['isPro'], (result) => {
      resolve({ isPro: result.isPro || false });
    });
  });

  // Check existing templates count (Free limit: 5)
  const items = await new Promise((resolve) => {
    chrome.storage.sync.get(null, (result) => resolve(result));
  });

  const existingTemplates = Object.keys(items).filter(key => key.startsWith('client_template_'));
  const templateKey = `client_template_${clientName.replace(/\s+/g, '_').toLowerCase()}`;
  const isUpdating = items[templateKey]; // Check if updating existing template

  if (!isPro && existingTemplates.length >= 5 && !isUpdating) {
    showToast('⚠️ Free plan limited to 5 client templates. Upgrade to Pro for unlimited!', 'error');
    showUpgradeModal();
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
  chrome.storage.sync.set({ [templateKey]: template }, () => {
    showToast(`Client "${clientName}" saved as template!`, 'success');
    loadClientTemplatesDropdown();

    // Track client template saved
    if (typeof analytics !== 'undefined') {
      analytics.trackClientTemplateUsed('saved');
    }
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

      // Track client template loaded
      if (typeof analytics !== 'undefined') {
        analytics.trackClientTemplateUsed('loaded');
      }
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

    // Track client template deleted
    if (typeof analytics !== 'undefined') {
      analytics.trackClientTemplateUsed('deleted');
    }
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

  // Get saved items for dropdown
  getSavedItemsForDropdown((savedItems) => {
    const savedItemsDropdown = savedItems.length > 0 ? `
      <div class="form-group" style="margin-bottom: 8px;">
        <label style="font-size: 12px; color: #64748b;">💡 Quick Select from Saved Items (or enter manually below)</label>
        <select class="saved-item-select" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 13px; background: white; cursor: pointer;">
          <option value="">-- Or select from saved items --</option>
          ${savedItems.map(item => `<option value="${item.key}" data-name="${item.name}" data-rate="${item.rate}" data-description="${item.description || ''}">${item.name} - ₹${item.rate.toFixed(2)}</option>`).join('')}
        </select>
      </div>
    ` : '';

    const itemHTML = `
      <div class="invoice-item" data-item-id="${itemId}">
        <div class="item-header">
          <span class="item-number">Item ${itemIndex + 1}</span>
          <button class="remove-item-btn tooltip" data-tooltip="Remove this item" data-item-id="${itemId}">
            <i class="fas fa-times"></i>
          </button>
        </div>
        ${savedItemsDropdown}
        <div class="item-row">
          <div class="form-group">
            <label>Description *</label>
            <input type="text" class="item-description" placeholder="Type item name or select from saved items above" required>
            <small style="display: none; color: #667eea; font-size: 11px; cursor: pointer; margin-top: 4px;" class="save-to-library-link">💾 Save this item to library for future use</small>
          </div>
          <div class="form-group">
            <label>Quantity *</label>
            <input type="number" class="item-quantity" value="1" min="1" step="1" required>
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

    // Saved item select listener
    const savedItemSelect = itemElement.querySelector('.saved-item-select');
    if (savedItemSelect) {
      savedItemSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (selectedOption.value) {
          const name = selectedOption.dataset.name;
          const rate = parseFloat(selectedOption.dataset.rate);
          const description = selectedOption.dataset.description;

          // Populate item fields
          itemElement.querySelector('.item-description').value = description || name;
          itemElement.querySelector('.item-rate').value = rate;

          // Hide save to library link
          itemElement.querySelector('.save-to-library-link').style.display = 'none';

          // Trigger calculation
          calculateTotals();

          showToast(`"${name}" added to invoice`, 'success');
        }
      });
    }

    // Input listeners for automatic calculation
    const quantityInput = itemElement.querySelector('.item-quantity');
    const rateInput = itemElement.querySelector('.item-rate');
    const descriptionInput = itemElement.querySelector('.item-description');
    const saveToLibraryLink = itemElement.querySelector('.save-to-library-link');

    // Quantity change - trigger calculation immediately
    quantityInput.addEventListener('input', () => {
      calculateTotals();
    });

    // Rate change - trigger calculation AND show save to library option
    rateInput.addEventListener('input', () => {
      calculateTotals();

      // Show save to library link if both description and rate are filled
      if (descriptionInput.value.trim() && rateInput.value) {
        saveToLibraryLink.style.display = 'block';
      }
    });

    // Description change - show "save to library" link if manually typed
    descriptionInput.addEventListener('input', () => {
      if (descriptionInput.value.trim() && rateInput.value) {
        saveToLibraryLink.style.display = 'block';
      }
    });

    // Save to library link click
    saveToLibraryLink.addEventListener('click', () => {
      const name = descriptionInput.value.trim();
      const rate = parseFloat(rateInput.value);

      if (name && rate > 0) {
        const savedItem = {
          name: name,
          rate: rate,
          description: name,
          savedAt: Date.now()
        };

        const itemKey = `saved_item_${Date.now()}`;
        chrome.storage.sync.set({ [itemKey]: savedItem }, () => {
          showToast(`"${name}" saved to library!`, 'success');
          saveToLibraryLink.style.display = 'none';
        });
      }
    });

    invoiceItems.push({ id: itemId, description: '', quantity: 1, rate: 0 });
  });
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

      // Free and unlimited for everyone!
      usageText.textContent = `🎉 FREE & UNLIMITED - ${usage.count} invoices generated this month`;
      upgradeBtn.style.display = 'none';
      document.getElementById('usageCounter').classList.remove('limit-reached');

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
async function previewPDF() {
  const data = collectInvoiceData();

  if (!validateInvoiceData(data)) return;

  try {
    // Generate PDF using jsPDF helper
    const doc = await createPDFFromData(data);

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

  // No usage limit - free and unlimited!
  // Just increment counter for stats
  showToast('Generating PDF...', 'info');

  try {
    // Generate PDF using jsPDF helper
    const doc = await createPDFFromData(data);

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

    // Track invoice generation
    if (typeof analytics !== 'undefined') {
      analytics.trackInvoiceGenerated({
        invoiceNumber: data.invoiceNumber,
        hasGST: data.yourDetails.gstin ? true : false,
        itemCount: data.items.length,
        totalAmount: data.total,
        invoiceType: data.yourDetails.state === data.clientState ? 'intrastate' : 'interstate'
      });
    }

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

    historyList.innerHTML = invoices.map(inv => {
      const total = inv.total || inv.totals?.total || 0;
      return `
      <div class="history-item">
        <div class="history-header">
          <span class="history-invoice-number">${inv.invoiceNumber || 'N/A'}</span>
          <span class="history-date">${inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : 'N/A'}</span>
        </div>
        <div class="history-client">${inv.clientName || 'Unknown Client'}</div>
        <div class="history-amount">₹${total.toFixed(2)}</div>
        <div class="history-actions">
          <button class="regenerate-btn" data-key="${inv.key}">Regenerate PDF</button>
          <button class="delete-btn" data-key="${inv.key}">Delete</button>
        </div>
      </div>
      `;
    }).join('');

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
async function createPDFFromData(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const isIntraState = data.yourDetails.state === data.clientState;

  // ========== STANDARD GST INVOICE FORMAT ==========

  // Add logo if available (top-left, professional placement)
  const logoData = await new Promise((resolve) => {
    chrome.storage.local.get(['businessLogo'], (result) => {
      resolve(result.businessLogo || null);
    });
  });

  let startX = 15;
  let startY = 15;

  if (logoData) {
    try {
      // Detect image format from base64 data
      let imageFormat = 'PNG';
      if (logoData.includes('data:image/jpeg')) {
        imageFormat = 'JPEG';
      } else if (logoData.includes('data:image/jpg')) {
        imageFormat = 'JPEG';
      } else if (logoData.includes('data:image/png')) {
        imageFormat = 'PNG';
      }

      console.log('Adding logo to PDF, format:', imageFormat);

      // Add logo with border
      doc.addImage(logoData, imageFormat, startX, startY, 25, 25);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(startX, startY, 25, 25);
      startX = 45; // Move company details to right of logo

      console.log('Logo added successfully');
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      console.error('Logo data preview:', logoData ? logoData.substring(0, 100) : 'null');
      // Continue without logo if error occurs
      startX = 15; // Reset to default position
    }
  } else {
    console.log('No logo data found in storage');
  }

  // Company Details (Seller) - Top Left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.yourDetails.name, startX, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`GSTIN: ${data.yourDetails.gstin}`, startX, startY + 11);

  const addressLines = doc.splitTextToSize(data.yourDetails.address, 80);
  doc.text(addressLines, startX, startY + 16);

  let addressHeight = addressLines.length * 4;

  if (data.yourDetails.email) {
    doc.text(`Email: ${data.yourDetails.email}`, startX, startY + 16 + addressHeight + 1);
    addressHeight += 5;
  }
  if (data.yourDetails.phone) {
    doc.text(`Phone: ${data.yourDetails.phone}`, startX, startY + 16 + addressHeight + 1);
  }

  // TAX INVOICE Title - Top Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TAX INVOICE', 195, 20, { align: 'right' });

  // Invoice Details Box - Top Right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', 150, 30);
  doc.text('Invoice Date:', 150, 36);
  doc.text('Due Date:', 150, 42);

  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 178, 30);
  doc.text(new Date(data.date).toLocaleDateString('en-IN'), 178, 36);
  doc.text(new Date(data.dueDate).toLocaleDateString('en-IN'), 178, 42);

  // Draw horizontal line separator
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(15, 50, 195, 50);

  // Bill To Section (Buyer Details)
  let y = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BILL TO:', 15, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(data.clientName, 15, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (data.clientGSTIN) {
    doc.text(`GSTIN: ${data.clientGSTIN}`, 15, y + 12);
  }

  let clientY = y + (data.clientGSTIN ? 18 : 12);

  if (data.clientAddress) {
    const toAddress = doc.splitTextToSize(data.clientAddress, 80);
    doc.text(toAddress, 15, clientY);
    clientY += toAddress.length * 4;
  }

  if (data.clientEmail) {
    doc.text(`Email: ${data.clientEmail}`, 15, clientY + 4);
    clientY += 5;
  }

  // Place of Supply
  doc.setFont('helvetica', 'bold');
  doc.text(`Place of Supply: `, 15, clientY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientState, 48, clientY + 4);

  // Items Table - position with proper spacing
  y = Math.max(105, clientY + 15);

  // Draw table border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

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
async function regenerateInvoice(key) {
  chrome.storage.local.get([key], async (result) => {
    const data = result[key];
    if (data) {
      try {
        const doc = await createPDFFromData(data);
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

// ==================== MODALS & ONBOARDING ====================

// Show Upgrade Modal
function showUpgradeModal() {
  const modal = document.getElementById('upgradeModal');
  modal.style.display = 'flex';

  // Setup event listeners
  setupUpgradeModalListeners();
}

function setupUpgradeModalListeners() {
  // Close button
  const closeBtn = document.getElementById('closeUpgradeModal');
  if (closeBtn) {
    closeBtn.onclick = closeUpgradeModal;
  }

  // Skip link
  const skipLink = document.getElementById('skipUpgrade');
  if (skipLink) {
    skipLink.onclick = (e) => {
      e.preventDefault();
      closeUpgradeModal();
    };
  }

  // Monthly plan button
  const monthlyBtn = document.getElementById('upgradeMonthlyBtn');
  if (monthlyBtn) {
    monthlyBtn.onclick = () => upgradeToPro('monthly');
  }

  // Annual plan button
  const annualBtn = document.getElementById('upgradeAnnualBtn');
  if (annualBtn) {
    annualBtn.onclick = () => upgradeToPro('annual');
  }

  // Analytics upgrade button
  const analyticsUpgradeBtn = document.getElementById('analyticsUpgradeBtn');
  if (analyticsUpgradeBtn) {
    analyticsUpgradeBtn.onclick = () => upgradeToPro('monthly');
  }

  // Close on overlay click
  const overlay = document.querySelector('#upgradeModal .modal-overlay');
  if (overlay) {
    overlay.onclick = closeUpgradeModal;
  }
}

function closeUpgradeModal() {
  document.getElementById('upgradeModal').style.display = 'none';
}

// Upgrade to Pro
function upgradeToPro(plan) {
  // Track upgrade click
  if (typeof analytics !== 'undefined') {
    analytics.trackUpgradeClick(plan);
  }

  // For now, show coming soon message
  // In Week 4, this will integrate with Stripe
  showToast('🚀 Stripe integration coming soon! For now, enjoy the free tier.', 'info');
  closeUpgradeModal();

  // TODO: Implement Stripe checkout
  // const planId = plan === 'monthly' ? 'price_monthly_299' : 'price_annual_2999';
  // window.open(`https://your-backend.com/checkout?plan=${planId}`, '_blank');
}

// Feedback Form
function openFeedbackForm() {
  // Track feedback click
  if (typeof analytics !== 'undefined') {
    analytics.trackButtonClick('feedback_form', 'feedback_button');
  }

  // Check if feedback URL is configured
  if (FEEDBACK_FORM_URL === 'YOUR_GOOGLE_FORM_URL_HERE') {
    showToast('⚠️ Feedback form URL not configured yet. Please update FEEDBACK_FORM_URL in popup.js', 'warning');
    return;
  }

  // Open feedback form in new tab
  chrome.tabs.create({ url: FEEDBACK_FORM_URL });

  showToast('📝 Thank you for sharing your feedback!', 'success');
}

// Onboarding Flow
function checkAndShowOnboarding() {
  chrome.storage.local.get(['hasSeenOnboarding'], (result) => {
    if (!result.hasSeenOnboarding) {
      showOnboardingModal();
    }
  });
}

function showOnboardingModal() {
  const modal = document.getElementById('onboardingModal');
  modal.style.display = 'flex';
  showOnboardingStep(1);

  // Setup event listeners for onboarding buttons
  setupOnboardingListeners();
}

function setupOnboardingListeners() {
  // Get Started button (Step 1)
  const nextBtn = document.getElementById('onboardingNextBtn');
  if (nextBtn) {
    nextBtn.onclick = () => showOnboardingStep(2);
  }

  // Set Up Now button (Step 2)
  const setupBtn = document.getElementById('onboardingSetupBtn');
  if (setupBtn) {
    setupBtn.onclick = () => {
      // Close onboarding
      document.getElementById('onboardingModal').style.display = 'none';
      // Mark as seen
      chrome.storage.local.set({ hasSeenOnboarding: true });
      // Track onboarding completion
      if (typeof analytics !== 'undefined') {
        analytics.trackOnboardingCompleted('setup');
      }
      // Show settings
      showSettings();
    };
  }

  // Skip for Now button (Step 2)
  const skipBtn = document.getElementById('onboardingSkipBtn');
  if (skipBtn) {
    skipBtn.onclick = () => {
      // Track onboarding skipped
      if (typeof analytics !== 'undefined') {
        analytics.trackOnboardingSkipped('step2');
      }
      showOnboardingStep(3);
    };
  }

  // Start Creating Invoices button (Step 3)
  const finishBtn = document.getElementById('onboardingFinishBtn');
  if (finishBtn) {
    finishBtn.onclick = () => {
      document.getElementById('onboardingModal').style.display = 'none';
      chrome.storage.local.set({ hasSeenOnboarding: true });
      // Track onboarding completion
      if (typeof analytics !== 'undefined') {
        analytics.trackOnboardingCompleted('finish');
      }
    };
  }
}

function showOnboardingStep(step) {
  // Hide all steps
  document.getElementById('onboardingStep1').style.display = 'none';
  document.getElementById('onboardingStep2').style.display = 'none';
  document.getElementById('onboardingStep3').style.display = 'none';

  // Show current step
  document.getElementById(`onboardingStep${step}`).style.display = 'block';
}

// Enhanced checkUsage with modal trigger
async function checkUsageEnhanced() {
  const result = await checkUsage();

  // Show upgrade modal if limit reached and not Pro
  if (!result.isPro && result.usage.count >= 5) {
    // Don't show immediately, wait for user action
    document.getElementById('generatePdfBtn').addEventListener('click', (e) => {
      if (result.usage.count >= 5) {
        e.preventDefault();
        e.stopPropagation();
        showUpgradeModal();
      }
    }, { once: true });
  }

  return result;
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

// Check onboarding on load (call this in DOMContentLoaded)
setTimeout(() => {
  checkAndShowOnboarding();
}, 1000); // Delay to let main UI load first

})(); // End IIFE

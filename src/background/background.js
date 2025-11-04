// Background Service Worker for GST Invoice Generator

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('GST Invoice Generator installed!');

    // Set default values
    chrome.storage.sync.set({
      lastInvoiceNumber: 0
    });

    chrome.storage.local.set({
      monthlyUsage: {
        count: 0,
        month: new Date().getMonth()
      },
      isPro: false
    });

    // Open welcome/onboarding page (optional)
    // chrome.tabs.create({ url: 'welcome.html' });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkProStatus') {
    // Check if user is Pro (will integrate with backend later)
    chrome.storage.local.get(['isPro'], (result) => {
      sendResponse({ isPro: result.isPro || false });
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'resetMonthlyUsage') {
    // Admin action to reset usage (for testing)
    chrome.storage.local.set({
      monthlyUsage: {
        count: 0,
        month: new Date().getMonth()
      }
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Monthly usage reset is handled in popup.js when user opens extension
// No need for alarms API in MVP

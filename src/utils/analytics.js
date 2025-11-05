// Google Analytics 4 - Measurement Protocol for Chrome Extensions
// Documentation: https://developers.google.com/analytics/devguides/collection/protocol/ga4

class Analytics {
  constructor() {
    // Replace with your actual GA4 Measurement ID
    this.measurementId = 'G-FQW9RSD45W'; // TODO: Replace with real Measurement ID
    this.apiSecret = 'MlOWFdOMR1i7vCHrrgCLQw'; // TODO: Replace with real API Secret
    this.endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;

    // Get or generate client ID
    this.clientId = null;
    this.sessionId = null;
    this.initialized = false;

    this.init();
  }

  async init() {
    try {
      // Get or create client ID (persistent user identifier)
      const result = await chrome.storage.local.get(['analyticsClientId', 'analyticsSessionId']);

      if (result.analyticsClientId) {
        this.clientId = result.analyticsClientId;
      } else {
        this.clientId = this.generateClientId();
        await chrome.storage.local.set({ analyticsClientId: this.clientId });
      }

      // Generate session ID (changes per session)
      this.sessionId = Date.now().toString();
      await chrome.storage.local.set({ analyticsSessionId: this.sessionId });

      this.initialized = true;
      console.log('Analytics initialized with client ID:', this.clientId);
    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  }

  generateClientId() {
    // Generate a unique client ID (UUID-like)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async sendEvent(eventName, eventParams = {}) {
    if (!this.initialized) {
      await this.init();
    }

    // Don't send analytics if measurement ID is not configured
    if (this.measurementId === 'G-XXXXXXXXXX') {
      console.log('Analytics not configured. Event:', eventName, eventParams);
      return;
    }

    try {
      const payload = {
        client_id: this.clientId,
        events: [{
          name: eventName,
          params: {
            session_id: this.sessionId,
            engagement_time_msec: '100',
            ...eventParams
          }
        }]
      };

      await fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log('Analytics event sent:', eventName, eventParams);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  // Track page views
  async trackPageView(pageName, pageTitle) {
    await this.sendEvent('page_view', {
      page_title: pageTitle || pageName,
      page_location: pageName
    });
  }

  // Track extension installation
  async trackInstall() {
    await this.sendEvent('extension_installed', {
      install_date: new Date().toISOString()
    });
  }

  // Track invoice generation
  async trackInvoiceGenerated(invoiceData) {
    await this.sendEvent('invoice_generated', {
      invoice_number: invoiceData.invoiceNumber,
      has_gst: invoiceData.hasGST || false,
      item_count: invoiceData.itemCount || 0,
      total_amount: invoiceData.totalAmount || 0,
      invoice_type: invoiceData.invoiceType || 'standard'
    });
  }

  // Track settings saved
  async trackSettingsSaved() {
    await this.sendEvent('settings_saved');
  }

  // Track upgrade clicks
  async trackUpgradeClick(source) {
    await this.sendEvent('upgrade_click', {
      source: source // 'modal', 'banner', 'settings', etc.
    });
  }

  // Track feature usage
  async trackFeatureUsed(featureName) {
    await this.sendEvent('feature_used', {
      feature_name: featureName
    });
  }

  // Track errors
  async trackError(errorMessage, errorContext) {
    await this.sendEvent('error_occurred', {
      error_message: errorMessage,
      error_context: errorContext
    });
  }

  // Track user engagement
  async trackEngagement(action, label, value) {
    await this.sendEvent('user_engagement', {
      engagement_action: action,
      engagement_label: label,
      engagement_value: value
    });
  }

  // Track button clicks
  async trackButtonClick(buttonName, context) {
    await this.sendEvent('button_click', {
      button_name: buttonName,
      click_context: context || 'unknown'
    });
  }

  // Track client template usage
  async trackClientTemplateUsed(action) {
    await this.sendEvent('client_template_action', {
      action: action // 'saved', 'loaded', 'deleted'
    });
  }

  // Track onboarding completion
  async trackOnboardingCompleted(step) {
    await this.sendEvent('onboarding_completed', {
      completed_step: step
    });
  }

  // Track onboarding skipped
  async trackOnboardingSkipped(step) {
    await this.sendEvent('onboarding_skipped', {
      skipped_at_step: step
    });
  }
}

// Create singleton instance
const analytics = new Analytics();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = analytics;
}

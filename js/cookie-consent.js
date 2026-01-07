/**
 * Cookie Consent Management
 * Handles GDPR-compliant consent for third-party embeds and comments
 */

(function() {
  'use strict';

  // Consent constants
  const CONSENT_KEY = 'cookie-consent';
  const CONSENT_VERSION = '1.0';
  const CONSENT_EXPIRY_DAYS = 365;

  // Consent categories
  const CATEGORIES = {
    ESSENTIAL: 'essential',  // Always enabled (theme preference, etc.)
    COMMENTS: 'comments',    // Giscus comment system
    EMBEDS: 'embeds'         // YouTube, Gists, SlideShare, Channel9
  };

  /**
   * Get stored consent preferences
   */
  function getConsent() {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) return null;

      const consent = JSON.parse(stored);

      // Check if consent has expired
      if (consent.timestamp) {
        const consentDate = new Date(consent.timestamp);
        const expiryDate = new Date(consentDate);
        expiryDate.setDate(expiryDate.getDate() + CONSENT_EXPIRY_DAYS);

        if (new Date() > expiryDate) {
          // Consent expired, clear it
          localStorage.removeItem(CONSENT_KEY);
          return null;
        }
      }

      return consent;
    } catch (e) {
      console.error('Error reading consent:', e);
      return null;
    }
  }

  /**
   * Save consent preferences
   */
  function saveConsent(preferences) {
    try {
      const consent = {
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        comments: preferences.comments || false,
        embeds: preferences.embeds || false
      };

      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));

      // Dispatch event for other scripts to listen to
      window.dispatchEvent(new CustomEvent('consentChanged', { detail: consent }));

      return consent;
    } catch (e) {
      console.error('Error saving consent:', e);
      return null;
    }
  }

  /**
   * Check if user has consented to a specific category
   */
  function hasConsent(category) {
    if (category === CATEGORIES.ESSENTIAL) {
      return true; // Essential is always allowed
    }

    const consent = getConsent();
    if (!consent) return false;

    return consent[category] === true;
  }

  /**
   * Accept all non-essential cookies
   */
  function acceptAll() {
    const consent = saveConsent({
      comments: true,
      embeds: true
    });

    hideBanner();
    loadConsentedContent();
  }

  /**
   * Reject all non-essential cookies
   */
  function rejectAll() {
    const consent = saveConsent({
      comments: false,
      embeds: false
    });

    hideBanner();
  }

  /**
   * Show customize modal
   */
  function showCustomize() {
    const modal = document.getElementById('cookie-settings-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
  }

  /**
   * Hide customize modal
   */
  function hideCustomize() {
    const modal = document.getElementById('cookie-settings-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = ''; // Restore scroll
    }
  }

  /**
   * Save custom preferences from modal
   */
  function saveCustomPreferences() {
    const commentsCheckbox = document.getElementById('consent-comments');
    const embedsCheckbox = document.getElementById('consent-embeds');

    const consent = saveConsent({
      comments: commentsCheckbox ? commentsCheckbox.checked : false,
      embeds: embedsCheckbox ? embedsCheckbox.checked : false
    });

    hideCustomize();
    hideBanner();
    loadConsentedContent();
  }

  /**
   * Hide the cookie banner
   */
  function hideBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  }

  /**
   * Show the cookie banner
   */
  function showBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
  }

  /**
   * Revoke consent and show banner again
   */
  function revokeConsent() {
    localStorage.removeItem(CONSENT_KEY);

    // Reload page to reset all embeds
    window.location.reload();
  }

  /**
   * Load content that user has consented to
   */
  function loadConsentedContent() {
    // Trigger loading of comments if consented
    if (hasConsent(CATEGORIES.COMMENTS)) {
      window.dispatchEvent(new CustomEvent('loadComments'));
    }

    // Trigger loading of embeds if consented
    if (hasConsent(CATEGORIES.EMBEDS)) {
      window.dispatchEvent(new CustomEvent('loadEmbeds'));
    }
  }

  /**
   * Enable a specific embed instance
   */
  function enableEmbed(embedId) {
    // Grant temporary consent for this session if not already granted
    const consent = getConsent() || { comments: false, embeds: false };

    if (!consent.embeds) {
      // Ask user if they want to enable all embeds
      const enableAll = confirm(
        'Would you like to enable all embedded content on this site?\n\n' +
        'Click OK to enable all embeds, or Cancel to enable just this one for this session.'
      );

      if (enableAll) {
        consent.embeds = true;
        saveConsent(consent);
        loadConsentedContent();
      } else {
        // Just load this specific embed without saving consent
        const embedElement = document.getElementById(embedId);
        if (embedElement && embedElement.dataset.loadFunction) {
          try {
            const loadFn = new Function('element', embedElement.dataset.loadFunction);
            loadFn(embedElement);
          } catch (e) {
            console.error('Error loading embed:', e);
          }
        }
      }
    }
  }

  /**
   * Enable comments
   */
  function enableComments() {
    const consent = getConsent() || { comments: false, embeds: false };
    consent.comments = true;
    saveConsent(consent);
    window.dispatchEvent(new CustomEvent('loadComments'));
  }

  /**
   * Initialize consent system
   */
  function initConsent() {
    const consent = getConsent();

    // If no consent stored, show banner
    if (!consent) {
      showBanner();
    } else {
      // Load content user has consented to
      loadConsentedContent();
    }

    // Set up event listeners
    setupEventListeners();
  }

  /**
   * Set up event listeners for buttons
   */
  function setupEventListeners() {
    // Accept All button
    const acceptBtn = document.getElementById('cookie-accept-all');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', acceptAll);
    }

    // Reject All button
    const rejectBtn = document.getElementById('cookie-reject-all');
    if (rejectBtn) {
      rejectBtn.addEventListener('click', rejectAll);
    }

    // Customize button
    const customizeBtn = document.getElementById('cookie-customize');
    if (customizeBtn) {
      customizeBtn.addEventListener('click', showCustomize);
    }

    // Save custom preferences button
    const saveBtn = document.getElementById('cookie-save-preferences');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveCustomPreferences);
    }

    // Close modal button
    const closeBtn = document.getElementById('cookie-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideCustomize);
    }

    // Close modal on backdrop click
    const modal = document.getElementById('cookie-settings-modal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          hideCustomize();
        }
      });
    }

    // Revoke consent link (if added to footer)
    const revokeBtn = document.getElementById('cookie-revoke');
    if (revokeBtn) {
      revokeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        revokeConsent();
      });
    }
  }

  /**
   * Populate modal with current preferences
   */
  function populateModalPreferences() {
    const consent = getConsent();
    if (!consent) return;

    const commentsCheckbox = document.getElementById('consent-comments');
    const embedsCheckbox = document.getElementById('consent-embeds');

    if (commentsCheckbox) {
      commentsCheckbox.checked = consent.comments || false;
    }
    if (embedsCheckbox) {
      embedsCheckbox.checked = consent.embeds || false;
    }
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initConsent();
      populateModalPreferences();
    });
  } else {
    initConsent();
    populateModalPreferences();
  }

  // Expose public API
  window.cookieConsent = {
    hasConsent: hasConsent,
    getConsent: getConsent,
    acceptAll: acceptAll,
    rejectAll: rejectAll,
    revokeConsent: revokeConsent,
    enableEmbed: enableEmbed,
    enableComments: enableComments,
    categories: CATEGORIES
  };

})();

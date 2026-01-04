/**
 * Dark Mode Theme Toggle
 * Handles system preference detection, localStorage persistence, and manual toggling
 */

(function() {
  'use strict';

  // Theme constants
  const THEME_KEY = 'theme-preference';
  const THEME_DARK = 'dark';
  const THEME_LIGHT = 'light';
  const CLASS_DARK = 'dark';

  /**
   * Get initial theme preference
   * Priority: localStorage > system preference > light (default)
   */
  function getInitialTheme() {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === THEME_DARK || stored === THEME_LIGHT) {
      return stored;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME_DARK;
    }

    return THEME_LIGHT;
  }

  /**
   * Apply theme to document
   */
  function applyTheme(theme) {
    const html = document.documentElement;

    if (theme === THEME_DARK) {
      html.classList.add(CLASS_DARK);
    } else {
      html.classList.remove(CLASS_DARK);
    }

    // Store preference
    localStorage.setItem(THEME_KEY, theme);

    // Update toggle button if it exists
    updateToggleButton(theme);
  }

  /**
   * Update toggle button icon and aria-label (handles both desktop and mobile)
   */
  function updateToggleButton(theme) {
    const toggleButtons = [
      document.getElementById('theme-toggle'),
      document.getElementById('theme-toggle-mobile')
    ];

    toggleButtons.forEach(toggleButton => {
      if (!toggleButton) return;

      const sunIcon = toggleButton.querySelector('.theme-icon-sun');
      const moonIcon = toggleButton.querySelector('.theme-icon-moon');

      if (theme === THEME_DARK) {
        // Show sun icon (to switch to light)
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
        toggleButton.setAttribute('aria-label', 'Switch to light mode');
      } else {
        // Show moon icon (to switch to dark)
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
        toggleButton.setAttribute('aria-label', 'Switch to dark mode');
      }
    });
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains(CLASS_DARK)
      ? THEME_DARK
      : THEME_LIGHT;

    const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    applyTheme(newTheme);
  }

  /**
   * Initialize theme on page load
   */
  function initTheme() {
    const theme = getInitialTheme();
    applyTheme(theme);

    // Set up toggle button click handlers for both desktop and mobile
    const toggleButtons = [
      document.getElementById('theme-toggle'),
      document.getElementById('theme-toggle-mobile')
    ];

    toggleButtons.forEach(toggleButton => {
      if (toggleButton) {
        toggleButton.addEventListener('click', toggleTheme);

        // Keyboard accessibility
        toggleButton.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTheme();
          }
        });
      }
    });

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // Use addEventListener if available (modern browsers)
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', function(e) {
          // Only auto-update if user hasn't set a manual preference
          const stored = localStorage.getItem(THEME_KEY);
          if (!stored) {
            applyTheme(e.matches ? THEME_DARK : THEME_LIGHT);
          }
        });
      }
    }
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  // Expose toggle function globally for debugging/manual control
  window.toggleTheme = toggleTheme;
})();

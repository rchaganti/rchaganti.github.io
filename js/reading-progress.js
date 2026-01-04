/**
 * Reading Progress Bar
 * Shows a progress bar at the top indicating how far the user has scrolled through the article
 */

(function() {
  'use strict';

  // Get the progress bar element
  const progressBar = document.getElementById('reading-progress');

  if (!progressBar) {
    return; // Exit if progress bar doesn't exist
  }

  let ticking = false;

  /**
   * Calculate and update the progress bar width based on scroll position
   */
  function updateProgressBar() {
    // Get the article element (main content area)
    const article = document.querySelector('article');

    if (!article) {
      ticking = false;
      return;
    }

    // Calculate scroll progress
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || window.pageYOffset;

    // Calculate the total scrollable distance
    const scrollableDistance = documentHeight - windowHeight;

    // Calculate progress percentage (0-100)
    let progress = 0;
    if (scrollableDistance > 0) {
      progress = (scrollTop / scrollableDistance) * 100;
    }

    // Clamp progress between 0 and 100
    progress = Math.min(100, Math.max(0, progress));

    // Update the progress bar width
    progressBar.style.width = progress + '%';

    ticking = false;
  }

  /**
   * Request animation frame for scroll handler (performance optimization)
   */
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateProgressBar);
      ticking = true;
    }
  }

  // Event Listeners
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Initial calculation on page load
  updateProgressBar();

})();

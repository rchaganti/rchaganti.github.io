/**
 * Back to Top Button
 * Shows/hides a button that smoothly scrolls to top of page
 */

(function() {
  'use strict';

  // Get the button element
  const backToTopButton = document.getElementById('back-to-top');

  if (!backToTopButton) {
    return; // Exit if button doesn't exist
  }

  // Configuration
  const SCROLL_THRESHOLD = 300; // Show button after scrolling 300px
  let isVisible = false;
  let ticking = false;

  /**
   * Show the back to top button
   */
  function showButton() {
    if (!isVisible) {
      backToTopButton.classList.add('show');
      isVisible = true;
    }
  }

  /**
   * Hide the back to top button
   */
  function hideButton() {
    if (isVisible) {
      backToTopButton.classList.remove('show');
      isVisible = false;
    }
  }

  /**
   * Check scroll position and show/hide button accordingly
   */
  function checkScrollPosition() {
    const scrollY = window.scrollY || window.pageYOffset;

    if (scrollY > SCROLL_THRESHOLD) {
      showButton();
    } else {
      hideButton();
    }

    ticking = false;
  }

  /**
   * Request animation frame for scroll handler (performance optimization)
   */
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(checkScrollPosition);
      ticking = true;
    }
  }

  /**
   * Smooth scroll to top of page
   */
  function scrollToTop(event) {
    event.preventDefault();

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Handle keyboard interaction
   */
  function handleKeyPress(event) {
    // Trigger on Enter or Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      scrollToTop(event);
    }
  }

  // Event Listeners
  window.addEventListener('scroll', onScroll, { passive: true });
  backToTopButton.addEventListener('click', scrollToTop);
  backToTopButton.addEventListener('keydown', handleKeyPress);

  // Initial check on page load
  checkScrollPosition();

})();

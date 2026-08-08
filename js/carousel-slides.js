/**
 * Interactive Markdown Slide Carousel Component
 * Handles slide navigation, touch swipe, keyboard shortcuts, slide text copying,
 * auto height adjustments, and fullscreen presentation mode.
 */
document.addEventListener('DOMContentLoaded', () => {
  initSlideCarousels();
});

function initSlideCarousels() {
  const carousels = document.querySelectorAll('.slide-carousel-container');
  carousels.forEach(carousel => setupCarousel(carousel));
}

function setupCarousel(carousel) {
  if (carousel.dataset.initialized === 'true') return;
  carousel.dataset.initialized = 'true';

  const totalSlides = parseInt(carousel.dataset.totalSlides, 10) || 0;
  if (totalSlides <= 0) return;

  let currentSlide = 0;
  let isHovered = false;

  const track = carousel.querySelector('.carousel-track');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const viewport = carousel.querySelector('.carousel-viewport');

  const counter = carousel.querySelector('.carousel-counter');
  const prevBtns = carousel.querySelectorAll('.carousel-prev-btn, .carousel-float-prev');
  const nextBtns = carousel.querySelectorAll('.carousel-next-btn, .carousel-float-next');
  const dots = carousel.querySelectorAll('.carousel-dot-btn');
  const copyBtn = carousel.querySelector('.carousel-copy-btn');
  const expandBtn = carousel.querySelector('.carousel-expand-btn');

  function updateView() {
    // 1. Update track position
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    // 2. Update height to active slide
    if (slides[currentSlide]) {
      const activeSlideInner = slides[currentSlide].querySelector('.slide-content-inner');
      if (activeSlideInner) {
        const targetHeight = activeSlideInner.offsetHeight + 60; // include padding
        viewport.style.height = `${targetHeight}px`;
      }
    }

    // 3. Update counter text
    if (counter) {
      counter.textContent = `${currentSlide + 1} / ${totalSlides}`;
    }

    // 4. Update buttons state
    prevBtns.forEach(btn => {
      btn.disabled = currentSlide === 0;
    });

    nextBtns.forEach(btn => {
      btn.disabled = currentSlide === totalSlides - 1;
    });

    // 5. Update dots
    dots.forEach((dot, index) => {
      if (index === currentSlide) {
        dot.className = 'carousel-dot-btn h-2.5 w-6 rounded-full bg-indigo-600 dark:bg-indigo-400 opacity-100 transition-all duration-200 focus:outline-none';
      } else {
        dot.className = 'carousel-dot-btn h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 opacity-60 hover:opacity-100 transition-all duration-200 focus:outline-none';
      }
    });
  }

  function goToSlide(index) {
    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;
    currentSlide = index;
    updateView();
  }

  // Event Listeners for Prev/Next
  prevBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      goToSlide(currentSlide - 1);
    });
  });

  nextBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      goToSlide(currentSlide + 1);
    });
  });

  // Dot clicks
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      const targetIndex = parseInt(dot.dataset.slideTarget, 10);
      if (!isNaN(targetIndex)) {
        goToSlide(targetIndex);
      }
    });
  });

  // Hover detection for keyboard focus
  carousel.addEventListener('mouseenter', () => { isHovered = true; });
  carousel.addEventListener('mouseleave', () => { isHovered = false; });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const isFullscreen = carousel.classList.contains('is-fullscreen');
    if (!isHovered && !isFullscreen) return;

    if (e.key === 'ArrowLeft') {
      goToSlide(currentSlide - 1);
    } else if (e.key === 'ArrowRight') {
      goToSlide(currentSlide + 1);
    } else if (e.key === 'Escape' && isFullscreen) {
      toggleFullscreen();
    }
  });

  // Touch Swipe Support
  let startX = 0;
  let startY = 0;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;

      // Only trigger horizontal swipe if deltaX is larger than vertical scrolling
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          goToSlide(currentSlide + 1); // Swipe left -> next
        } else {
          goToSlide(currentSlide - 1); // Swipe right -> prev
        }
      }
    }
  }, { passive: true });

  // Copy Slide Content
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const activeSlide = slides[currentSlide];
      if (!activeSlide) return;

      const textToCopy = activeSlide.innerText || activeSlide.textContent || '';
      navigator.clipboard.writeText(textToCopy.trim()).then(() => {
        const textSpan = copyBtn.querySelector('.btn-text');
        const oldText = textSpan ? textSpan.textContent : '';
        if (textSpan) textSpan.textContent = 'Copied!';
        copyBtn.classList.add('text-indigo-600', 'dark:text-indigo-400');

        setTimeout(() => {
          if (textSpan) textSpan.textContent = oldText;
          copyBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy slide text:', err);
      });
    });
  }

  // Toggle Fullscreen Mode
  function toggleFullscreen() {
    const isFullscreen = carousel.classList.contains('is-fullscreen');
    const textSpan = expandBtn ? expandBtn.querySelector('.btn-text') : null;

    if (!isFullscreen) {
      carousel.classList.add('is-fullscreen');
      document.body.classList.add('overflow-hidden');
      if (textSpan) textSpan.textContent = 'Exit';
      viewport.style.height = '100%';
    } else {
      carousel.classList.remove('is-fullscreen');
      document.body.classList.remove('overflow-hidden');
      if (textSpan) textSpan.textContent = 'Expand';
      updateView();
    }
  }

  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFullscreen();
    });
  }

  // Initial setup
  setTimeout(updateView, 50);
  window.addEventListener('resize', updateView);
}

// Book Slider Functionality
document.addEventListener('DOMContentLoaded', function() {
  const slides = document.querySelectorAll('.book-slide');
  const dots = document.querySelectorAll('.slider-dot');
  const prevButton = document.querySelector('.slider-prev');
  const nextButton = document.querySelector('.slider-next');

  if (slides.length === 0) return;

  let currentSlide = 0;

  function showSlide(index) {
    // Hide all slides
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // Show current slide
    slides[index].classList.add('active');
    dots[index].classList.add('active');

    currentSlide = index;
  }

  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    showSlide(next);
  }

  function prevSlide() {
    const prev = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(prev);
  }

  // Event listeners
  if (nextButton) {
    nextButton.addEventListener('click', nextSlide);
  }

  if (prevButton) {
    prevButton.addEventListener('click', prevSlide);
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => showSlide(index));
  });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  });

  // Touch swipe support for mobile devices
  const slider = document.querySelector('.book-slider');
  if (slider) {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    slider.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    slider.addEventListener('touchmove', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
    }, { passive: true });

    slider.addEventListener('touchend', () => {
      const swipeDistanceX = touchStartX - touchEndX;
      const swipeDistanceY = Math.abs(touchStartY - touchEndY);
      const minSwipeDistance = 50; // Minimum distance for swipe

      // Only handle horizontal swipes (ignore if more vertical movement)
      if (Math.abs(swipeDistanceX) > minSwipeDistance && Math.abs(swipeDistanceX) > swipeDistanceY) {
        if (swipeDistanceX > 0) {
          // Swipe left - go to next
          nextSlide();
        } else {
          // Swipe right - go to previous
          prevSlide();
        }
      }
    }, { passive: true });
  }

  // Optional: Auto-play (uncomment if desired)
  // setInterval(nextSlide, 5000);
});

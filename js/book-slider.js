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

  // Optional: Auto-play (uncomment if desired)
  // setInterval(nextSlide, 5000);
});

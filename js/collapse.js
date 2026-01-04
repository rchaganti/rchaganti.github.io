// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Collapse.js loaded'); // Debug log

  // Table of Contents Toggle
  const tocButton = document.querySelector('[aria-controls="toc-content"]');
  if (tocButton) {
    console.log('TOC button found'); // Debug log
    tocButton.addEventListener('click', function() {
      const content = document.getElementById('toc-content');
      const chevron = document.getElementById('toc-chevron');

      if (content && chevron) {
        content.classList.toggle('collapsed');
        chevron.classList.toggle('-rotate-90');

        // Update aria-expanded
        const isExpanded = !content.classList.contains('collapsed');
        this.setAttribute('aria-expanded', isExpanded);
      }
    });
  }

  // Series Sidebar Toggle
  const seriesButton = document.querySelector('[aria-controls="series-content"]');
  if (seriesButton) {
    console.log('Series button found'); // Debug log
    seriesButton.addEventListener('click', function() {
      const content = document.getElementById('series-content');
      const description = document.getElementById('series-description');
      const chevron = document.getElementById('series-chevron');

      if (content && chevron) {
        content.classList.toggle('collapsed');
        if (description) {
          description.classList.toggle('collapsed');
        }
        chevron.classList.toggle('-rotate-90');

        // Update aria-expanded
        const isExpanded = !content.classList.contains('collapsed');
        this.setAttribute('aria-expanded', isExpanded);
      }
    });
  }

  // Smooth scroll for TOC links
  const tocLinks = document.querySelectorAll('#toc-content a');

  tocLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        // Offset for sticky header
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Update URL hash
        history.pushState(null, null, '#' + targetId);
      }
    });
  });

  // Highlight active TOC link on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute('id');
      const tocLink = document.querySelector(`#toc-content a[href="#${id}"]`);

      if (tocLink) {
        if (entry.isIntersecting) {
          tocLink.classList.add('font-bold', 'text-primary');
        } else {
          tocLink.classList.remove('font-bold', 'text-primary');
        }
      }
    });
  }, {
    rootMargin: '-80px 0px -80% 0px'
  });

  // Observe all headings
  document.querySelectorAll('article h2[id], article h3[id], article h4[id]').forEach(heading => {
    observer.observe(heading);
  });
});

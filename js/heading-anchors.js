document.addEventListener('DOMContentLoaded', function () {
  const headings = document.querySelectorAll('.prose h2, .prose h3, .prose h4, .prose h5, .prose h6');

  headings.forEach(heading => {
    if (heading.id) {
      const anchor = document.createElement('a');
      anchor.className = 'header-anchor';
      anchor.href = '#' + heading.id;
      anchor.setAttribute('aria-label', 'Anchor');

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.classList.add('anchor-icon');

      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71');

      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71');

      svg.appendChild(path1);
      svg.appendChild(path2);
      anchor.appendChild(svg);
      heading.appendChild(anchor);
    }
  });
});

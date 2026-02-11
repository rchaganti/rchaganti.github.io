document.addEventListener('DOMContentLoaded', () => {
    const toc = document.getElementById('sidebar-toc');
    if (!toc) return;

    const links = toc.querySelectorAll('a');
    const content = document.querySelector('.prose');
    if (!content) return;

    const headers = Array.from(content.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    if (headers.length === 0) return;

    // Smooth scrolling for TOC links
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetHeader = document.getElementById(targetId);
            
            if (targetHeader) {
                // Adjust for sticky header if you have one, or just a bit of padding
                const headerOffset = 100; 
                const elementPosition = targetHeader.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });

                // Update URL hash without jumping
                history.pushState(null, null, '#' + targetId);
            }
        });
    });

    // ScrollSpy implementation using IntersectionObserver
    const observerOptions = {
        root: null,
        rootMargin: '-10% 0px -80% 0px', // Trigger when header is near the top
        threshold: 0
    };

    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = entry.target.id;
                
                // Remove active class from all links
                links.forEach(link => {
                    link.classList.remove('active');
                    // Also expand/collapse parents if implementing nested collapsing
                });

                // Add active class to corresponding link
                const activeLink = toc.querySelector(`a[href="#${activeId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                    
                    // Optional: Scroll TOC to keep active item in view
                    const tocRect = toc.getBoundingClientRect();
                    const linkRect = activeLink.getBoundingClientRect();
                    
                    if (linkRect.top < tocRect.top || linkRect.bottom > tocRect.bottom) {
                        activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                }
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    headers.forEach(header => observer.observe(header));
    
    // Fallback/highlight on load if hash exists
    if (window.location.hash) {
        const activeLink = toc.querySelector(`a[href="${window.location.hash}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
});

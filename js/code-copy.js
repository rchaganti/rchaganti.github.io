// Add copy buttons to code blocks
document.addEventListener('DOMContentLoaded', function() {
  const codeBlocks = document.querySelectorAll('.highlight');

  codeBlocks.forEach(function(codeBlock) {
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', 'Copy code to clipboard');

    // Add click event
    copyButton.addEventListener('click', function() {
      // Find the code content (skip line numbers)
      const codeContent = codeBlock.querySelector('.lntd:last-child code') ||
                         codeBlock.querySelector('code');

      if (codeContent) {
        const textToCopy = codeContent.textContent || codeContent.innerText;

        // Copy to clipboard
        navigator.clipboard.writeText(textToCopy).then(function() {
          // Change button text to indicate success
          copyButton.textContent = 'Copied!';
          copyButton.classList.add('copied');

          // Reset after 2 seconds
          setTimeout(function() {
            copyButton.textContent = 'Copy';
            copyButton.classList.remove('copied');
          }, 2000);
        }).catch(function(err) {
          console.error('Failed to copy:', err);
          copyButton.textContent = 'Failed';

          setTimeout(function() {
            copyButton.textContent = 'Copy';
          }, 2000);
        });
      }
    });

    // Add button to code block
    codeBlock.appendChild(copyButton);
  });
});

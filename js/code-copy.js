// Add copy buttons and language labels to code blocks
document.addEventListener('DOMContentLoaded', function() {
  const codeBlocks = document.querySelectorAll('.highlight');

  codeBlocks.forEach(function(codeBlock) {
    // Find the code element to get language info
    const codeElement = codeBlock.querySelector('code[data-lang]');

    // Create language label if language is specified
    if (codeElement) {
      const language = codeElement.getAttribute('data-lang');
      if (language) {
        const languageLabel = document.createElement('span');
        languageLabel.className = 'language-label';
        languageLabel.textContent = formatLanguageName(language);
        languageLabel.setAttribute('aria-label', 'Programming language: ' + language);
        codeBlock.appendChild(languageLabel);
      }
    }

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

// Format language name for display
function formatLanguageName(lang) {
  const languageNames = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'py': 'Python',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'csharp': 'C#',
    'php': 'PHP',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'sh': 'Shell',
    'bash': 'Bash',
    'shell': 'Shell',
    'powershell': 'PowerShell',
    'ps1': 'PowerShell',
    'sql': 'SQL',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'markdown': 'Markdown',
    'docker': 'Dockerfile',
    'dockerfile': 'Dockerfile',
    'nginx': 'NGINX',
    'apache': 'Apache',
    'graphql': 'GraphQL',
    'terraform': 'Terraform',
    'hcl': 'HCL'
  };

  return languageNames[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
}

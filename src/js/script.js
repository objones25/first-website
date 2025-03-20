// Check for saved theme preference, otherwise use system preference
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = localStorage.getItem('theme');

// Import search functionality
import { includeSearch } from './include-search.js';

if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
} else if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
} else if (prefersDarkScheme.matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
}

// Theme toggle functionality
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Add theme toggle button and search functionality to all pages
document.addEventListener('DOMContentLoaded', async () => {
    // Add theme toggle
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.innerHTML = '🌓';
    button.setAttribute('aria-label', 'Toggle dark mode');
    button.onclick = toggleTheme;
    document.body.appendChild(button);

    // Initialize search
    await includeSearch();
}); 
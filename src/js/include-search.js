// Function to include search functionality in all pages
export async function includeSearch() {
    try {
        // Get the navigation element
        const nav = document.querySelector('nav');
        if (!nav) return;

        // Fetch the search template
        const response = await fetch('/templates/search.html');
        if (!response.ok) {
            console.error('Failed to load search template');
            return;
        }

        const searchHtml = await response.text();
        if (!searchHtml) {
            console.error('Empty search template');
            return;
        }

        const parts = searchHtml.split('<!-- Search Overlay -->');
        if (parts.length !== 2) {
            console.error('Invalid search template format');
            return;
        }

        // Insert the search button into navigation
        const searchButtonHtml = parts[0].trim();
        if (searchButtonHtml) {
            nav.insertAdjacentHTML('beforeend', searchButtonHtml);
        }

        // Insert the search overlay into body
        const searchOverlayHtml = parts[1].trim();
        if (searchOverlayHtml) {
            document.body.insertAdjacentHTML('beforeend', searchOverlayHtml);
        }

        // Initialize search functionality only if both parts were inserted
        if (document.querySelector('.search-button') && document.querySelector('.search-overlay')) {
            const searchScript = document.createElement('script');
            searchScript.type = 'module';
            searchScript.textContent = `
                import ProjectSearch from './js/search.js';
                new ProjectSearch();
            `;
            document.body.appendChild(searchScript);
        }
    } catch (error) {
        console.error('Error including search:', error);
        // Clean up any partially inserted elements
        const searchButton = document.querySelector('.search-button');
        const searchOverlay = document.querySelector('.search-overlay');
        if (searchButton) searchButton.remove();
        if (searchOverlay) searchOverlay.remove();
    }
} 
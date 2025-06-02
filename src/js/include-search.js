// Function to include search functionality in all pages
import ProjectSearch from './search.js';

export async function includeSearch() {
    try {
        // Get the navigation element
        const nav = document.querySelector('nav');
        if (!nav) return;

        // Fetch the search template with the correct path
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

        // Initialize search functionality directly
        if (document.querySelector('.search-button') && document.querySelector('.search-overlay')) {
            new ProjectSearch();
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

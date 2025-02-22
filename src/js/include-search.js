// Function to include search functionality in all pages
export async function includeSearch() {
    try {
        // Get the navigation element
        const nav = document.querySelector('nav');
        if (!nav) return;

        // Fetch the search template
        const response = await fetch('/templates/search.html');
        const searchHtml = await response.text();

        // Insert the search button into navigation
        const searchButtonHtml = searchHtml.split('<!-- Search Overlay -->')[0];
        nav.insertAdjacentHTML('beforeend', searchButtonHtml);

        // Insert the search overlay into body
        const searchOverlayHtml = searchHtml.split('<!-- Search Overlay -->')[1];
        document.body.insertAdjacentHTML('beforeend', searchOverlayHtml);

        // Initialize search functionality
        const searchScript = document.createElement('script');
        searchScript.type = 'module';
        searchScript.textContent = `
            import ProjectSearch from './js/search.js';
            new ProjectSearch();
        `;
        document.body.appendChild(searchScript);
    } catch (error) {
        console.error('Error including search:', error);
    }
} 
export default class ProjectSearch {
    constructor() {
        this.searchButton = document.querySelector('.search-button');
        this.searchOverlay = document.querySelector('.search-overlay');
        this.searchInput = document.querySelector('.search-input');
        this.searchResults = document.querySelector('.search-results');
        this.closeButton = document.querySelector('.close-search');

        // Only initialize if all required elements are present
        if (!this.searchButton || !this.searchOverlay || !this.searchInput || 
            !this.searchResults || !this.closeButton) {
            console.error('Required search elements not found');
            return;
        }

        this.projects = this.collectProjects();
        this.bindEvents();
    }

    collectProjects() {
        const projects = [];
        
        // Try multiple selectors to find project elements
        const projectSelectors = [
            '.project',                // Original selector
            '.project-card',           // Project cards on home page
            '.featured-projects .project-card',  // Featured projects
            '.project-grid .project-card',       // Project grid 
            '.project-item',           // Potential alternate class
            '[class*="project"]'       // Any element with "project" in class name
        ];
        
        let projectElements = [];
        
        // Special case: On the projects page, manually collect cards
        if (window.location.pathname === '/projects' || window.location.pathname === '/projects/') {
            // Add all elements from the projects page
            const allProjectCards = document.querySelectorAll('.project-card, .featured-project, article, .grid-item');
            if (allProjectCards.length > 0) {
                projectElements = [...allProjectCards];
                console.log(`Found ${projectElements.length} project elements on projects page`);
            }
        }
        
        // If we didn't find anything specific to the projects page, try the generic selectors
        if (projectElements.length === 0) {
            // Try each selector
            for (const selector of projectSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    projectElements = [...projectElements, ...elements];
                }
            }
        }
        
        // Final fallback: find anything with appropriate attribute or content
        if (projectElements.length === 0) {
            // Find anything with href containing "project"
            document.querySelectorAll('a[href*="project"]').forEach(el => {
                // Get the parent element (likely a card or container)
                const parent = el.closest('div, article, section');
                if (parent) projectElements.push(parent);
            });
            
            // Look for h3 elements that might contain project titles
            document.querySelectorAll('h2, h3').forEach(heading => {
                const parent = heading.closest('div, article, section');
                if (parent && !projectElements.includes(parent)) {
                    projectElements.push(parent);
                }
            });
        }
        
        // Remove duplicates
        projectElements = [...new Set(projectElements)];
        
        console.log(`Total project elements found: ${projectElements.length}`);

        projectElements.forEach(element => {
            const project = this.collectProjectFromElement(element);
            if (project) {
                projects.push(project);
                console.log(`Collected project: ${project.title} with ${project.tags.length} tags`);
            }
        });

        return projects;
    }

    collectProjectFromElement(element) {
        if (!element) return null;

        // Try different selectors for title
        let title = '';
        const titleSelectors = ['.project-title', 'h3', '.project-header h3', '.project-header'];
        for (const selector of titleSelectors) {
            const titleElement = element.querySelector(selector);
            if (titleElement && titleElement.textContent) {
                title = titleElement.textContent.trim();
                break;
            }
        }
        
        if (!title) return null;

        // Get description - try multiple selectors
        let description = '';
        const descSelectors = ['.project-description', 'p', '.project-card p'];
        for (const selector of descSelectors) {
            const descElement = element.querySelector(selector);
            if (descElement && descElement.textContent) {
                description = descElement.textContent.trim();
                break;
            }
        }
        
        // Handle link generation safely
        let link = '';
        // Try to find any link in the project
        const linkElement = element.querySelector('a.project-link') || element.querySelector('a');
        if (linkElement && linkElement.getAttribute('href')) {
            link = linkElement.getAttribute('href');
        } else if (window.location.pathname.includes('/projects/')) {
            link = window.location.pathname;
        }

        // Handle tags safely
        const tags = [];
        const tagSelectors = ['.project-tag', '.tech-tag', '.tech-stack span'];
        
        for (const selector of tagSelectors) {
            const tagElements = element.querySelectorAll(selector);
            tagElements.forEach(tag => {
                const tagText = tag.textContent?.trim();
                if (tagText) {
                    tags.push(tagText);
                }
            });
            
            if (tags.length > 0) break;
        }

        return {
            title,
            description,
            link,
            tags
        };
    }

    bindEvents() {
        this.searchButton.addEventListener('click', () => this.openSearch());
        this.closeButton.addEventListener('click', () => this.closeSearch());
        this.searchInput.addEventListener('input', () => this.handleSearch());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSearch();
        });
    }

    openSearch() {
        this.searchOverlay.classList.add('active');
        this.searchInput.focus();
    }

    closeSearch() {
        this.searchOverlay.classList.remove('active');
        this.searchInput.value = '';
        this.clearResults();
    }

    clearResults() {
        while (this.searchResults.firstChild) {
            this.searchResults.removeChild(this.searchResults.firstChild);
        }
    }

    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        this.clearResults();

        if (!searchTerm) return;

        console.log(`Searching for: ${searchTerm}`);
        console.log(`Total projects to search: ${this.projects.length}`);
        
        if (this.projects.length === 0) {
            console.log('No projects were found to search through');
        }

        const results = this.projects.filter(project => {
            const titleMatch = project.title.toLowerCase().includes(searchTerm);
            const descMatch = project.description.toLowerCase().includes(searchTerm);
            const tagMatch = project.tags.some(tag => tag.toLowerCase().includes(searchTerm));
            
            if (titleMatch) console.log(`Match found in title: ${project.title}`);
            if (descMatch) console.log(`Match found in description: ${project.description.substring(0, 30)}...`);
            if (tagMatch) console.log(`Match found in tags: ${project.tags.join(', ')}`);
            
            return titleMatch || descMatch || tagMatch;
        });

        console.log(`Found ${results.length} matching projects`);
        this.displayResults(results);
    }

    displayResults(results) {
        if (results.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No matching projects found';
            this.searchResults.appendChild(noResults);
            return;
        }

        results.forEach(project => {
            const resultElement = document.createElement('div');
            resultElement.className = 'search-result';

            const title = document.createElement('h3');
            if (project.link) {
                const titleLink = document.createElement('a');
                titleLink.href = project.link;
                titleLink.textContent = project.title;
                title.appendChild(titleLink);
            } else {
                title.textContent = project.title;
            }
            resultElement.appendChild(title);

            if (project.description) {
                const description = document.createElement('p');
                description.textContent = project.description;
                resultElement.appendChild(description);
            }

            if (project.tags.length > 0) {
                const tags = document.createElement('div');
                tags.className = 'search-result-tags';
                project.tags.forEach(tag => {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'search-result-tag';
                    tagElement.textContent = tag;
                    tags.appendChild(tagElement);
                });
                resultElement.appendChild(tags);
            }

            this.searchResults.appendChild(resultElement);
        });
    }
} 
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
        const projectElements = document.querySelectorAll('.project');

        projectElements.forEach(element => {
            const project = this.collectProjectFromElement(element);
            if (project) {
                projects.push(project);
            }
        });

        return projects;
    }

    collectProjectFromElement(element) {
        if (!element) return null;

        const titleElement = element.querySelector('.project-title');
        if (!titleElement) return null;

        const title = titleElement.textContent?.trim() || '';
        const description = element.querySelector('.project-description')?.textContent?.trim() || '';
        
        // Handle link generation safely
        let link = '';
        const linkElement = element.querySelector('a.project-link');
        if (linkElement && linkElement.getAttribute('href')) {
            link = linkElement.getAttribute('href');
        } else if (window.location.pathname.includes('/projects/')) {
            link = window.location.pathname;
        }

        // Handle tags safely
        const tags = [];
        const tagElements = element.querySelectorAll('.project-tag');
        tagElements.forEach(tag => {
            const tagText = tag.textContent?.trim();
            if (tagText) {
                tags.push(tagText);
            }
        });

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

        const results = this.projects.filter(project => {
            return project.title.toLowerCase().includes(searchTerm) ||
                   project.description.toLowerCase().includes(searchTerm) ||
                   project.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        });

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
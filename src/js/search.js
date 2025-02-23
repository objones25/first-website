export default class ProjectSearch {
    constructor() {
        this.searchButton = document.querySelector('.search-button');
        this.searchOverlay = document.querySelector('.search-overlay');
        this.searchInput = document.querySelector('.search-input');
        this.closeButton = document.querySelector('.close-search');
        this.resultsContainer = document.querySelector('.search-results');
        this.projects = this.collectProjects();
        
        this.setupEventListeners();
    }

    collectProjects() {
        const projects = [];
        
        // Collect projects from project cards
        document.querySelectorAll('.project-card').forEach(card => {
            this.collectProjectFromElement(card, projects);
        });

        // Collect from project article (detail pages)
        const projectArticle = document.querySelector('.project-article');
        if (projectArticle) {
            this.collectProjectFromElement(projectArticle, projects);
        }

        // If no projects found on current page, try to fetch from projects page
        if (projects.length === 0 && !window.location.pathname.includes('/projects')) {
            this.fetchProjectsFromProjectsPage();
        }

        return projects;
    }

    collectProjectFromElement(element, projects) {
        const title = element.querySelector('h1, h3')?.textContent || '';
        const description = element.querySelector('p')?.textContent || '';
        const tags = Array.from(element.querySelectorAll('.tech-tag')).map(tag => tag.textContent);
        const link = element.querySelector('a.project-link')?.getAttribute('href') || 
                    (window.location.pathname.includes('/projects/') ? window.location.pathname : '');
        const status = element.querySelector('.status-badge, .new-badge')?.textContent || '';
        
        if (title) {
            projects.push({
                title,
                description,
                tags,
                link,
                status,
                element
            });
        }
    }

    async fetchProjectsFromProjectsPage() {
        try {
            const response = await fetch('/projects');
            if (!response.ok) return;

            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            doc.querySelectorAll('.project-card').forEach(card => {
                this.collectProjectFromElement(card, this.projects);
            });
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    }

    setupEventListeners() {
        // Open search overlay
        this.searchButton.addEventListener('click', () => {
            this.openSearch();
        });

        // Close search overlay
        this.closeButton.addEventListener('click', () => {
            this.closeSearch();
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSearch();
        });

        // Handle search input
        this.searchInput.addEventListener('input', () => {
            this.handleSearch();
        });
    }

    openSearch() {
        this.searchOverlay.classList.add('active');
        this.searchInput.focus();
        document.body.style.overflow = 'hidden';
    }

    closeSearch() {
        this.searchOverlay.classList.remove('active');
        this.searchInput.value = '';
        this.resultsContainer.innerHTML = '';
        document.body.style.overflow = '';
    }

    handleSearch() {
        const query = this.searchInput.value.toLowerCase().trim();
        
        if (!query) {
            this.resultsContainer.innerHTML = '';
            return;
        }

        const results = this.projects.filter(project => {
            const titleMatch = project.title.toLowerCase().includes(query);
            const tagMatch = project.tags.some(tag => tag.toLowerCase().includes(query));
            const descriptionMatch = project.description.toLowerCase().includes(query);
            
            return titleMatch || tagMatch || descriptionMatch;
        });

        this.displayResults(results);
    }

    displayResults(results) {
        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>No projects found matching your search.</p>
                </div>
            `;
            return;
        }

        this.resultsContainer.innerHTML = results.map(project => `
            <div class="search-result">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="search-result-tags">
                    ${project.tags.map(tag => `<span class="search-result-tag">${tag}</span>`).join('')}
                </div>
                <a href="${project.link}" class="project-link">View Project →</a>
            </div>
        `).join('');
    }
} 
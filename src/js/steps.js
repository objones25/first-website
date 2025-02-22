class StepsAnimation {
    constructor() {
        this.container = document.querySelector('.steps-container');
        this.steps = document.querySelectorAll('.step');
        this.images = [
            '/images/projects/high-performance.webp',
            '/images/projects/security.webp',
            '/images/projects/systems.webp',
            '/images/projects/ai.webp'
        ];
        this.currentImage = 0;
        this.imageElement = document.querySelector('.steps-graphic .image');
        
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
        this.handleScroll();
    }

    handleScroll() {
        if (!this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        const containerHeight = containerRect.height;
        const viewportHeight = window.innerHeight;
        const scrollProgress = (viewportHeight - containerRect.top) / (containerHeight + viewportHeight);

        this.steps.forEach((step, index) => {
            const stepProgress = (index + 1) / this.steps.length;
            if (scrollProgress >= stepProgress) {
                step.classList.add('step--active');
                if (this.currentImage !== index) {
                    this.updateImage(index);
                }
            } else {
                step.classList.remove('step--active');
            }
        });

        // Update the gradient angle based on scroll
        const angle = scrollProgress * 360;
        this.container.style.setProperty('--from-angle', `${angle}deg`);
    }

    updateImage(index) {
        if (!this.imageElement) return;
        
        this.currentImage = index;
        this.imageElement.style.opacity = '0';
        this.imageElement.style.filter = 'blur(40px)';
        
        setTimeout(() => {
            this.imageElement.style.backgroundImage = `url(${this.images[index]})`;
            this.imageElement.style.opacity = '1';
            this.imageElement.style.filter = 'blur(0)';
        }, 300);
    }
}

// Initialize the steps animation when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StepsAnimation();
}); 
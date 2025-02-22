class SpiralAnimation {
    constructor(containerId) {
        this.svg = document.getElementById(containerId);
        this.centerX = this.svg.clientWidth / 2;
        this.centerY = this.svg.clientHeight / 2;
        this.particles = [];
        this.numParticles = 1600; // Increased for larger size
        this.baseRadius = 2;
        this.spiralTightness = 0.08; // Adjusted for larger size
        this.rotationSpeed = 0.00005;
        this.mouseX = this.centerX;
        this.mouseY = this.centerY;
        
        // Initialize mouse interaction
        this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.initialize();
    }

    handleMouseMove(event) {
        const rect = this.svg.getBoundingClientRect();
        this.mouseX = event.clientX - rect.left;
        this.mouseY = event.clientY - rect.top;
    }

    initialize() {
        // Create gradient definition
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
        gradient.setAttribute("id", "particleGradient");
        
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "#3B82F6");
        stop1.setAttribute("stop-opacity", "1");
        
        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", "#3B82F6");
        stop2.setAttribute("stop-opacity", "0");
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        this.svg.appendChild(defs);

        // Create particles with logarithmic distribution
        for (let i = 0; i < this.numParticles; i++) {
            // Create two spiral arms
            this.createSpiralArm(i, 0);
            this.createSpiralArm(i, Math.PI);
        }

        this.animate();
    }

    createSpiralArm(index, offset) {
        const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        particle.setAttribute("class", "particle");
        
        // Vary particle size based on position in spiral
        const size = (1 - Math.pow(index / this.numParticles, 0.5)) * 
                    (Math.random() * 1.5 + 0.5) * this.baseRadius;
        
        particle.setAttribute("r", size);
        particle.setAttribute("fill", "url(#particleGradient)");
        
        // Add subtle opacity variation
        const baseOpacity = 0.1 + Math.random() * 0.3;
        particle.setAttribute("opacity", baseOpacity);
        
        this.particles.push({
            element: particle,
            initialAngle: (index / this.numParticles) * Math.PI * 20 + offset,
            radius: Math.pow(index / this.numParticles, 0.5) * 1000, // Increased radius for larger size
            speed: 1 + Math.random() * 0.5,
            size: size,
            baseOpacity: baseOpacity
        });
        
        this.svg.appendChild(particle);
    }

    updateParticle(particle, time) {
        const angle = particle.initialAngle + 
                    (time * this.rotationSpeed * particle.speed);
        
        // Calculate distance from mouse for interactive effect
        const dx = this.mouseX - this.centerX;
        const dy = this.mouseY - this.centerY;
        const distortion = Math.min(Math.sqrt(dx * dx + dy * dy) / 400, 1);
        
        // Spiral formula with mouse interaction
        const x = this.centerX + 
                 particle.radius * Math.cos(angle) * (this.spiralTightness + distortion * 0.02);
        const y = this.centerY + 
                 particle.radius * Math.sin(angle) * (this.spiralTightness + distortion * 0.02);

        // Update position
        particle.element.setAttribute("cx", x);
        particle.element.setAttribute("cy", y);
        
        // Update opacity based on mouse proximity
        const particleDistFromMouse = Math.sqrt(
            Math.pow(x - this.mouseX, 2) + Math.pow(y - this.mouseY, 2)
        );
        const opacityBoost = Math.max(0, 1 - particleDistFromMouse / 200);
        particle.element.setAttribute("opacity", 
            Math.min(1, particle.baseOpacity + opacityBoost * 0.3)
        );
    }

    animate() {
        const time = performance.now();
        
        // Update all particles in a single loop
        this.particles.forEach(particle => {
            this.updateParticle(particle, time);
        });

        requestAnimationFrame(() => this.animate());
    }
}

export default SpiralAnimation; 
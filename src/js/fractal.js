export default class FractalAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        
        // Enable alpha blending for smooth particle rendering
        this.ctx.globalCompositeOperation = 'screen';
        
        // Initialize properties
        this.particles = [];
        this.branches = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseActive = false;
        this.opacity = 1;
        this.startTime = Date.now();
        this.fadeOutStart = 10000; // Start fade after 10 seconds (was 15)
        this.fadeOutDuration = 7000; // Fade out over 7 seconds (was 10)
        this.dissipationStart = this.fadeOutStart + this.fadeOutDuration; // When particles start to dissipate
        this.dissipationDuration = 3000; // Final dissipation takes 3 seconds (was 5)
        this.initialSpeed = 0.01; // Initial speed for particles
        
        // Configuration
        this.config = {
            numParticles: 500,
            baseRadius: 2,
            spiralTightness: 0.15,
            rotationSpeed: 0.001,
            particleLifespan: 0.99,
            branchProbability: 0.02,
            maxBranches: 20
        };

        this.setupCanvas();
        this.setupEventListeners();
        this.init();
        this.draw();
    }

    setupCanvas() {
        // Set canvas size with device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.ctx.scale(dpr, dpr);
        
        this.centerX = this.canvas.width / (2 * dpr);
        this.centerY = this.canvas.height / (2 * dpr);
    }

    setupEventListeners() {
        // Add mouse interaction
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.isMouseActive = true;
        });

        window.addEventListener('mouseleave', () => {
            this.isMouseActive = false;
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }

    createParticle(angle = 0, radius = 0, branch = false) {
        return {
            angle,
            radius,
            initRadius: radius,
            speed: this.initialSpeed + Math.random() * 0.02,
            size: Math.random() * 2 + (branch ? 1 : 2),
            opacity: 1,
            color: `hsla(${Math.random() * 60 + 200}, 100%, ${branch ? 85 : 100}%, 1)`,
            branch,
            curl: Math.random() * 0.2 - 0.1,
            phase: Math.random() * Math.PI * 2,
            // Add properties for dissipation
            dissipateAngle: Math.random() * Math.PI * 2,
            dissipateSpeed: Math.random() * 2 + 1,
            dissipateDistance: 0
        };
    }

    init() {
        // Create main spiral particles
        for (let i = 0; i < this.config.numParticles; i++) {
            const angle = i * 0.1;
            const radius = i * 0.5;
            this.particles.push(this.createParticle(angle, radius));
        }
    }

    updateParticle(p, index) {
        const currentTime = Date.now();
        const timeSinceStart = currentTime - this.startTime;
        
        // Calculate different phases of animation
        const inDissipation = timeSinceStart > this.dissipationStart;
        const inFadeOut = timeSinceStart > this.fadeOutStart && timeSinceStart <= this.dissipationStart;
        
        // Calculate slowdown factor
        const slowdownFactor = inFadeOut 
            ? Math.max(0.2, 1 - (timeSinceStart - this.fadeOutStart) / this.fadeOutDuration)
            : 1;

        if (inDissipation) {
            // During dissipation phase, particles float away in random directions
            const dissipationProgress = (timeSinceStart - this.dissipationStart) / this.dissipationDuration;
            p.dissipateDistance += p.dissipateSpeed * (1 - dissipationProgress);
            p.x += Math.cos(p.dissipateAngle) * p.dissipateSpeed;
            p.y += Math.sin(p.dissipateAngle) * p.dissipateSpeed;
            p.opacity *= 0.97; // Gradually fade out during dissipation
            p.size *= 0.98; // Gradually shrink during dissipation
        } else {
            // Normal spiral movement
            p.angle += (p.speed * slowdownFactor) + Math.sin(p.phase + performance.now() * 0.001 * slowdownFactor) * 0.01;
            p.radius += 0.3 * slowdownFactor;
            p.opacity *= this.config.particleLifespan;
            
            // Calculate position with spiral effect
            const spiralFactor = p.branch ? 1.2 : 1;
            p.x = this.centerX + Math.cos(p.angle * spiralFactor) * p.radius;
            p.y = this.centerY + Math.sin(p.angle * spiralFactor) * p.radius;

            // Add mouse interaction
            if (this.isMouseActive) {
                const dx = this.mouseX - p.x;
                const dy = this.mouseY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    p.angle += (100 - dist) * 0.0001 * slowdownFactor;
                    p.radius += (100 - dist) * 0.01 * slowdownFactor;
                }
            }
        }

        // Create branches during normal phase
        if (!inDissipation && !p.branch && Math.random() < this.config.branchProbability * slowdownFactor && 
            this.branches.length < this.config.maxBranches) {
            this.branches.push(this.createParticle(p.angle, p.radius, true));
        }

        // Reset or remove particles
        if (p.opacity < 0.01 || p.size < 0.1) {
            if (p.branch) {
                this.branches.splice(index, 1);
            } else if (!inDissipation) {
                this.particles[index] = this.createParticle(0, 0);
            }
        }
    }

    updateOpacity() {
        const currentTime = Date.now();
        const timeSinceStart = currentTime - this.startTime;

        if (timeSinceStart >= this.dissipationStart + this.dissipationDuration) {
            // Only remove the canvas after full dissipation
            this.canvas.style.display = 'none';
            return false;
        } else if (timeSinceStart >= this.fadeOutStart) {
            // Calculate opacity based on fade out and dissipation phases
            if (timeSinceStart <= this.dissipationStart) {
                // During fade out phase
                const fadeProgress = (timeSinceStart - this.fadeOutStart) / this.fadeOutDuration;
                this.opacity = Math.max(0.3, 1 - fadeProgress); // Keep minimum opacity during fade
            } else {
                // During dissipation phase
                const dissipationProgress = (timeSinceStart - this.dissipationStart) / this.dissipationDuration;
                this.opacity = Math.max(0, 0.3 * (1 - dissipationProgress));
            }
        }
        return true;
    }

    draw() {
        // Check if we should continue drawing
        if (!this.updateOpacity()) {
            return;
        }

        // Clear canvas with fade effect
        this.ctx.fillStyle = `rgba(10, 25, 47, ${0.1 * this.opacity})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw particles
        const drawParticle = (p) => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color.replace('1)', `${p.opacity * this.opacity})`);
            this.ctx.fill();

            // Add glow effect
            if (p.opacity > 0.5) {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color.replace('1)', `${0.1 * this.opacity})`);
                this.ctx.fill();
            }
        };

        // Update and draw all particles
        this.particles.forEach((p, i) => {
            this.updateParticle(p, i);
            drawParticle(p);
        });

        this.branches.forEach((p, i) => {
            this.updateParticle(p, i);
            drawParticle(p);
        });

        requestAnimationFrame(() => this.draw());
    }
} 
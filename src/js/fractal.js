export default class FractalAnimation {
    constructor(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.angle = 0;
        this.animationFrame = null;
        
        // Set up canvas
        this.setupCanvas();
        
        // Start animation
        this.animate();
        
        // Add resize handler
        window.addEventListener('resize', () => this.handleResize());
    }

    setupCanvas() {
        // Set canvas size
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        // Set initial styles
        this.ctx.strokeStyle = '#3B82F6';
        this.ctx.lineWidth = 1;
    }

    drawFractal(x, y, size, angle, depth = 0) {
        if (size < 4 || depth > 6) return;

        const branches = 5;
        const newSize = size * 0.7;

        for (let i = 0; i < branches; i++) {
            const newAngle = angle + (Math.PI * 2 * i / branches) + this.angle;
            const endX = x + size * Math.cos(newAngle);
            const endY = y + size * Math.sin(newAngle);

            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();

            this.drawFractal(endX, endY, newSize, newAngle, depth + 1);
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.angle += 0.002;
        this.drawFractal(this.canvas.width / 2, this.canvas.height / 2, 100, 0);
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    handleResize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        window.removeEventListener('resize', () => this.handleResize());
    }
} 
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 1.5 + 0.5;
    this.baseX = x;
    this.baseY = y;
    this.density = (Math.random() * 30) + 1;
    this.velocity = {
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1
    };
    this.color = Math.random() < 0.7 ? 'rgba(59, 130, 256, 0.6)' : 'rgba(102, 0, 204, 0.4)';
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  update(mouse, canvas) {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const forceDirectionX = dx / distance;
    const forceDirectionY = dy / distance;
    const maxDistance = 120;
    const force = (maxDistance - distance) / maxDistance;
    const directionX = forceDirectionX * force * this.density;
    const directionY = forceDirectionY * force * this.density;

    if (distance < maxDistance) {
      this.x -= directionX * 0.8;
      this.y -= directionY * 0.8;
    } else {
      if (this.x !== this.baseX) {
        const dx = this.x - this.baseX;
        this.x -= dx/25;
      }
      if (this.y !== this.baseY) {
        const dy = this.y - this.baseY;
        this.y -= dy/25;
      }
    }

    this.x += this.velocity.x * 0.15;
    this.y += this.velocity.y * 0.15;

    if (this.x < 0 || this.x > canvas.width) {
      this.velocity.x *= -0.9;
      this.x = Math.max(0, Math.min(this.x, canvas.width));
    }
    if (this.y < 0 || this.y > canvas.height) {
      this.velocity.y *= -0.9;
      this.y = Math.max(0, Math.min(this.y, canvas.height));
    }
  }
}

class ParticleField {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mousePos = { x: 0, y: 0 };
    this.animationFrame = null;
    this.lastTime = 0;
    
    this.init();
    this.setupEventListeners();
    this.animate();
  }

  init() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.particles = [];
    const numberOfParticles = (this.canvas.width * this.canvas.height) / 12000;
    for (let i = 0; i < numberOfParticles; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      this.particles.push(new Particle(x, y));
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      this.resizeTimeout = setTimeout(() => this.init(), 250);
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mousePos = { x: 0, y: 0 };
    });
  }

  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          const opacity = (1 - distance/100) * 0.3;
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
          this.ctx.lineWidth = 0.3;
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }
  }

  animate(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const deltaTime = currentTime - this.lastTime;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(particle => {
      particle.update(this.mousePos, this.canvas);
      particle.draw(this.ctx);
    });

    this.drawConnections();

    this.lastTime = currentTime;
    this.animationFrame = requestAnimationFrame((time) => this.animate(time));
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }
}

export default ParticleField; 
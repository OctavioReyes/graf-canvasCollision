// Clase para las partículas de chispa al chocar
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 4 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1.0; // Opacidad inicial
        this.decay = Math.random() * 0.03 + 0.02; // Velocidad de desvanecimiento
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw(context) {
        context.save();
        context.globalAlpha = Math.max(this.alpha, 0);
        context.beginPath();
        context.fillStyle = this.color;
        context.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

// Clase para las Zonas de Gravedad Local
class GravityZone {
    constructor(x, y, radius, strength) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.strength = strength; // Positivo = Atracción, Negativo = Repulsión
    }

    draw(context) {
        context.beginPath();
        context.strokeStyle = this.strength > 0 ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 75, 43, 0.2)';
        context.lineWidth = 1.5;
        context.setLineDash([4, 4]); // Línea punteada para el campo de fuerza
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]); // Restablecer línea
        context.closePath();
    }
}

class Circle {
    constructor(x, y, radius, color, vx, vy) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.mass = this.radius * this.radius;
        this.isColliding = false;
    }

    draw(context) {
        context.beginPath();
        context.fillStyle = this.isColliding ? this.hexToRgba(this.color, 0.7) : this.hexToRgba(this.color, 0.35);
        context.strokeStyle = this.color;
        context.lineWidth = 2.5;
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        context.fill();
        context.stroke();
        context.closePath();
    }

    hexToRgba(hex, alpha) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        let num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    update(width, height, gravityZones) {
        // Aplicar influencia de las Zonas de Gravedad Local (Idea 3)
        gravityZones.forEach(zone => {
            let dx = zone.x - this.x;
            let dy = zone.y - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < zone.radius && dist > 5) {
                let force = zone.strength * (1 - dist / zone.radius);
                this.vx += force * (dx / dist);
                this.vy += force * (dy / dist);
            }
        });

        // Limitar velocidad máxima para evitar que se desbocen
        let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = 10;
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Rebote en bordes
        if (this.x + this.radius > width) {
            this.x = width - this.radius;
            this.vx = -this.vx;
        } else if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx = -this.vx;
        }

        if (this.y + this.radius > height) {
            this.y = height - this.radius;
            this.vy = -this.vy;
        } else if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy = -this.vy;
        }
    }
}

class Simulation {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.circles = [];
        this.particles = [];
        this.gravityZones = [];
        this.activeCollisionsCount = 0;
        
        this.lastTime = performance.now();
        this.fps = 0;
        
        this.initListeners();
        this.generateEnvironment();
        this.animate();
    }

    initListeners() {
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        });

        // Clic para crear un círculo o una zona de gravedad alternando con Shift
        this.canvas.addEventListener('click', (e) => {
            if (e.shiftKey) {
                // Crear Zona de Gravedad con Shift + Clic
                let strength = Math.random() > 0.5 ? 0.15 : -0.15; // Atracción o repulsión
                this.gravityZones.push(new GravityZone(e.clientX, e.clientY, 120, strength));
            } else {
                // Crear Círculo normal
                let radius = Math.random() * 25 + 15;
                let x = Math.min(Math.max(e.clientX, radius), this.width - radius);
                let y = Math.min(Math.max(e.clientY, radius), this.height - radius);
                let color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
                let vx = (Math.random() - 0.5) * 4;
                let vy = (Math.random() - 0.5) * 4;
                this.circles.push(new Circle(x, y, radius, color, vx, vy));
            }
        });
    }

    generateEnvironment() {
        // Generar círculos iniciales
        for (let i = 0; i < 20; i++) {
            let radius = Math.random() * 25 + 15;
            let x = Math.random() * (this.width - radius * 2) + radius;
            let y = Math.random() * (this.height - radius * 2) + radius;
            let color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
            let vx = (Math.random() - 0.5) * 3;
            let vy = (Math.random() - 0.5) * 3;
            this.circles.push(new Circle(x, y, radius, color, vx, vy));
        }

        // Generar un par de Zonas de Gravedad iniciales en el centro
        this.gravityZones.push(new GravityZone(this.width * 0.35, this.height * 0.5, 140, 0.12));  // Atractor
        this.gravityZones.push(new GravityZone(this.width * 0.65, this.height * 0.5, 140, -0.12)); // Repulsor
    }

    handleElasticCollisions() {
        this.activeCollisionsCount = 0;
        this.circles.forEach(c => c.isColliding = false);

        for (let i = 0; i < this.circles.length; i++) {
            for (let j = i + 1; j < this.circles.length; j++) {
                let c1 = this.circles[i];
                let c2 = this.circles[j];

                let dx = c2.x - c1.x;
                let dy = c2.y - c1.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let minDist = c1.radius + c2.radius;

                if (distance < minDist) {
                    c1.isColliding = true;
                    c2.isColliding = true;
                    this.activeCollisionsCount++;

                    // Punto medio exacto del impacto para las chispas
                    let contactX = (c1.x * c2.radius + c2.x * c1.radius) / minDist;
                    let contactY = (c1.y * c2.radius + c2.y * c1.radius) / minDist;

                    // Generar Sistema de Partículas (Idea 1): Chispas de impacto
                    for (let p = 0; p < 6; p++) {
                        this.particles.push(new Particle(contactX, contactY, c1.color));
                    }

                    // Corrección de superposición
                    let overlap = minDist - distance;
                    let nx = dx / distance;
                    let ny = dy / distance;

                    let totalMass = c1.mass + c2.mass;
                    c1.x -= nx * overlap * (c2.mass / totalMass);
                    c1.y -= ny * overlap * (c2.mass / totalMass);
                    c2.x += nx * overlap * (c1.mass / totalMass);
                    c2.y += ny * overlap * (c1.mass / totalMass);

                    // Rebote elástico por masas
                    let kx = c1.vx - c2.vx;
                    let ky = c1.vy - c2.vy;
                    let vn = kx * nx + ky * ny;

                    if (vn > 0) {
                        let impulse = (2 * vn) / totalMass;
                        c1.vx -= impulse * c2.mass * nx;
                        c1.vy -= impulse * c2.mass * ny;
                        c2.vx += impulse * c1.mass * nx;
                        c2.vy += impulse * c1.mass * ny;
                    }
                }
            }
        }
    }

    drawStats() {
        this.ctx.fillStyle = "rgba(13, 17, 23, 0.85)";
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(20, 20, 240, 125, 8);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 13px 'Segoe UI', sans-serif";
        this.ctx.textAlign = "left";
        this.ctx.fillText("Partículas y Gravedad Local", 35, 45);

        this.ctx.font = "12px 'Segoe UI', sans-serif";
        this.ctx.fillStyle = "#94a3b8";
        this.ctx.fillText(`• Círculos activos: ${this.circles.length}`, 35, 70);
        this.ctx.fillText(`• Zonas de gravedad: ${this.gravityZones.length}`, 35, 90);
        this.ctx.fillText(`• Colisiones activas: ${this.activeCollisionsCount}`, 35, 110);
        this.ctx.fillText(`• FPS: ${Math.round(this.fps)}`, 35, 130);
    }

    animate(currentTime = 0) {
        let deltaTime = currentTime - this.lastTime;
        if (deltaTime > 0) this.fps = 1000 / deltaTime;
        this.lastTime = currentTime;

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Dibujar zonas de gravedad local
        this.gravityZones.forEach(zone => zone.draw(this.ctx));

        // Actualizar colisiones y física elástica
        this.handleElasticCollisions();

        // Actualizar y dibujar círculos
        this.circles.forEach(circle => {
            circle.update(this.width, this.height, this.gravityZones);
            circle.draw(this.ctx);
        });

        // Actualizar y dibujar partículas de chispas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.alpha <= 0) {
                this.particles.splice(i, 1); // Eliminar partículas desvanecidas
            }
        }

        this.drawStats();

        requestAnimationFrame((time) => this.animate(time));
    }
}

window.addEventListener('load', () => {
    new Simulation();
});
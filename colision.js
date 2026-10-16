// Clase para las partículas de chispa o explosión
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 4 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1.0; 
        this.decay = Math.random() * 0.03 + 0.02; 
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
        context.arc(this.x, this.y, 3, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

class CustomImageObject {
    constructor(x, y, radius, color, vx, vy) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.mass = this.radius * this.radius;
        this.isColliding = false;
        this.isSettled = false;

        // 🖼️ Nombres de tus archivos de imagen en la carpeta
        const imageSources = ['t1.png', 't2.png', 't3.png', 't4.png', 't5.png'];
        let selectedSrc = imageSources[Math.floor(Math.random() * imageSources.length)];
        
        this.image = new Image();
        this.image.src = selectedSrc;
        this.isLoaded = false;
        
        this.image.onload = () => {
            this.isLoaded = true;
        };
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);

        if (this.isColliding) {
            context.beginPath();
            context.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
            context.fillStyle = this.hexToRgba(this.color, 0.4);
            context.fill();
            context.strokeStyle = this.color;
            context.lineWidth = 2;
            context.stroke();
        }

        if (this.isLoaded) {
            let size = this.radius * 2;
            context.drawImage(this.image, -this.radius, -this.radius, size, size);
        } else {
            context.beginPath();
            context.arc(0, 0, this.radius, 0, Math.PI * 2);
            context.fillStyle = this.color;
            context.fill();
            context.closePath();
        }

        context.restore();
    }

    hexToRgba(hex, alpha) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        let num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    update(width, height, speedMultiplier) {
        // Gravedad global afectada por el multiplicador de velocidad
        const gravity = 0.25 * speedMultiplier;
        this.vy += gravity;

        // Actualizar posición tomando en cuenta el multiplicador
        this.x += this.vx * speedMultiplier;
        this.y += this.vy * speedMultiplier;

        // Rebote contra los bordes horizontales
        if (this.x + this.radius > width) {
            this.x = width - this.radius;
            this.vx = -Math.abs(this.vx) * 0.85;
        } else if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx = Math.abs(this.vx) * 0.85;
        }

        // Rebote contra el techo
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy = Math.abs(this.vy) * 0.80;
        }

        // Rebote contra el suelo y detección de parada
        if (this.y + this.radius >= height) {
            this.y = height - this.radius;
            this.vy = -Math.abs(this.vy) * 0.75;
            this.vx *= 0.98;

            if (Math.abs(this.vy) < 0.8 && Math.abs(this.vx) < 0.8) {
                this.vy = 0;
                this.vx = 0;
                this.isSettled = true;
            }
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
        
        this.objects = [];
        this.particles = [];
        this.activeCollisionsCount = 0;
        
        // Contador y niveles de velocidad
        this.score = 0;
        this.speedMultiplier = 1.0;
        
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

        this.canvas.addEventListener('click', (e) => {
            if (e.shiftKey) {
                for (let i = this.objects.length - 1; i >= 0; i--) {
                    let obj = this.objects[i];
                    let dx = e.clientX - obj.x;
                    let dy = e.clientY - obj.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= obj.radius) {
                        this.triggerExplosion(obj);
                        this.objects.splice(i, 1);
                        
                        // Aumentar contador de explosiones
                        this.score++;
                        this.checkSpeedLevel();
                        break;
                    }
                }
            } else {
                let radius = Math.random() * 25 + 20;
                let x = Math.min(Math.max(e.clientX, radius), this.width - radius);
                let y = Math.min(Math.max(e.clientY, radius), this.height - radius);
                let color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
                let vx = (Math.random() - 0.5) * 6;
                let vy = (Math.random() - 0.5) * 4;                
                this.objects.push(new CustomImageObject(x, y, radius, color, vx, vy));
            }
        });
    }

    checkSpeedLevel() {
        if (this.score === 10) {
            this.speedMultiplier = 1.35; // Primer aumento de velocidad (35% más rápido)
        } else if (this.score === 20) {
            this.speedMultiplier = 1.75; // Segundo aumento de velocidad (75% más rápido)
        }
    }

    triggerExplosion(obj) {
        for (let i = 0; i < 35; i++) {
            let p = new Particle(obj.x, obj.y, obj.color);
            p.vx *= 2.2;
            p.vy *= 2.2;
            this.particles.push(p);
        }
    }

    generateEnvironment() {
        for (let i = 0; i < 15; i++) {
            let radius = Math.random() * 25 + 20;
            let x = Math.random() * (this.width - radius * 2) + radius;
            let y = Math.random() * (this.height - radius * 2) + radius;
            let color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
            let vx = (Math.random() - 0.5) * 4;
            let vy = (Math.random() - 0.5) * 3;
            this.objects.push(new CustomImageObject(x, y, radius, color, vx, vy));
        }
    }

    handleElasticCollisions() {
        this.activeCollisionsCount = 0;
        this.objects.forEach(c => c.isColliding = false);

        for (let i = 0; i < this.objects.length; i++) {
            for (let j = i + 1; j < this.objects.length; j++) {
                let c1 = this.objects[i];
                let c2 = this.objects[j];

                let dx = c2.x - c1.x;
                let dy = c2.y - c1.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let minDist = c1.radius + c2.radius;

                if (distance < minDist) {
                    c1.isColliding = true;
                    c2.isColliding = true;
                    this.activeCollisionsCount++;

                    let contactX = (c1.x * c2.radius + c2.x * c1.radius) / minDist;
                    let contactY = (c1.y * c2.radius + c2.y * c1.radius) / minDist;

                    for (let p = 0; p < 6; p++) {
                        this.particles.push(new Particle(contactX, contactY, c1.color));
                    }

                    let overlap = minDist - distance;
                    let nx = dx / distance;
                    let ny = dy / distance;

                    let totalMass = c1.mass + c2.mass;
                    c1.x -= nx * overlap * (c2.mass / totalMass);
                    c1.y -= ny * overlap * (c2.mass / totalMass);
                    c2.x += nx * overlap * (c1.mass / totalMass);
                    c2.y += ny * overlap * (c1.mass / totalMass);

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
        this.ctx.roundRect(20, 20, 250, 130, 8);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 13px 'Segoe UI', sans-serif";
        this.ctx.textAlign = "left";
        this.ctx.fillText("Simulación con Niveles", 35, 45);

        this.ctx.font = "12px 'Segoe UI', sans-serif";
        this.ctx.fillStyle = "#94a3b8";
        this.ctx.fillText(`• Puntuación (Explosiones): ${this.score}`, 35, 70);
        this.ctx.fillText(`• Imágenes activas: ${this.objects.length}`, 35, 90);
        this.ctx.fillText(`• Nivel de velocidad: x${this.speedMultiplier.toFixed(2)}`, 35, 110);
        this.ctx.fillText(`• FPS: ${Math.round(this.fps)}`, 35, 130);
    }

    animate(currentTime = 0.0) {
        let deltaTime = currentTime - this.lastTime;
        if (deltaTime > 0) this.fps = 1000 / deltaTime;
        this.lastTime = currentTime;

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.handleElasticCollisions();

        for (let i = this.objects.length - 1; i >= 0; i--) {
            let obj = this.objects[i];
            obj.update(this.width, this.height, this.speedMultiplier);

            if (obj.isSettled) {
                this.objects.splice(i, 1);

                let radius = Math.random() * 25 + 20;
                let x = Math.random() * (this.width - radius * 2) + radius;
                let y = radius + 10;
                let color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
                let vx = (Math.random() - 0.5) * 4;
                let vy = Math.random() * 2;

                this.objects.push(new CustomImageObject(x, y, radius, color, vx, vy));
            } else {
                obj.draw(this.ctx);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        this.drawStats();

        requestAnimationFrame((time) => this.animate(time));
    }
}

window.addEventListener('load', () => {
    new Simulation();
});
// Environment rendering system for both Egg and Creature Canvas

interface Cloud {
    x: number;
    y: number;
    scale: number;
    speed: number;
}

interface Star {
    x: number;
    y: number;
    size: number;
    offset: number;
    speed: number;
}

interface Critter {
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: 'bird' | 'butterfly';
    frame: number;
    active: boolean;
}

class EnvironmentManager {
    private width: number = 0;
    private height: number = 0;
    private initialized = false;

    private clouds: Cloud[] = [];
    private stars: Star[] = [];
    private critters: Critter[] = [];
    private timeOffset: number = 0;

    init(width: number, height: number) {
        if (this.initialized && this.width === width && this.height === height) return;
        this.width = width;
        this.height = height;

        // Init clouds
        this.clouds = [];
        for (let i = 0; i < 3; i++) {
            this.clouds.push({
                x: Math.random() * width,
                y: Math.random() * (height * 0.4),
                scale: 0.5 + Math.random() * 0.8,
                speed: 5 + Math.random() * 10
            });
        }

        // Init stars
        this.stars = [];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * width,
                y: Math.random() * (height * 0.6),
                size: 0.5 + Math.random() * 1.5,
                offset: Math.random() * Math.PI * 2,
                speed: 1 + Math.random() * 2
            });
        }

        this.initialized = true;
    }

    private lerpColor(c1: number[], c2: number[], t: number): string {
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
        return `rgb(${r},${g},${b})`;
    }

    render(ctx: CanvasRenderingContext2D, dt: number) {
        if (!this.initialized) return;

        this.timeOffset += dt;

        // Time logic
        const now = new Date();
        const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

        // Calculate daylight mapping (0 = night, 1 = day)
        // 05:00 - 07:00 -> sunrise
        // 07:00 - 19:00 -> day
        // 19:00 - 22:00 -> sunset
        let daylight = 1;
        if (hours >= 19 && hours <= 22) {
            daylight = 1 - (hours - 19) / 3;
        } else if (hours > 22 || hours < 5) {
            daylight = 0;
        } else if (hours >= 5 && hours <= 7) {
            daylight = (hours - 5) / 2;
        }

        // Sky colors
        const dayTop = [135, 206, 235];
        const dayBottom = [255, 255, 255];
        const nightTop = [10, 10, 35];
        const nightBottom = [48, 25, 52];

        const topColor = this.lerpColor(nightTop, dayTop, daylight);
        const bottomColor = this.lerpColor(nightBottom, dayBottom, daylight);

        // Draw Sky Background
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, bottomColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Stars at night
        if (daylight < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - daylight;
            ctx.fillStyle = '#ffffff';
            this.stars.forEach(star => {
                const alpha = 0.3 + Math.abs(Math.sin(this.timeOffset * star.speed + star.offset)) * 0.7;
                ctx.globalAlpha = (1 - daylight) * alpha;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        // Draw Sun/Moon
        ctx.save();
        const horizonY = this.height * 0.7;
        if (hours >= 5 && hours <= 19) {
            // Sun Arc
            const sunAngle = ((hours - 5) / 14) * Math.PI; // 0 to PI
            const cx = this.width / 2;
            const cy = horizonY;
            const arcRadius = this.width * 0.45;
            const sx = cx - Math.cos(sunAngle) * arcRadius;
            const sy = cy - Math.sin(sunAngle) * (this.height * 0.6);

            // Sun glow
            const sunGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40);
            sunGrad.addColorStop(0, `rgba(255, 255, 200, ${daylight})`);
            sunGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, 40, 0, Math.PI * 2);
            ctx.fill();

            // Sun body
            ctx.fillStyle = `rgba(255, 220, 100, ${daylight})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 20, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Moon Arc
            const moonTime = hours < 12 ? hours + 24 : hours; // Map to 19 - 29
            const moonAngle = Math.max(0, Math.min(Math.PI, ((moonTime - 19) / 10) * Math.PI));
            const cx = this.width / 2;
            const cy = horizonY;
            const arcRadius = this.width * 0.45;
            const mx = cx - Math.cos(moonAngle) * arcRadius;
            const my = cy - Math.sin(moonAngle) * (this.height * 0.6);

            // Moon body
            ctx.fillStyle = `rgba(220, 220, 240, ${1 - daylight})`;
            ctx.beginPath();
            ctx.arc(mx, my, 15, 0, Math.PI * 2);
            ctx.fill();
            // Moon craters
            ctx.fillStyle = `rgba(180, 180, 200, ${1 - daylight})`;
            ctx.beginPath(); ctx.arc(mx - 5, my - 5, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(mx + 4, my + 2, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Clouds
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + daylight * 0.4})`;
        this.clouds.forEach(c => {
            c.x += c.speed * dt;
            if (c.x > this.width + 100 * c.scale) {
                c.x = -100 * c.scale;
                c.y = Math.random() * (this.height * 0.4);
            }
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.scale(c.scale, c.scale);
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.arc(20, -10, 25, 0, Math.PI * 2);
            ctx.arc(45, 0, 20, 0, Math.PI * 2);
            ctx.arc(20, 10, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // House / Shelter
        ctx.save();
        const baseGrass = [76, 175, 80];
        const nightGrassColor = [30, 70, 35];
        
        const shelterBase = [160, 100, 70];
        const shelterNight = [60, 40, 30];
        const roofBase = [200, 50, 50];
        const roofNight = [80, 20, 20];

        const houseColor = this.lerpColor(shelterNight, shelterBase, daylight);
        const roofColor = this.lerpColor(roofNight, roofBase, daylight);

        const houseX = this.width * 0.8;
        const houseY = horizonY - 40;

        ctx.fillStyle = houseColor;
        ctx.fillRect(houseX, houseY, 60, 40);
        ctx.fillStyle = roofColor;
        ctx.beginPath();
        ctx.moveTo(houseX - 10, houseY);
        ctx.lineTo(houseX + 30, houseY - 30);
        ctx.lineTo(houseX + 70, houseY);
        ctx.fill();
        
        ctx.fillStyle = this.lerpColor([30,30,50], [100,200,255], daylight);
        ctx.fillRect(houseX + 35, houseY + 10, 15, 15); // window
        // Light inside window at night
        if (daylight < 0.5) {
            ctx.fillStyle = `rgba(255, 255, 100, ${1 - daylight})`;
            ctx.fillRect(houseX + 35, houseY + 10, 15, 15);
        }
        ctx.restore();

        // Rolling Hills
        const groundColor = this.lerpColor(nightGrassColor, baseGrass, daylight);
        const hillColor2 = this.lerpColor([25, 60, 30], [60, 150, 65], daylight);
        
        ctx.fillStyle = hillColor2;
        ctx.beginPath();
        ctx.ellipse(this.width * 0.2, horizonY + 20, this.width * 0.6, 100, 0, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = groundColor;
        ctx.beginPath();
        ctx.ellipse(this.width * 0.8, horizonY + 40, this.width * 0.7, 120, 0, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = groundColor;
        ctx.fillRect(0, horizonY + 20, this.width, this.height - horizonY - 20);

        // Grass textures (short lines)
        ctx.strokeStyle = this.lerpColor([20, 50, 20], [50, 130, 55], daylight);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i=0; i<30; i++) {
           let gx = ((i * 137) % this.width); // pseudo-random spread
           let gy = horizonY + 30 + ((i * 97) % (this.height - horizonY - 40));
           ctx.moveTo(gx, gy);
           ctx.lineTo(gx - 2, gy - 6);
        }
        ctx.stroke();

        // Ambient Critters
        if (Math.random() < 0.005 && this.critters.length < 2) {
            const isDay = daylight > 0.5;
            this.critters.push({
                x: Math.random() > 0.5 ? -20 : this.width + 20,
                y: Math.random() * horizonY,
                vx: (Math.random() * 40 + 20) * (Math.random() > 0.5 ? 1 : -1),
                vy: (Math.random() - 0.5) * 20,
                type: isDay ? 'butterfly' : 'bird', // Use bird mechanics for fireflies at night? Let's just say bird/butterfly depending
                frame: 0,
                active: true
            });
        }
        
        for (let i = this.critters.length - 1; i >= 0; i--) {
            const c = this.critters[i];
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.frame += dt * 10;
            
            // Wobble
            c.y += Math.sin(this.timeOffset * 5) * 0.5;

            if (c.x < -50 || c.x > this.width + 50 || c.y < -50 || c.y > this.height) {
                this.critters.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.translate(c.x, c.y);
            if (c.vx < 0) ctx.scale(-1, 1);

            if (c.type === 'butterfly' && daylight > 0.2) {
                ctx.fillStyle = '#ff69b4';
                const flap = Math.abs(Math.sin(c.frame)) * 4;
                ctx.beginPath();
                ctx.ellipse(-2, -flap, 4, 3, 0, 0, Math.PI * 2);
                ctx.ellipse(2, -flap, 4, 3, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Bird or bat/firefly
                ctx.fillStyle = daylight > 0.2 ? '#333' : '#ffff00';
                if (daylight <= 0.2) {
                    // Firefly
                    ctx.globalAlpha = 0.5 + Math.abs(Math.sin(c.frame*0.5))*0.5;
                    ctx.beginPath(); ctx.arc(0,0, 3, 0, Math.PI*2); ctx.fill();
                } else {
                    // Bird
                    const flapY = Math.sin(c.frame) * 5;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(-5, flapY, -10, -2);
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(5, flapY, 10, -2);
                    ctx.strokeStyle = '#333';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
    }
}

export const environment = new EnvironmentManager();

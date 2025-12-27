/**
 * Badge Notification Component
 * 🎉 Shows popup when badges are unlocked
 * 🏆 Animated badge reveal with confetti
 */

import { badgeService } from '../services/badge-service.js';

class BadgeNotification {
    constructor() {
        this.queue = [];
        this.isShowing = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        // Listen for badge unlocks
        badgeService.addListener((newBadges) => {
            console.log('[BadgeNotification] New badges unlocked:', newBadges.length);
            newBadges.forEach(badge => this.queue.push(badge));
            this.showNext();
        });
        
        this.initialized = true;
        console.log('[BadgeNotification] Initialized');
    }

    showNext() {
        if (this.isShowing || this.queue.length === 0) return;
        
        const badge = this.queue.shift();
        this.show(badge);
    }

    show(badge) {
        this.isShowing = true;
        
        const popup = document.createElement('div');
        popup.className = 'badge-notification';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            background: linear-gradient(135deg, rgba(24, 24, 58, 0.98), rgba(15, 15, 38, 0.98));
            border: 3px solid ${badgeService.getTierColor(badge.tier)};
            border-radius: 1.5rem;
            padding: 2.5rem 2rem;
            z-index: 4000;
            text-align: center;
            animation: badge-appear 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            max-width: 90%;
            width: 400px;
        `;
        
        popup.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 1rem; animation: bounce 1s ease-in-out infinite;">
                ${badge.icon}
            </div>
            
            <div style="
                display: inline-block;
                background: ${badgeService.getTierColor(badge.tier)};
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 1rem;
            ">
                ${badge.tier}
            </div>
            
            <h2 style="
                color: #FDFAB0;
                font-size: 1.75rem;
                font-weight: 800;
                margin: 0 0 0.5rem 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            ">
                🎉 Badge Unlocked!
            </h2>
            
            <h3 style="
                color: ${badgeService.getTierColor(badge.tier)};
                font-size: 1.5rem;
                font-weight: 700;
                margin: 0 0 0.75rem 0;
            ">
                ${badge.name}
            </h3>
            
            <p style="
                color: #A6C0DD;
                font-size: 1rem;
                margin: 0 0 1.5rem 0;
                line-height: 1.4;
            ">
                ${badge.description}
            </p>
            
            <div style="
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: rgba(166, 192, 221, 0.2);
                border: 1px solid rgba(166, 192, 221, 0.3);
                padding: 0.75rem 1.5rem;
                border-radius: 0.75rem;
            ">
                <span style="color: #FDFAB0; font-size: 1.125rem; font-weight: 700;">
                    +${badge.points}
                </span>
                <span style="color: #A6C0DD; font-size: 0.875rem;">points</span>
            </div>
        `;
        
        // Add styles
        if (!document.getElementById('badge-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'badge-notification-styles';
            style.textContent = `
                @keyframes badge-appear {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0) rotate(-10deg);
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
                    }
                    100% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    }
                }
                
                @keyframes badge-disappear {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                }
                
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(popup);
        
        // Launch confetti
        this.launchConfetti();
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            popup.style.animation = 'badge-disappear 0.4s ease-out forwards';
            setTimeout(() => {
                popup.remove();
                this.isShowing = false;
                
                // Show next badge if any
                setTimeout(() => this.showNext(), 500);
            }, 400);
        }, 4000);
    }

    launchConfetti() {
        // Create confetti canvas
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 3999;
        `;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const particles = [];
        const particleCount = 100;
        const colors = ['#A6C0DD', '#FDFAB0', '#ff2e63', '#ff6b9d', '#8b5cf6', '#3b82f6', '#10b981'];
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 6 + 3,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                gravity: 0.2
            });
        }
        
        // Animate
        const startTime = Date.now();
        const duration = 3000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                canvas.remove();
                return;
            }
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                // Update
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.rotation += p.rotationSpeed;
                
                // Draw
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
}

const badgeNotification = new BadgeNotification();
export { badgeNotification };

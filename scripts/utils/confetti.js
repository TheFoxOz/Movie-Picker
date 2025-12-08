/**
 * Confetti Animation Utility
 * Creates celebratory confetti effects for user interactions
 * ✅ FIX #3: Fixed ENV reference from ENV.APP.debug to ENV.DEBUG_MODE
 */

import { ENV } from '../config/env.js';

class ConfettiManager {
    constructor() {
        this.activeAnimations = [];
    }

    /**
     * Create confetti explosion at specific coordinates
     */
    createConfetti(x, y, options = {}) {
        const defaults = {
            particleCount: 50,
            spread: 70,
            origin: { x: x / window.innerWidth, y: y / window.innerHeight },
            colors: ['#ff2e63', '#08d9d6', '#fbbf24', '#10b981', '#ec4899'],
            shapes: ['circle', 'square'],
            gravity: 1,
            drift: 0,
            startVelocity: 45,
            decay: 0.9,
            scalar: 1
        };

        const config = { ...defaults, ...options };

        // ✅ FIX #3: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Creating confetti at:', { x, y, config });
        }

        this.launchConfetti(config);
    }

    /**
     * Create confetti from center of screen
     */
    celebrateCenter(options = {}) {
        const centerConfig = {
            particleCount: 100,
            spread: 100,
            origin: { x: 0.5, y: 0.5 },
            ...options
        };

        // ✅ FIX #3: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Center celebration:', centerConfig);
        }

        this.launchConfetti(centerConfig);
    }

    /**
     * Create confetti from bottom of screen (fireworks style)
     */
    celebrateFireworks(options = {}) {
        const defaults = {
            particleCount: 150,
            spread: 120,
            origin: { y: 0.9 },
            startVelocity: 65,
            colors: ['#ff2e63', '#08d9d6', '#fbbf24', '#10b981', '#ec4899', '#8b5cf6']
        };

        const config = { ...defaults, ...options };

        // ✅ FIX #3: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Fireworks celebration:', config);
        }

        this.launchConfetti(config);

        // Multiple bursts for fireworks effect
        setTimeout(() => this.launchConfetti({ ...config, origin: { y: 0.8 } }), 200);
        setTimeout(() => this.launchConfetti({ ...config, origin: { y: 0.85 } }), 400);
    }

    /**
     * Create side-to-side confetti streams
     */
    celebrateStream(options = {}) {
        const count = options.duration || 3000;
        const interval = 100;
        const loops = count / interval;

        // ✅ FIX #3: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Stream celebration:', { duration: count, loops });
        }

        let currentLoop = 0;
        const streamInterval = setInterval(() => {
            if (currentLoop >= loops) {
                clearInterval(streamInterval);
                return;
            }

            // Alternating sides
            const side = currentLoop % 2 === 0 ? 0 : 1;
            this.launchConfetti({
                particleCount: 5,
                angle: side === 0 ? 60 : 120,
                spread: 55,
                origin: { x: side, y: 0.6 },
                colors: options.colors || ['#ff2e63', '#08d9d6', '#fbbf24'],
                ...options
            });

            currentLoop++;
        }, interval);

        this.activeAnimations.push(streamInterval);
    }

    /**
     * Heart-shaped confetti (for "love" swipes)
     */
    celebrateLove(x, y) {
        // ✅ FIX #3: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Love celebration at:', { x, y });
        }

        this.createConfetti(x, y, {
            particleCount: 30,
            spread: 60,
            colors: ['#ff006e', '#ff2e63', '#ff0080', '#d90062', '#ec4899'],
            shapes: ['circle'],
            startVelocity: 35,
            scalar: 1.2
        });
    }

    /**
     * Success confetti (for matches)
     */
    celebrateMatch() {
        // ✅ FIX #3: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Match celebration');
        }

        this.celebrateFireworks({
            particleCount: 200,
            colors: ['#10b981', '#059669', '#34d399', '#6ee7b7']
        });
    }

    /**
     * Launch confetti using canvas-confetti library
     * Falls back to simple animation if library not available
     */
    launchConfetti(config) {
        // Check if canvas-confetti library is loaded
        if (typeof window.confetti === 'function') {
            window.confetti(config);
        } else {
            // Fallback: Simple DOM-based confetti
            this.simpleFallback(config);
        }
    }

    /**
     * Simple fallback animation if canvas-confetti isn't loaded
     */
    simpleFallback(config) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(container);

        const colors = config.colors || ['#ff2e63', '#08d9d6', '#fbbf24'];
        const particleCount = config.particleCount || 50;
        const origin = config.origin || { x: 0.5, y: 0.5 };

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const size = Math.random() * 10 + 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                left: ${origin.x * 100}%;
                top: ${origin.y * 100}%;
                transform: translate(-50%, -50%);
                animation: confetti-fall ${1 + Math.random()}s ease-out forwards;
            `;

            container.appendChild(particle);

            // Random direction
            const angle = (Math.random() - 0.5) * (config.spread || 70) * Math.PI / 180;
            const velocity = config.startVelocity || 45;
            const vx = Math.cos(angle) * velocity * (Math.random() * 0.5 + 0.5);
            const vy = Math.sin(angle) * velocity * (Math.random() * 0.5 + 0.5);

            particle.style.setProperty('--vx', `${vx}px`);
            particle.style.setProperty('--vy', `${vy}px`);
        }

        // Cleanup after animation
        setTimeout(() => {
            container.remove();
        }, 2000);
    }

    /**
     * Stop all active animations
     */
    stopAll() {
        this.activeAnimations.forEach(interval => clearInterval(interval));
        this.activeAnimations = [];

        // ✅ FIX #3: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Stopped all animations');
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopAll();
        
        // ✅ FIX #3: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Manager destroyed');
        }
    }
}

// Add CSS animation for fallback
const style = document.createElement('style');
style.textContent = `
    @keyframes confetti-fall {
        0% {
            transform: translate(-50%, -50%) translateX(0) translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) 
                       translateX(var(--vx, 0)) 
                       translateY(calc(100vh + var(--vy, 0))) 
                       rotate(720deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export singleton instance
export const confettiManager = new ConfettiManager();

// Convenience exports for common celebrations
export const celebrate = {
    center: (options) => confettiManager.celebrateCenter(options),
    fireworks: (options) => confettiManager.celebrateFireworks(options),
    stream: (options) => confettiManager.celebrateStream(options),
    love: (x, y) => confettiManager.celebrateLove(x, y),
    match: () => confettiManager.celebrateMatch(),
    custom: (x, y, options) => confettiManager.createConfetti(x, y, options)
};

/**
 * Confetti Animation Utility
 * Creates celebration confetti effects
 * FIXED: All ENV.APP.debug → ENV && ENV.DEBUG_MODE
 */

import { ENV } from '../config/env.js';

/**
 * Show confetti celebration
 * @param {number} duration - Duration in milliseconds (default: 3000)
 * @param {number} particleCount - Number of confetti pieces (default: 100)
 */
export function showConfetti(duration = 3000, particleCount = 100) {
    // FIXED: ENV.APP.debug → ENV && ENV.DEBUG_MODE
    if (ENV && ENV.DEBUG_MODE) {
        console.log('[Confetti] Starting celebration animation');
    }
    
    // Create confetti container
    const container = document.createElement('div');
    container.id = 'confetti-container';
    container.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        pointer-events: none;
        overflow: hidden;
    `;
    document.body.appendChild(container);
    
    // Confetti colors
    const colors = [
        '#ff2e63', // Primary pink
        '#d90062', // Dark pink
        '#fbbf24', // Gold
        '#10b981', // Green
        '#6366f1', // Indigo
        '#ec4899', // Pink
        '#8b5cf6', // Purple
        '#f59e0b'  // Amber
    ];
    
    // Create confetti pieces
    for (let i = 0; i < particleCount; i++) {
        const confetti = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 10 + 5; // 5-15px
        const left = Math.random() * 100; // Random horizontal position
        const delay = Math.random() * 500; // Stagger animation
        const animDuration = Math.random() * 1000 + 2000; // 2-3 seconds
        
        confetti.style.cssText = `
            position: absolute;
            left: ${left}%;
            top: -20px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            opacity: 0.8;
            animation: confettiFall ${animDuration}ms linear ${delay}ms forwards;
            transform-origin: center;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        
        container.appendChild(confetti);
    }
    
    // Add CSS animation if not already present
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes confettiFall {
                0% {
                    transform: translateY(-100px) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(calc(100vh + 100px)) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove confetti after animation completes
    setTimeout(() => {
        if (container && container.parentNode) {
            container.remove();
        }
        
        // FIXED: ENV.APP.debug → ENV && ENV.DEBUG_MODE
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[Confetti] Animation complete');
        }
    }, duration + 3000); // Extra time for animation to finish
}

/**
 * Show heart confetti (for love swipes)
 */
export function showHeartConfetti(duration = 2500) {
    // FIXED: ENV.APP.debug → ENV && ENV.DEBUG_MODE
    if (ENV && ENV.DEBUG_MODE) {
        console.log('[Confetti] Starting heart celebration');
    }
    
    const container = document.createElement('div');
    container.id = 'heart-confetti-container';
    container.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        pointer-events: none;
        overflow: hidden;
    `;
    document.body.appendChild(container);
    
    // Create heart emojis
    const hearts = ['❤️', '💖', '💕', '💗', '💓', '💝'];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const heart = document.createElement('div');
        const emoji = hearts[Math.floor(Math.random() * hearts.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 300;
        const animDuration = Math.random() * 800 + 1500; // 1.5-2.3 seconds
        const size = Math.random() * 20 + 20; // 20-40px
        
        heart.textContent = emoji;
        heart.style.cssText = `
            position: absolute;
            left: ${left}%;
            bottom: -50px;
            font-size: ${size}px;
            opacity: 1;
            animation: heartFloat ${animDuration}ms ease-out ${delay}ms forwards;
        `;
        
        container.appendChild(heart);
    }
    
    // Add CSS animation
    if (!document.getElementById('heart-confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'heart-confetti-styles';
        style.textContent = `
            @keyframes heartFloat {
                0% {
                    transform: translateY(0) scale(0.5);
                    opacity: 1;
                }
                50% {
                    transform: translateY(-200px) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-400px) scale(1.2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove after animation
    setTimeout(() => {
        if (container && container.parentNode) {
            container.remove();
        }
    }, duration + 2500);
}

/**
 * Show fireworks effect (for perfect matches)
 */
export function showFireworks(duration = 2000) {
    // FIXED: ENV.APP.debug → ENV && ENV.DEBUG_MODE
    if (ENV && ENV.DEBUG_MODE) {
        console.log('[Confetti] Starting fireworks celebration');
    }
    
    const container = document.createElement('div');
    container.id = 'fireworks-container';
    container.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        pointer-events: none;
        overflow: hidden;
    `;
    document.body.appendChild(container);
    
    const colors = ['#ff2e63', '#fbbf24', '#10b981', '#6366f1', '#ec4899'];
    const burstCount = 5;
    
    for (let burst = 0; burst < burstCount; burst++) {
        setTimeout(() => {
            const centerX = 20 + Math.random() * 60; // Random position
            const centerY = 20 + Math.random() * 40;
            const particleCount = 30;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                const angle = (Math.PI * 2 * i) / particleCount;
                const velocity = 100 + Math.random() * 100;
                const tx = Math.cos(angle) * velocity;
                const ty = Math.sin(angle) * velocity;
                
                particle.style.cssText = `
                    position: absolute;
                    left: ${centerX}%;
                    top: ${centerY}%;
                    width: 6px;
                    height: 6px;
                    background: ${color};
                    border-radius: 50%;
                    box-shadow: 0 0 10px ${color};
                    animation: fireworkParticle 1s ease-out forwards;
                    --tx: ${tx}px;
                    --ty: ${ty}px;
                `;
                
                container.appendChild(particle);
            }
        }, burst * 400);
    }
    
    // Add CSS animation
    if (!document.getElementById('fireworks-styles')) {
        const style = document.createElement('style');
        style.id = 'fireworks-styles';
        style.textContent = `
            @keyframes fireworkParticle {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--tx), var(--ty)) scale(0);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove after animation
    setTimeout(() => {
        if (container && container.parentNode) {
            container.remove();
        }
    }, duration + 2000);
}

/**
 * Show celebration (combo effect)
 * Combines confetti + hearts for special occasions
 */
export function showCelebration() {
    showConfetti(3000, 80);
    setTimeout(() => showHeartConfetti(2500), 500);
    
    // FIXED: ENV.APP.debug → ENV && ENV.DEBUG_MODE
    if (ENV && ENV.DEBUG_MODE) {
        console.log('[Confetti] Full celebration started');
    }
}

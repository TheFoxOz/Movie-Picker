/**
 * Movie Wheel Component - Random Movie Picker
 * 🎡 Spinning wheel with movie posters
 * 🎊 Confetti celebration on selection
 * 🎲 Random movie selection with smooth animation
 */

class MovieWheel {
    constructor() {
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.movies = [];
        this.selectedMovie = null;
        this.rotation = 0;
        this.spinning = false;
        this.callback = null;
        this.friendName = '';
        this.segmentImages = [];
    }

    init() {
        this.createModal();
        this.setupCanvas();
        this.attachEventListeners();
    }

    createModal() {
        if (document.getElementById('movie-wheel-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'movie-wheel-modal';
        modal.className = 'wheel-modal-overlay';
        modal.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 2500;
            padding: 1rem;
            backdrop-filter: blur(5px);
            animation: fade-in 0.3s ease-out;
        `;

        modal.innerHTML = `
            <div class="wheel-modal-content" style="
                max-width: 550px;
                width: 100%;
                margin: 0 auto;
                padding: 2rem;
                border-radius: 1.5rem;
                background: linear-gradient(180deg, rgba(24, 24, 58, 0.98), rgba(15, 15, 38, 0.98));
                border: 2px solid rgba(166, 192, 221, 0.3);
                backdrop-filter: blur(20px);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slide-up 0.4s ease-out;
                position: relative;
            ">
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                    <h2 style="
                        font-size: 1.75rem;
                        font-weight: 800;
                        color: #FDFAB0;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    ">
                        <span style="font-size: 2rem;">🎡</span>
                        <span>Movie Roulette</span>
                    </h2>
                    <button id="close-wheel-modal" style="
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: rgba(166, 192, 221, 0.2);
                        border: 2px solid rgba(166, 192, 221, 0.3);
                        color: #FDFAB0;
                        font-size: 1.5rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                        font-weight: 700;
                        line-height: 1;
                    ">×</button>
                </div>

                <p id="wheel-subtitle" style="
                    color: #A6C0DD;
                    font-size: 0.95rem;
                    margin: 0 0 1.5rem 0;
                    text-align: center;
                ">Let fate decide your next movie!</p>

                <!-- Wheel Container -->
                <div style="
                    position: relative;
                    width: 100%;
                    aspect-ratio: 1;
                    margin-bottom: 1.5rem;
                    background: radial-gradient(circle, rgba(166, 192, 221, 0.1) 0%, transparent 70%);
                    border-radius: 50%;
                    padding: 1rem;
                ">
                    <!-- Pointer -->
                    <div style="
                        position: absolute;
                        top: -5px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 18px solid transparent;
                        border-right: 18px solid transparent;
                        border-top: 30px solid #ff2e63;
                        z-index: 15;
                        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
                    "></div>

                    <!-- Canvas -->
                    <canvas id="wheel-canvas" style="
                        width: 100%;
                        height: 100%;
                        border-radius: 50%;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    "></canvas>

                    <!-- Center Button -->
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #ff2e63, #ff6b9d);
                        border: 4px solid white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10;
                        box-shadow: 0 6px 20px rgba(255, 46, 99, 0.5);
                        font-size: 2rem;
                    ">🎲</div>
                </div>

                <!-- Options -->
                <div style="
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: rgba(166, 192, 221, 0.05);
                    border: 1px solid rgba(166, 192, 221, 0.15);
                    border-radius: 0.75rem;
                ">
                    <label style="
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        color: #A6C0DD;
                        font-size: 0.95rem;
                        cursor: pointer;
                    ">
                        <input type="checkbox" id="unwatched-only" checked style="
                            width: 20px;
                            height: 20px;
                            cursor: pointer;
                            accent-color: #ff2e63;
                        ">
                        <span>Only unwatched movies <span style="opacity: 0.7;">(recommended)</span></span>
                    </label>
                </div>

                <!-- Spin Button -->
                <button id="spin-wheel-btn" style="
                    width: 100%;
                    padding: 1.25rem;
                    background: linear-gradient(135deg, #ff2e63, #ff6b9d);
                    border: none;
                    border-radius: 0.75rem;
                    color: white;
                    font-weight: 700;
                    font-size: 1.125rem;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 4px 15px rgba(255, 46, 99, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                ">
                    <span style="font-size: 1.5rem;">🎲</span>
                    <span id="spin-btn-text">SPIN THE WHEEL!</span>
                </button>

                <!-- Selected Movie Display -->
                <div id="selected-movie-display" style="
                    display: none;
                    margin-top: 1.5rem;
                    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                ">
                    <div style="
                        padding: 1.5rem;
                        background: linear-gradient(135deg, rgba(255, 46, 99, 0.15), rgba(255, 107, 157, 0.1));
                        border: 2px solid rgba(255, 46, 99, 0.4);
                        border-radius: 0.75rem;
                        text-align: center;
                    ">
                        <p style="
                            color: #A6C0DD;
                            font-size: 0.875rem;
                            margin: 0 0 0.75rem 0;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">🎬 Tonight's Pick</p>
                        <h3 id="selected-movie-title" style="
                            color: #FDFAB0;
                            font-size: 1.5rem;
                            font-weight: 700;
                            margin: 0 0 0.5rem 0;
                            line-height: 1.3;
                        "></h3>
                        <p id="selected-movie-rating" style="
                            color: #A6C0DD;
                            font-size: 0.95rem;
                            margin: 0;
                        "></p>
                    </div>
                </div>
            </div>

            <!-- Confetti Canvas -->
            <canvas id="wheel-confetti-canvas" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 3000;
                display: none;
            "></canvas>

            <style>
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes bounce-in {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }

                #close-wheel-modal:hover {
                    background: rgba(166, 192, 221, 0.3);
                    transform: scale(1.1);
                }

                #spin-wheel-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(255, 46, 99, 0.6);
                }

                #spin-wheel-btn:active:not(:disabled) {
                    transform: translateY(0);
                }

                #spin-wheel-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            </style>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
    }

    setupCanvas() {
        this.canvas = document.getElementById('wheel-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        
        // Set actual canvas size (higher for quality)
        this.canvas.width = 800;
        this.canvas.height = 800;
    }

    attachEventListeners() {
        // Close button
        const closeBtn = document.getElementById('close-wheel-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Spin button
        const spinBtn = document.getElementById('spin-wheel-btn');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => this.spin());
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }
    }

    open(movies, friendName = '', callback = null) {
        if (!this.modal) this.init();
        if (movies.length < 3) {
            console.error('[MovieWheel] Need at least 3 movies');
            return;
        }

        this.movies = movies;
        this.friendName = friendName;
        this.callback = callback;
        this.rotation = 0;
        this.spinning = false;
        this.selectedMovie = null;

        // Update subtitle
        const subtitle = document.getElementById('wheel-subtitle');
        if (subtitle) {
            subtitle.textContent = friendName 
                ? `Pick a movie to watch with ${friendName}!`
                : `Let fate decide your next movie!`;
        }

        // Reset display
        const selectedDisplay = document.getElementById('selected-movie-display');
        if (selectedDisplay) selectedDisplay.style.display = 'none';

        const spinBtn = document.getElementById('spin-wheel-btn');
        if (spinBtn) {
            spinBtn.disabled = false;
            const btnText = document.getElementById('spin-btn-text');
            if (btnText) btnText.textContent = 'SPIN THE WHEEL!';
        }

        // Show modal
        this.modal.style.display = 'flex';
        
        // Draw wheel
        this.drawWheel();
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.spinning = false;
    }

    drawWheel() {
        if (!this.ctx || !this.canvas) return;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        const segmentCount = Math.min(this.movies.length, 8);
        const anglePerSegment = (Math.PI * 2) / segmentCount;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.rotation);

        // Draw segments
        for (let i = 0; i < segmentCount; i++) {
            const startAngle = i * anglePerSegment;
            const endAngle = startAngle + anglePerSegment;
            const movie = this.movies[i % this.movies.length];

            // Alternating colors
            const colors = [
                ['#A6C0DD', '#8ba3b8'],
                ['#FDFAB0', '#e8dc8c'],
                ['#ff6b9d', '#ff2e63'],
                ['#8b5cf6', '#7c3aed'],
                ['#3b82f6', '#2563eb'],
                ['#10b981', '#059669'],
                ['#f59e0b', '#d97706'],
                ['#ec4899', '#db2777']
            ];
            const [color1, color2] = colors[i % colors.length];

            // Create gradient
            const gradient = this.ctx.createLinearGradient(
                0, 0,
                radius * Math.cos(startAngle + anglePerSegment / 2),
                radius * Math.sin(startAngle + anglePerSegment / 2)
            );
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);

            // Draw segment
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Draw border
            this.ctx.strokeStyle = '#18183A';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Draw movie title
            this.ctx.save();
            this.ctx.rotate(startAngle + anglePerSegment / 2);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#18183A';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            this.ctx.shadowBlur = 4;
            
            const title = movie.title.length > 20 
                ? movie.title.substring(0, 17) + '...'
                : movie.title;
            
            this.ctx.fillText(title, radius * 0.65, 5);
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    spin() {
        if (this.spinning) return;

        const spinBtn = document.getElementById('spin-wheel-btn');
        if (spinBtn) {
            spinBtn.disabled = true;
            const btnText = document.getElementById('spin-btn-text');
            if (btnText) btnText.textContent = 'SPINNING...';
        }

        this.spinning = true;

        // Random selection
        const selectedIndex = Math.floor(Math.random() * Math.min(this.movies.length, 8));
        this.selectedMovie = this.movies[selectedIndex];

        // Calculate target rotation
        const segmentCount = Math.min(this.movies.length, 8);
        const anglePerSegment = (Math.PI * 2) / segmentCount;
        const targetAngle = selectedIndex * anglePerSegment;
        
        // Add multiple full rotations + target angle + offset to center on segment
        const spins = 5;
        const finalRotation = (Math.PI * 2 * spins) + targetAngle + (anglePerSegment / 2);

        // Animate
        const duration = 4000;
        const startTime = Date.now();
        const startRotation = this.rotation;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.rotation = startRotation + (finalRotation * eased);
            this.drawWheel();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.spinning = false;
                this.onSpinComplete();
            }
        };

        animate();
    }

    onSpinComplete() {
        console.log('[MovieWheel] Selected:', this.selectedMovie.title);

        // Show selected movie
        const selectedDisplay = document.getElementById('selected-movie-display');
        const selectedTitle = document.getElementById('selected-movie-title');
        const selectedRating = document.getElementById('selected-movie-rating');

        if (selectedDisplay && selectedTitle && selectedRating) {
            selectedTitle.textContent = this.selectedMovie.title;
            selectedRating.textContent = this.selectedMovie.rating 
                ? `⭐ ${this.selectedMovie.rating.toFixed(1)} • ${this.selectedMovie.releaseYear || ''}`
                : `Released ${this.selectedMovie.releaseYear || 'N/A'}`;
            selectedDisplay.style.display = 'block';
        }

        // Update button
        const spinBtn = document.getElementById('spin-wheel-btn');
        if (spinBtn) {
            spinBtn.disabled = false;
            const btnText = document.getElementById('spin-btn-text');
            if (btnText) btnText.textContent = 'SPIN AGAIN';
        }

        // Trigger confetti
        this.launchConfetti();

        // Callback
        if (this.callback) {
            setTimeout(() => {
                this.callback(this.selectedMovie);
            }, 1000);
        }
    }

    launchConfetti() {
        const confettiCanvas = document.getElementById('wheel-confetti-canvas');
        if (!confettiCanvas) return;

        confettiCanvas.style.display = 'block';
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;

        const ctx = confettiCanvas.getContext('2d');
        const particles = [];
        const particleCount = 150;
        const colors = ['#A6C0DD', '#FDFAB0', '#ff2e63', '#ff6b9d', '#8b5cf6', '#3b82f6'];

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * confettiCanvas.width,
                y: -20,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }

        // Animate
        const startTime = Date.now();
        const duration = 3000;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                confettiCanvas.style.display = 'none';
                return;
            }

            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

            particles.forEach(p => {
                // Update
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // Gravity
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

const movieWheel = new MovieWheel();
export { movieWheel, MovieWheel };

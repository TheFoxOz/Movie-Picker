/**
 * Onboarding Flow
 * Handles: Login → Platform Selection → Swipe Tab
 */

import { authService } from '../services/auth-service.js';
import { store } from '../state/store.js';

export class OnboardingFlow {
    constructor() {
        this.currentStep = 'login'; // login, platforms, complete
        this.overlay = null;
    }

    async start() {
        // Check if user is already logged in and onboarded
        if (authService.isAuthenticated()) {
            const preferences = store.getState().preferences;
            const hasCompletedOnboarding = preferences?.onboardingComplete || false;
            
            if (hasCompletedOnboarding) {
                console.log('[Onboarding] User already onboarded, skipping');
                return false; // Don't show onboarding
            }
        }

        // Show onboarding flow
        this.showLogin();
        return true;
    }

    showSignup() {
        this.currentStep = 'signup';
        
        this.overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem;">
                <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%); border-radius: 2rem; max-width: 450px; width: 100%; padding: 3rem 2rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
                    
                    <!-- Back Button -->
                    <button id="back-to-login-btn" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: rgba(255,255,255,0.8); font-weight: 600; cursor: pointer; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>←</span>
                        <span>Back</span>
                    </button>

                    <!-- Logo/Icon -->
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎬</div>
                        <h1 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                            Create Account
                        </h1>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                            Join Movie Picker and start swiping!
                        </p>
                    </div>

                    <!-- Signup Form -->
                    <form id="signup-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
                        
                        <div>
                            <label style="display: block; color: rgba(255,255,255,0.8); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Name
                            </label>
                            <input type="text" id="name-input" placeholder="Your name" required
                                   style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-size: 1rem;">
                        </div>

                        <div>
                            <label style="display: block; color: rgba(255,255,255,0.8); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Email
                            </label>
                            <input type="email" id="signup-email-input" placeholder="your@email.com" required
                                   style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-size: 1rem;">
                        </div>

                        <div>
                            <label style="display: block; color: rgba(255,255,255,0.8); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Password
                            </label>
                            <input type="password" id="signup-password-input" placeholder="••••••••" required minlength="6"
                                   style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-size: 1rem;">
                            <p style="color: rgba(255,255,255,0.5); font-size: 0.75rem; margin: 0.5rem 0 0 0;">
                                At least 6 characters
                            </p>
                        </div>

                        <button type="submit" id="signup-btn" style="width: 100%; padding: 1.25rem; background: linear-gradient(135deg,#ff2e63,#d90062); border: none; border-radius: 0.75rem; color: white; font-weight: 700; font-size: 1.125rem; cursor: pointer; transition: transform 0.2s; margin-top: 0.5rem;">
                            Create Account
                        </button>

                    </form>

                    <!-- Already have account -->
                    <div style="text-align: center; margin-top: 1.5rem;">
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                            Already have an account? 
                            <a href="#" id="back-to-login-link" style="color: #ff2e63; font-weight: 600; text-decoration: none;">
                                Sign In
                            </a>
                        </p>
                    </div>

                </div>
            </div>
        `;

        this.attachSignupListeners();
    }

    attachSignupListeners() {
        const form = this.overlay.querySelector('#signup-form');
        const backBtn = this.overlay.querySelector('#back-to-login-btn');
        const backLink = this.overlay.querySelector('#back-to-login-link');

        // Signup form
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = this.overlay.querySelector('#name-input').value;
            const email = this.overlay.querySelector('#signup-email-input').value;
            const password = this.overlay.querySelector('#signup-password-input').value;
            const signupBtn = this.overlay.querySelector('#signup-btn');

            console.log('[Onboarding] Signup attempt:', email);
            
            signupBtn.textContent = 'Creating account...';
            signupBtn.disabled = true;

            try {
                // Use Firebase createUserWithEmailAndPassword
                const userCredential = await authService.createUserWithEmailAndPassword(email, password);
                
                // Update display name
                await authService.updateProfile(userCredential.user, { displayName: name });
                
                console.log('[Onboarding] Signup successful:', userCredential.user);
                this.showPlatformSelection();
            } catch (error) {
                console.error('[Onboarding] Signup error:', error);
                signupBtn.textContent = 'Create Account';
                signupBtn.disabled = false;
                
                let errorMessage = 'Signup failed. Please try again.';
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'This email is already registered. Please sign in instead.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Invalid email address.';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'Password is too weak. Please use at least 6 characters.';
                }
                
                alert(errorMessage);
            }
        });

        // Back button
        backBtn?.addEventListener('click', () => {
            this.showLogin();
        });

        // Back link
        backLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });
    }

    showLogin() {
        this.currentStep = 'login';
        this.createOverlay();
        
        this.overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem;">
                <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%); border-radius: 2rem; max-width: 450px; width: 100%; padding: 3rem 2rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
                    
                    <!-- Logo/Icon -->
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎬</div>
                        <h1 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                            Movie Picker
                        </h1>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                            Swipe your way to the perfect movie
                        </p>
                    </div>

                    <!-- Login Form -->
                    <form id="login-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
                        
                        <div>
                            <label style="display: block; color: rgba(255,255,255,0.8); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Email
                            </label>
                            <input type="email" id="email-input" placeholder="your@email.com" required
                                   style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-size: 1rem;">
                        </div>

                        <div>
                            <label style="display: block; color: rgba(255,255,255,0.8); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Password
                            </label>
                            <input type="password" id="password-input" placeholder="••••••••" required
                                   style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-size: 1rem;">
                        </div>

                        <button type="submit" id="login-btn" style="width: 100%; padding: 1.25rem; background: linear-gradient(135deg,#ff2e63,#d90062); border: none; border-radius: 0.75rem; color: white; font-weight: 700; font-size: 1.125rem; cursor: pointer; transition: transform 0.2s; margin-top: 0.5rem;">
                            Sign In
                        </button>

                    </form>

                    <!-- Divider -->
                    <div style="display: flex; align-items: center; gap: 1rem; margin: 2rem 0;">
                        <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                        <span style="color: rgba(255,255,255,0.5); font-size: 0.875rem;">or</span>
                        <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                    </div>

                    <!-- Social Login -->
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button id="google-login-btn" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: all 0.2s;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Continue with Google
                        </button>
                        
                        <button id="guest-login-btn" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: rgba(255,255,255,0.8); font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            Continue as Guest
                        </button>
                    </div>

                    <!-- Sign Up Link -->
                    <div style="text-align: center; margin-top: 1.5rem;">
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                            Don't have an account? 
                            <a href="#" id="signup-link" style="color: #ff2e63; font-weight: 600; text-decoration: none;">
                                Sign Up
                            </a>
                        </p>
                    </div>

                </div>
            </div>
        `;

        this.attachLoginListeners();
    }

    showPlatformSelection() {
        this.currentStep = 'platforms';
        
        this.overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem;">
                <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%); border-radius: 2rem; max-width: 500px; width: 100%; padding: 3rem 2rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
                    
                    <!-- Progress Indicator -->
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem;">
                        <div style="flex: 1; height: 4px; background: #ff2e63; border-radius: 2px;"></div>
                        <div style="flex: 1; height: 4px; background: #ff2e63; border-radius: 2px;"></div>
                        <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px;"></div>
                    </div>

                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📺</div>
                        <h2 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                            Select Your Platforms
                        </h2>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                            Choose the streaming services you have access to
                        </p>
                    </div>

                    <!-- Platform Selection -->
                    <div id="platform-selection" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem;">
                        ${this.renderPlatformOptions()}
                    </div>

                    <!-- Select All Toggle -->
                    <button id="select-all-btn" style="width: 100%; padding: 0.75rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 0.75rem; color: #818cf8; font-weight: 600; cursor: pointer; margin-bottom: 2rem; transition: all 0.2s;">
                        Select All
                    </button>

                    <!-- Continue Button -->
                    <button id="continue-btn" disabled style="width: 100%; padding: 1.25rem; background: linear-gradient(135deg,#ff2e63,#d90062); border: none; border-radius: 0.75rem; color: white; font-weight: 700; font-size: 1.125rem; cursor: pointer; opacity: 0.5; transition: all 0.2s;">
                        Continue
                    </button>

                    <p style="text-align: center; color: rgba(255,255,255,0.5); font-size: 0.75rem; margin: 1rem 0 0 0;">
                        You can change these anytime in Settings
                    </p>

                </div>
            </div>
        `;

        this.attachPlatformListeners();
    }

    renderPlatformOptions() {
        const platforms = [
            { name: 'Netflix', emoji: '🔴', color: '#E50914' },
            { name: 'Hulu', emoji: '🟢', color: '#1CE783' },
            { name: 'Prime Video', emoji: '🔵', color: '#00A8E1' },
            { name: 'Disney+', emoji: '⭐', color: '#113CCF' },
            { name: 'HBO Max', emoji: '🟣', color: '#B200FF' },
            { name: 'Apple TV+', emoji: '🍎', color: '#000000' }
        ];

        return platforms.map(platform => `
            <label class="platform-option" data-platform="${platform.name}" style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem; background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); border-radius: 1rem; cursor: pointer; transition: all 0.3s;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-size: 2rem;">${platform.emoji}</span>
                    <span style="font-weight: 700; color: white; font-size: 1.125rem;">
                        ${platform.name}
                    </span>
                </div>
                <input type="checkbox" class="platform-checkbox" data-platform="${platform.name}" 
                       style="width: 24px; height: 24px; cursor: pointer; accent-color: ${platform.color};">
            </label>
        `).join('');
    }

    completeOnboarding() {
        // Save that onboarding is complete
        const preferences = store.getState().preferences || {};
        preferences.onboardingComplete = true;
        store.setState({ preferences });

        // Save to localStorage
        try {
            localStorage.setItem('moviePickerPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('[Onboarding] Failed to save preferences:', error);
        }

        // Show success message briefly
        this.overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem;">
                <div style="text-align: center;">
                    <div style="font-size: 5rem; margin-bottom: 1rem; animation: bounce 0.6s ease-in-out;">🎉</div>
                    <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                        You're All Set!
                    </h2>
                    <p style="color: rgba(255,255,255,0.6); font-size: 1.125rem; margin: 0;">
                        Let's start swiping...
                    </p>
                </div>
            </div>
            <style>
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
            </style>
        `;

        // Remove overlay after 2 seconds
        setTimeout(() => {
            this.removeOverlay();
            
            // Navigate to swipe tab
            window.dispatchEvent(new CustomEvent('navigate-to-tab', {
                detail: 'swipe'
            }));
        }, 2000);
    }

    attachLoginListeners() {
        const form = this.overlay.querySelector('#login-form');
        const googleBtn = this.overlay.querySelector('#google-login-btn');
        const guestBtn = this.overlay.querySelector('#guest-login-btn');
        const signupLink = this.overlay.querySelector('#signup-link');

        // Regular login
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = this.overlay.querySelector('#email-input').value;
            const password = this.overlay.querySelector('#password-input').value;
            const loginBtn = this.overlay.querySelector('#login-btn');

            console.log('[Onboarding] Login attempt:', email);
            
            loginBtn.textContent = 'Signing in...';
            loginBtn.disabled = true;

            try {
                // Use Firebase signInWithEmailAndPassword
                await authService.signInWithEmailAndPassword(email, password);
                console.log('[Onboarding] Login successful');
                
                // Continue even if Firestore sync fails
                this.showPlatformSelection();
            } catch (error) {
                console.error('[Onboarding] Login error:', error);
                loginBtn.textContent = 'Sign In';
                loginBtn.disabled = false;
                
                // Only show error if authentication actually failed
                if (error.code?.startsWith('auth/')) {
                    let errorMessage = 'Login failed. Please try again.';
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'No account found with this email.';
                    } else if (error.code === 'auth/wrong-password') {
                        errorMessage = 'Incorrect password.';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Invalid email address.';
                    }
                    alert(errorMessage);
                } else {
                    // Non-auth error (like Firestore), continue anyway
                    console.warn('[Onboarding] Non-auth error, continuing:', error);
                    this.showPlatformSelection();
                }
            }
        });

        // Google login
        googleBtn?.addEventListener('mouseover', () => {
            googleBtn.style.background = 'rgba(255,255,255,0.1)';
        });
        googleBtn?.addEventListener('mouseout', () => {
            googleBtn.style.background = 'rgba(255,255,255,0.05)';
        });
        googleBtn?.addEventListener('click', async () => {
            console.log('[Onboarding] Google login');
            const originalHTML = googleBtn.innerHTML;
            googleBtn.innerHTML = '<span style="opacity: 0.6;">Signing in with Google...</span>';
            googleBtn.disabled = true;

            try {
                await authService.signInWithGoogle();
                console.log('[Onboarding] Google login successful');
                this.showPlatformSelection();
            } catch (error) {
                console.error('[Onboarding] Google login error:', error);
                googleBtn.innerHTML = originalHTML;
                googleBtn.disabled = false;
                
                // Only alert if it's a real auth failure, not CORS/network
                if (error.code?.startsWith('auth/')) {
                    alert('Google sign-in failed. Please try again.');
                } else {
                    console.warn('[Onboarding] Non-auth error (CORS/network), continuing anyway');
                    this.showPlatformSelection();
                }
            }
        });

        // Guest login
        guestBtn?.addEventListener('mouseover', () => {
            guestBtn.style.background = 'rgba(255,255,255,0.1)';
        });
        guestBtn?.addEventListener('mouseout', () => {
            guestBtn.style.background = 'rgba(255,255,255,0.05)';
        });
        guestBtn?.addEventListener('click', async () => {
            console.log('[Onboarding] Guest login');
            guestBtn.textContent = 'Signing in as Guest...';
            guestBtn.disabled = true;

            try {
                await authService.signInAnonymously();
                console.log('[Onboarding] Guest login successful');
                this.showPlatformSelection();
            } catch (error) {
                console.error('[Onboarding] Guest login error:', error);
                
                // Check if authentication actually succeeded despite error
                if (authService.isAuthenticated()) {
                    console.log('[Onboarding] Auth succeeded despite error, continuing');
                    this.showPlatformSelection();
                } else {
                    guestBtn.textContent = 'Continue as Guest';
                    guestBtn.disabled = false;
                    alert('Guest sign-in failed. Please try again or use email login.');
                }
            }
        });

        // Sign up link
        signupLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignup();
        });
    }

    async mockLogin(email, password) {
        const loginBtn = this.overlay.querySelector('#login-btn');
        const googleBtn = this.overlay.querySelector('#google-login-btn');
        const guestBtn = this.overlay.querySelector('#guest-login-btn');
        
        if (loginBtn) {
            loginBtn.textContent = 'Signing in...';
            loginBtn.disabled = true;
        }

        try {
            let user;
            
            if (email === 'google') {
                // Google login
                user = await authService.loginWithGoogle();
            } else if (email === 'guest') {
                // Guest login
                user = await authService.loginAsGuest();
            } else {
                // Regular login
                user = await authService.login(email, password);
            }

            console.log('[Onboarding] Login successful:', user);

            // Move to platform selection
            this.showPlatformSelection();
            
        } catch (error) {
            console.error('[Onboarding] Login failed:', error);
            
            if (loginBtn) {
                loginBtn.textContent = 'Sign In';
                loginBtn.disabled = false;
            }
            
            alert('Login failed. Please try again.');
        }
    }

    attachPlatformListeners() {
        const checkboxes = this.overlay.querySelectorAll('.platform-checkbox');
        const labels = this.overlay.querySelectorAll('.platform-option');
        const continueBtn = this.overlay.querySelector('#continue-btn');
        const selectAllBtn = this.overlay.querySelector('#select-all-btn');

        // Update continue button state
        const updateContinueButton = () => {
            const selected = Array.from(checkboxes).filter(cb => cb.checked);
            if (selected.length > 0) {
                continueBtn.disabled = false;
                continueBtn.style.opacity = '1';
                continueBtn.style.cursor = 'pointer';
            } else {
                continueBtn.disabled = true;
                continueBtn.style.opacity = '0.5';
                continueBtn.style.cursor = 'not-allowed';
            }
        };

        // Checkbox change
        checkboxes.forEach((checkbox, index) => {
            const label = labels[index];
            
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    label.style.border = '2px solid #ff2e63';
                    label.style.background = 'rgba(255,46,99,0.1)';
                } else {
                    label.style.border = '2px solid rgba(255,255,255,0.1)';
                    label.style.background = 'rgba(255,255,255,0.03)';
                }
                updateContinueButton();
            });

            // Label click
            label.addEventListener('mouseover', () => {
                label.style.transform = 'translateX(4px)';
            });
            label.addEventListener('mouseout', () => {
                label.style.transform = 'translateX(0)';
            });
        });

        // Select all
        let allSelected = false;
        selectAllBtn?.addEventListener('click', () => {
            allSelected = !allSelected;
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = allSelected;
                const label = labels[index];
                if (allSelected) {
                    label.style.border = '2px solid #ff2e63';
                    label.style.background = 'rgba(255,46,99,0.1)';
                } else {
                    label.style.border = '2px solid rgba(255,255,255,0.1)';
                    label.style.background = 'rgba(255,255,255,0.03)';
                }
            });
            selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
            updateContinueButton();
        });

        // Continue button
        continueBtn?.addEventListener('click', () => {
            const selected = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.platform);

            console.log('[Onboarding] Selected platforms:', selected);

            // Save to preferences
            const preferences = store.getState().preferences || {};
            preferences.platforms = {
                'Netflix': selected.includes('Netflix'),
                'Hulu': selected.includes('Hulu'),
                'Prime Video': selected.includes('Prime Video'),
                'Disney+': selected.includes('Disney+'),
                'HBO Max': selected.includes('HBO Max'),
                'Apple TV+': selected.includes('Apple TV+')
            };
            store.setState({ preferences });

            // Complete onboarding
            this.completeOnboarding();
        });
    }

    createOverlay() {
        // Remove existing overlay if any
        this.removeOverlay();

        this.overlay = document.createElement('div');
        this.overlay.id = 'onboarding-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%);
            overflow-y: auto;
        `;

        document.body.appendChild(this.overlay);
        document.body.style.overflow = 'hidden';
    }

    removeOverlay() {
        const existing = document.getElementById('onboarding-overlay');
        if (existing) {
            existing.remove();
        }
        document.body.style.overflow = 'auto';
    }
}

// Export singleton
export const onboardingFlow = new OnboardingFlow();

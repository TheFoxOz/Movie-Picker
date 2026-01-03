/**
 * MoviEase - Profile Tab  
 * ✅ Complete Add Friend feature with Firebase
 * ✅ UPDATED: Cloud Functions for secure friend lookup
 * ✅ Avatar Upload with camera/gallery
 * ✅ Friend codes, friend list, real-time sync
 * ✅ Working theme toggle
 * ✅ MoviEase branding
 */

import { authService } from '../services/auth-service.js';
import { userProfileService } from '../services/user-profile-revised.js';
import { STREAMING_PLATFORMS } from '../config/streaming-platforms.js';
import { TRIGGER_CATEGORIES } from '../config/trigger-categories.js';
import { avatarUpload } from '../components/avatar-upload.js';
import { badgeService, BADGES } from '../services/badge-service.js';

// Import db from existing firebase-config
import { db } from '../services/firebase-config.js';

// Import Firestore functions from the same Firebase package
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs,
    setDoc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    onSnapshot,
    query 
} from 'firebase/firestore';

// ✅ NEW: Import Firebase Functions
import { getFunctions, httpsCallable } from 'firebase/functions';

const TMDB_REGIONS = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪' }
];

export class ProfileTab {
    constructor() {
        this.container = null;
        this.friends = [];
        this.friendsUnsubscribe = null;
        this.avatarUpdateHandler = null;
        
        // ✅ NEW: Initialize Firebase Functions
        this.functions = getFunctions();
        
        // Initialize avatar upload component
        avatarUpload.init();
    }

    async render(container) {
        this.container = container;
        
        const user = authService.getCurrentUser();
        const profile = userProfileService.getProfile();
        
        if (!user) {
            console.error('[ProfileTab] No user logged in');
            this.renderError();
            return;
        }

        console.log('[ProfileTab] Rendering profile for:', user.email);
        
        // ✅ CRITICAL: Sync preferences to localStorage for TMDB service
        await this.syncPreferencesToLocalStorage(user.uid, profile);
        
        // Load friends
        await this.loadFriends(user.uid);
        
        this.container.innerHTML = `
            <div style="
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
            ">
                <div class="profile-container" style="padding: 1.5rem 1rem 6rem; max-width: 600px; margin: 0 auto;">
                    <!-- Avatar Upload Section -->
                    <div style="
                        background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2));
                        border: 1px solid rgba(166, 192, 221, 0.3);
                        border-radius: 1rem;
                        padding: 1.5rem;
                        margin-bottom: 1.5rem;
                        text-align: center;
                    ">
                        <h2 style="
                            font-size: 1.125rem;
                            font-weight: 700;
                            color: #FDFAB0;
                            margin-bottom: 1rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 0.5rem;
                        ">
                            👤 Profile Picture
                        </h2>
                        
                        <!-- Avatar with Upload -->
                        <div id="avatar-container" style="
                            position: relative;
                            width: 100px;
                            height: 100px;
                            margin: 0 auto 1rem;
                            cursor: pointer;
                            transition: all 0.2s;
                        " 
                        onmouseover="this.style.transform='scale(1.05)';"
                        onmouseout="this.style.transform='scale(1)';">
                            <!-- Avatar Image -->
                            <div style="
                                width: 100%;
                                height: 100%;
                                background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 2.5rem;
                                color: #18183A;
                                box-shadow: 0 4px 12px rgba(166, 192, 221, 0.3);
                                overflow: hidden;
                            ">
                                ${user.photoURL 
                                    ? `<img src="${user.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`
                                    : this.getInitials(user.displayName || user.email)
                                }
                            </div>
                            
                            <!-- Camera Icon Overlay -->
                            <div style="
                                position: absolute;
                                bottom: 0;
                                right: 0;
                                width: 36px;
                                height: 36px;
                                background: linear-gradient(135deg, #3b82f6, #2563eb);
                                border: 3px solid #18183A;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 1.125rem;
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                                transition: all 0.2s;
                            " onmouseover="this.style.transform='scale(1.1)';"
                               onmouseout="this.style.transform='scale(1)';">
                                📷
                            </div>
                        </div>
                        
                        <p style="color: #FDFAB0; font-size: 1rem; font-weight: 600; margin: 0;">
                            ${user.displayName || 'MoviEase User'}
                        </p>
                        <p style="color: #A6C0DD; font-size: 0.75rem; margin: 0.25rem 0 0 0; opacity: 0.7;">
                            ${user.email || ''}
                        </p>
                    </div>

                    <!-- Badges Section -->
                    <div id="badges-container"></div>
                    
                    ${this.renderAddFriendSection(user)}
                    ${this.renderRegionSection(profile)}
                    ${this.renderPlatformsSection(profile)}
                    ${this.renderTriggerWarningsSection(profile)}
                    ${this.renderAccountSection()}
                </div>
            </div>

            <!-- Add Friend Modal -->
            <div id="add-friend-modal" style="
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                padding: 1rem;
            ">
                <div style="
                    background: linear-gradient(180deg, #18183A 0%, #0f0f26 100%);
                    border: 2px solid rgba(166, 192, 221, 0.3);
                    border-radius: 1.5rem;
                    padding: 2rem;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: #FDFAB0; margin: 0;">Add Friend</h2>
                        <button id="close-friend-modal" style="
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            background: rgba(166, 192, 221, 0.2);
                            border: none;
                            color: #FDFAB0;
                            font-size: 1.25rem;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">✕</button>
                    </div>

                    <!-- Your Friend Code -->
                    <div style="background: rgba(166, 192, 221, 0.15); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.25rem; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.875rem; font-weight: 700; color: #A6C0DD; text-transform: uppercase; margin: 0 0 0.75rem 0;">
                            Your Friend Code
                        </h3>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <input 
                                type="text" 
                                id="my-friend-code" 
                                value="${this.generateFriendCode(user.uid)}" 
                                readonly
                                style="
                                    flex: 1;
                                    padding: 0.875rem;
                                    background: rgba(166, 192, 221, 0.1);
                                    border: 1px solid rgba(166, 192, 221, 0.3);
                                    border-radius: 0.75rem;
                                    color: #FDFAB0;
                                    font-size: 1.125rem;
                                    font-weight: 700;
                                    text-align: center;
                                    letter-spacing: 0.1em;
                                "
                            >
                            <button id="copy-friend-code" style="
                                padding: 0.875rem 1.25rem;
                                background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                                border: none;
                                border-radius: 0.75rem;
                                color: #18183A;
                                font-size: 0.875rem;
                                font-weight: 700;
                                cursor: pointer;
                                white-space: nowrap;
                            ">Copy</button>
                        </div>
                    </div>

                    <!-- Add Friend by Code -->
                    <div style="background: rgba(166, 192, 221, 0.15); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.25rem;">
                        <h3 style="font-size: 0.875rem; font-weight: 700; color: #A6C0DD; text-transform: uppercase; margin: 0 0 0.75rem 0;">
                            Enter Friend Code
                        </h3>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <input 
                                type="text" 
                                id="friend-code-input" 
                                placeholder="ABC123"
                                style="
                                    flex: 1;
                                    padding: 0.875rem;
                                    background: rgba(166, 192, 221, 0.1);
                                    border: 1px solid rgba(166, 192, 221, 0.3);
                                    border-radius: 0.75rem;
                                    color: #FDFAB0;
                                    font-size: 1rem;
                                    text-transform: uppercase;
                                "
                            >
                            <button id="add-friend-submit" style="
                                padding: 0.875rem 1.25rem;
                                background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                                border: none;
                                border-radius: 0.75rem;
                                color: #18183A;
                                font-size: 0.875rem;
                                font-weight: 700;
                                cursor: pointer;
                                white-space: nowrap;
                            ">Add</button>
                        </div>
                        <p style="color: #A6C0DD; font-size: 0.75rem; margin: 0.75rem 0 0 0; opacity: 0.8;">
                            Share your code with friends to connect on MoviEase
                        </p>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.injectToggleStyles();
        
        // Load badges
        await this.loadBadges();
    }

    generateFriendCode(uid) {
        // Generate a consistent 6-character code from UID using simple hash
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars (no confusing I,O,0,1)
        let code = '';
        
        // Create a simple hash from the UID
        let hash = 0;
        for (let i = 0; i < uid.length; i++) {
            hash = ((hash << 5) - hash) + uid.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Convert hash to positive number
        hash = Math.abs(hash);
        
        // Generate 6 characters
        for (let i = 0; i < 6; i++) {
            code += chars[hash % chars.length];
            hash = Math.floor(hash / chars.length);
        }
        
        return code;
    }

    async loadFriends(uid) {
        try {
            // Subscribe to friends list changes
            if (this.friendsUnsubscribe) {
                this.friendsUnsubscribe();
            }

            const userDocRef = doc(db, 'users', uid);
            
            this.friendsUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const friendIds = docSnap.data().friends || [];
                    
                    console.log('[ProfileTab] Loading friends, IDs:', friendIds);
                    
                    // Load friend details
                    const friendPromises = friendIds.map(async (friendId) => {
                        const friendDoc = await getDoc(doc(db, 'users', friendId));
                        if (friendDoc.exists()) {
                            const data = friendDoc.data();
                            console.log('[ProfileTab] Raw friend data:', {
                                id: friendId,
                                displayName: data.displayName,
                                userName: data.userName,
                                email: data.email,
                                allFields: Object.keys(data)
                            });
                            return {
                                id: friendId,
                                ...data
                            };
                        }
                        return null;
                    });
                    
                    this.friends = (await Promise.all(friendPromises)).filter(f => f !== null);
                    console.log('[ProfileTab] Friends loaded:', this.friends.length);
                    
                    // Update friends display if container exists
                    if (this.container) {
                        const friendsContainer = this.container.querySelector('#friends-list');
                        if (friendsContainer) {
                            friendsContainer.innerHTML = this.renderFriendsList();
                            // Re-attach remove buttons
                            this.attachRemoveFriendListeners();
                        }
                    }
                } else {
                    // Create user document if it doesn't exist
                    await setDoc(userDocRef, {
                        email: authService.getCurrentUser()?.email,
                        displayName: authService.getCurrentUser()?.displayName,
                        friends: [],
                        createdAt: new Date().toISOString()
                    });
                }
            });
        } catch (error) {
            console.error('[ProfileTab] Error loading friends:', error);
        }
    }

    // ✅ UPDATED: Use Cloud Functions instead of scanning all users
    async addFriend(friendCode) {
        const user = authService.getCurrentUser();
        if (!user) return;

        try {
            console.log('[ProfileTab] Looking up friend code:', friendCode);
            
            // ✅ STEP 1: Find user by friend code using Cloud Function
            const findUserFunction = httpsCallable(this.functions, 'findUserByFriendCode');
            const findResult = await findUserFunction({ friendCode: friendCode.toUpperCase() });
            
            console.log('[ProfileTab] Find result:', findResult.data);
            
            if (!findResult.data.found) {
                this.showToast('Friend code not found ❌', true);
                return;
            }
            
            const friendId = findResult.data.user.uid;

            // ✅ STEP 2: Prevent self-friending
            if (friendId === user.uid) {
                this.showToast('Cannot add yourself as a friend ❌', true);
                return;
            }

            // ✅ STEP 3: Check if already friends
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const currentFriends = userDoc.exists() ? userDoc.data().friends || [] : [];
            
            if (currentFriends.includes(friendId)) {
                this.showToast('Already friends! 👥');
                return;
            }

            // ✅ STEP 4: Add friend using Cloud Function
            console.log('[ProfileTab] Adding friend via Cloud Function');
            const addFriendFunction = httpsCallable(this.functions, 'addFriendByCode');
            await addFriendFunction({ friendCode: friendCode.toUpperCase() });

            console.log('[ProfileTab] Friend added successfully:', friendId);

            // ✅ STEP 5: Track badge progress for adding friend
            await this.trackFriendBadge();

            this.showToast('Friend added successfully! 🎉');
            
            // Close modal
            const modal = this.container.querySelector('#add-friend-modal');
            if (modal) modal.style.display = 'none';
            
            // Clear input
            const input = this.container.querySelector('#friend-code-input');
            if (input) input.value = '';

        } catch (error) {
            console.error('[ProfileTab] Error adding friend:', error);
            
            // ✅ Better error messages based on Cloud Function error codes
            if (error.code === 'functions/invalid-argument') {
                this.showToast('Invalid friend code format ❌', true);
            } else if (error.code === 'functions/not-found') {
                this.showToast('Friend code not found ❌', true);
            } else if (error.code === 'functions/unauthenticated') {
                this.showToast('Please log in again ❌', true);
            } else {
                this.showToast('Failed to add friend ❌', true);
            }
        }
    }

    async removeFriend(friendId) {
        const user = authService.getCurrentUser();
        if (!user) return;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const friendDocRef = doc(db, 'users', friendId);

            await updateDoc(userDocRef, {
                friends: arrayRemove(friendId)
            });

            await updateDoc(friendDocRef, {
                friends: arrayRemove(user.uid)
            });

            this.showToast('Friend removed 👋');

        } catch (error) {
            console.error('[ProfileTab] Error removing friend:', error);
            this.showToast('Failed to remove friend ❌', true);
        }
    }

    async trackFriendBadge() {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;
            
            const newBadges = await badgeService.checkBadges(user.uid, {
                type: 'friend'
            });
            
            if (newBadges.length > 0) {
                console.log('[ProfileTab] 🏆 Unlocked badges:', newBadges.map(b => b.name));
            }
        } catch (error) {
            console.error('[ProfileTab] Error tracking friend badge:', error);
        }
    }

    async syncPreferencesToLocalStorage(userId, profile) {
        try {
            // Get platforms from profile.selectedPlatforms (this is what renders the checkboxes)
            const enabledPlatforms = profile.selectedPlatforms || [];
            
            // Get blocked triggers (items that are UNCHECKED in trigger warnings)
            const allTriggerCategories = TRIGGER_CATEGORIES.map(c => c.id);
            const enabledTriggers = profile.triggers || [];
            const blockedTriggers = allTriggerCategories.filter(id => !enabledTriggers.includes(id));
            
            const prefs = {
                region: profile.region || 'US',
                platforms: enabledPlatforms,
                blockedTriggers: blockedTriggers
            };
            
            localStorage.setItem(`userPreferences_${userId}`, JSON.stringify(prefs));
            console.log('[ProfileTab] ✅ Synced preferences to localStorage:', prefs);
        } catch (error) {
            console.error('[ProfileTab] Error syncing preferences:', error);
        }
    }

    async loadBadges() {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;
            
            const badgeData = await badgeService.getUserBadges(user.uid);
            this.renderBadges(badgeData);
        } catch (error) {
            console.error('[ProfileTab] Error loading badges:', error);
        }
    }

    renderBadges(badgeData) {
        const badgesContainer = document.getElementById('badges-container');
        if (!badgesContainer) return;
        
        const unlockedBadgeIds = badgeData.unlockedBadges || [];
        const totalPoints = badgeData.points || 0;
        
        // Map badge IDs to actual badge objects
        const unlockedBadges = unlockedBadgeIds
            .map(badgeId => BADGES[badgeId])
            .filter(badge => badge); // Filter out any undefined badges
        
        if (unlockedBadges.length === 0) {
            badgesContainer.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, rgba(166, 192, 221, 0.1), rgba(253, 250, 176, 0.05));
                    border: 1px solid rgba(166, 192, 221, 0.2);
                    border-radius: 1rem;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    text-align: center;
                ">
                    <p style="font-size: 2rem; margin: 0 0 0.5rem 0;">🏆</p>
                    <p style="font-size: 0.85rem; color: #A6C0DD; margin: 0;">
                        No badges yet. Start swiping to unlock achievements!
                    </p>
                </div>
            `;
            return;
        }
        
        badgesContainer.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(166, 192, 221, 0.1), rgba(253, 250, 176, 0.05));
                border: 1px solid rgba(166, 192, 221, 0.2);
                border-radius: 1rem;
                padding: 1rem;
                margin-bottom: 1.5rem;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.75rem;
                ">
                    <h3 style="
                        color: #FDFAB0;
                        margin: 0;
                        font-size: 0.95rem;
                        font-weight: 700;
                    ">🏆 Your Badges</h3>
                    <span style="
                        font-size: 0.75rem;
                        color: #A6C0DD;
                        font-weight: 500;
                    ">${unlockedBadges.length} badges • ${totalPoints} pts</span>
                </div>
                <div style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.75rem;
                ">
                    ${unlockedBadges.slice(0, 6).map(badge => `
                        <div style="
                            background: linear-gradient(135deg, rgba(166, 192, 221, 0.15), rgba(253, 250, 176, 0.1));
                            border: 1px solid rgba(166, 192, 221, 0.25);
                            border-radius: 0.5rem;
                            padding: 0.75rem;
                            text-align: center;
                            transition: all 0.2s;
                        " 
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(253, 250, 176, 0.4)';" 
                        onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(166, 192, 221, 0.25)';"
                        title="${badge.description}">
                            <div style="font-size: 1.75rem; margin-bottom: 0.25rem;">${badge.icon}</div>
                            <div style="
                                font-size: 0.7rem;
                                color: #FDFAB0;
                                font-weight: 600;
                                margin-bottom: 0.15rem;
                                line-height: 1.2;
                            ">${badge.name}</div>
                            <div style="font-size: 0.6rem; color: #A6C0DD;">+${badge.points} pts</div>
                        </div>
                    `).join('')}
                </div>
                ${unlockedBadges.length > 6 ? `
                    <div style="text-align: center; margin-top: 0.75rem;">
                        <span style="font-size: 0.75rem; color: #A6C0DD;">
                            +${unlockedBadges.length - 6} more badge${unlockedBadges.length - 6 > 1 ? 's' : ''}
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderFriendsList() {
        if (this.friends.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem 1rem; color: #A6C0DD; opacity: 0.6;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👥</div>
                    <p style="font-size: 0.875rem; margin: 0;">No friends yet. Add friends to share your movie discoveries!</p>
                </div>
            `;
        }

        return this.friends.map(friend => {
            // Get display name with fallback chain
            const displayName = friend.displayName || friend.userName || friend.email?.split('@')[0] || 'MoviEase User';
            console.log('[ProfileTab] Friend data:', { id: friend.id, displayName: friend.displayName, userName: friend.userName, email: friend.email, finalName: displayName });
            
            return `
            <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.875rem;
                background: rgba(166, 192, 221, 0.1);
                border: 1px solid rgba(166, 192, 221, 0.2);
                border-radius: 0.75rem;
                margin-bottom: 0.5rem;
            ">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1rem;
                        font-weight: 700;
                        color: #18183A;
                    ">
                        ${this.getInitials(displayName)}
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; font-weight: 600; color: #FDFAB0;">
                            ${displayName}
                        </div>
                    </div>
                </div>
                <button 
                    class="remove-friend-btn" 
                    data-friend-id="${friend.id}"
                    style="
                        padding: 0.5rem 0.875rem;
                        background: rgba(239, 68, 68, 0.2);
                        border: 1px solid rgba(239, 68, 68, 0.4);
                        border-radius: 0.5rem;
                        color: #ef4444;
                        font-size: 0.75rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    "
                    onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'"
                    onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'"
                >
                    Remove
                </button>
            </div>
        `;
        }).join('');
    }

    renderAddFriendSection(user) {
        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    👥 Friends ${this.friends.length > 0 ? `(${this.friends.length})` : ''}
                </h2>
                <p style="color: #A6C0DD; font-size: 0.875rem; margin-bottom: 1rem;">
                    Share your movie discoveries with friends
                </p>
                
                <!-- Friends List -->
                <div id="friends-list" style="margin-bottom: 1rem; max-height: 300px; overflow-y: auto;">
                    ${this.renderFriendsList()}
                </div>
                
                <button id="add-friend-btn" style="
                    width: 100%;
                    padding: 1rem;
                    background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                    border: none;
                    border-radius: 0.75rem;
                    color: #18183A;
                    font-weight: 700;
                    font-size: 0.9375rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(166, 192, 221, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 16px rgba(166, 192, 221, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(166, 192, 221, 0.3)'">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:20px;height:20px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                    Add Friend
                </button>
            </div>
        `;
    }

    renderRegionSection(profile) {
        const regionsHTML = TMDB_REGIONS.map(region => 
            `<option value="${region.code}" ${profile.region === region.code ? 'selected' : ''} style="background: #18183A; color: #FDFAB0;">
                ${region.flag} ${region.name}
            </option>`
        ).join('');

        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    🌍 Region
                </h2>
                <p style="color: #A6C0DD; font-size: 0.875rem; margin-bottom: 1rem;">
                    Affects movie availability and streaming options
                </p>
                <select 
                    id="region-select" 
                    style="
                        width: 100%;
                        padding: 0.875rem;
                        background: rgba(166, 192, 221, 0.2);
                        border: 1px solid rgba(166, 192, 221, 0.3);
                        border-radius: 0.75rem;
                        color: #FDFAB0;
                        font-size: 0.9375rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    "
                >
                    ${regionsHTML}
                </select>
            </div>
        `;
    }

    renderPlatformsSection(profile) {
        // ✅ NEW: Filter platforms by user's region
        const userRegion = profile.region || 'US';
        
        // Get region-specific platforms
        let availablePlatforms = STREAMING_PLATFORMS;
        
        // Region-specific platform filtering
        const regionPlatformMap = {
            'US': ['In Cinemas', 'Netflix', 'Hulu', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+', 'Paramount+', 'Peacock', 'Max', 'Showtime'],
            'GB': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Sky Go', 'Now', 'BBC iPlayer', 'Channel 4', 'ITV Hub'],
            'CA': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Crave', 'Paramount+'],
            'AU': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Stan'],
            'IN': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Hotstar'],
            'DE': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'],
            'FR': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'],
            'ES': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'],
            'IT': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'],
            'JP': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'],
            'KR': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'],
            'BR': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'],
            'MX': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Paramount+'],
            'NL': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Viaplay'],
            'SE': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Viaplay'],
            'NO': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Viaplay'],
            'DK': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Viaplay'],
            'FI': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Viaplay']
        };
        
        // Get platform IDs for current region (fallback to global platforms)
        const regionPlatformIds = regionPlatformMap[userRegion] || ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'];
        
        // Filter platforms to only show those available in the user's region
        availablePlatforms = STREAMING_PLATFORMS.filter(platform => 
            regionPlatformIds.includes(platform.id)
        );
        
        console.log(`[ProfileTab] Showing ${availablePlatforms.length} platforms for region ${userRegion}`);
        
        const platformsHTML = availablePlatforms.map(platform => {
            const isSelected = profile.selectedPlatforms.includes(platform.id);
            return `
                <div class="platform-toggle-item" data-platform="${platform.id}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    background: rgba(166, 192, 221, 0.15);
                    border: 1px solid rgba(166, 192, 221, 0.2);
                    border-radius: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    <span style="color: #FDFAB0; font-weight: 600; font-size: 0.875rem;">
                        ${platform.icon} ${platform.name}
                    </span>
                    <label class="toggle-switch" onclick="event.stopPropagation()">
                        <input type="checkbox" class="platform-checkbox" data-platform="${platform.id}" ${isSelected ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    📺 Streaming Platforms
                </h2>
                <p style="color: #A6C0DD; font-size: 0.875rem; margin-bottom: 1rem;">
                    Available in ${this.getRegionName(userRegion)} • ${availablePlatforms.length} platforms • ${profile.selectedPlatforms.length} selected
                </p>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                    ${platformsHTML}
                </div>
            </div>
        `;
    }

    getRegionName(code) {
        const region = TMDB_REGIONS.find(r => r.code === code);
        return region ? `${region.flag} ${region.name}` : code;
    }

    renderTriggerWarningsSection(profile) {
        const categoriesHTML = TRIGGER_CATEGORIES.map(category => {
            const isEnabled = profile.triggerWarnings.enabledCategories.includes(category.id);
            return `
                <div class="trigger-toggle-item" data-category="${category.id}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.5rem 0.625rem;
                    background: rgba(166, 192, 221, 0.15);
                    border: 1px solid rgba(166, 192, 221, 0.2);
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    gap: 0.5rem;
                    min-height: 42px;
                    max-width: 100%;
                    box-sizing: border-box;
                ">
                    <div style="
                        flex: 1;
                        min-width: 0;
                        max-width: calc(100% - 44px);
                        overflow: hidden;
                    ">
                        <div style="
                            font-weight: 600;
                            color: #FDFAB0;
                            font-size: 0.6875rem;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            line-height: 1.2;
                        ">
                            ${category.name}
                        </div>
                        <div style="
                            color: #A6C0DD;
                            font-size: 0.5625rem;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            margin-top: 0.125rem;
                            line-height: 1.2;
                        ">
                            ${category.description}
                        </div>
                    </div>
                    <label class="toggle-switch-small" onclick="event.stopPropagation()" style="flex-shrink: 0;">
                        <input type="checkbox" class="trigger-checkbox" data-category="${category.id}" ${isEnabled ? 'checked' : ''}>
                        <span class="toggle-slider-small"></span>
                    </label>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    ⚠️ Trigger Warnings
                </h2>
                <p style="color: #A6C0DD; font-size: 0.875rem; margin-bottom: 1rem;">
                    Filter content by warnings (${profile.triggerWarnings.enabledCategories.length} active)
                </p>
                
                <!-- Show All Toggle -->
                <div style="margin-bottom: 0.875rem; padding: 0.625rem 0.75rem; background: rgba(166, 192, 221, 0.15); border: 1px solid rgba(166, 192, 221, 0.2); border-radius: 0.625rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="color: #FDFAB0; font-weight: 600; font-size: 0.8125rem;">Show All Warnings</div>
                        <div style="color: #A6C0DD; font-size: 0.6875rem;">Display regardless of selection</div>
                    </div>
                    <label class="toggle-switch" style="flex-shrink: 0;">
                        <input type="checkbox" id="show-all-warnings" ${profile.triggerWarnings.showAllWarnings ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Categories Grid -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 0.5rem;
                    max-width: 100%;
                ">
                    ${categoriesHTML}
                </div>
            </div>
        `;
    }

    renderAccountSection() {
        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    ⚙️ Account
                </h2>

                <button id="logout-btn" style="
                    width: 100%;
                    padding: 1rem;
                    background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                    border: 2px solid #FDFAB0;
                    border-radius: 0.75rem;
                    color: #18183A;
                    font-weight: 700;
                    font-size: 0.9375rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(166, 192, 221, 0.3);
                " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 16px rgba(166, 192, 221, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(166, 192, 221, 0.3)'">
                    🚪 Sign Out
                </button>
            </div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
            <div style="
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 1rem;
                padding: 2rem;
                text-align: center;
            ">
                <div style="font-size: 3rem;">⚠️</div>
                <div style="color: #FDFAB0; font-weight: 700; font-size: 1.25rem;">Not Logged In</div>
                <div style="color: #A6C0DD; font-size: 0.875rem;">Please log in to view your profile</div>
            </div>
        `;
    }

    injectToggleStyles() {
        if (document.getElementById('profile-toggle-styles')) return;

        const style = document.createElement('style');
        style.id = 'profile-toggle-styles';
        style.textContent = `
            /* Regular Toggle Switch */
            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 48px;
                height: 28px;
                flex-shrink: 0;
            }

            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(166, 192, 221, 0.3);
                transition: 0.3s;
                border-radius: 28px;
            }

            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 20px;
                width: 20px;
                left: 4px;
                bottom: 4px;
                background: white;
                transition: 0.3s;
                border-radius: 50%;
            }

            input:checked + .toggle-slider {
                background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
            }

            input:checked + .toggle-slider:before {
                transform: translateX(20px);
            }

            /* Small Toggle Switch */
            .toggle-switch-small {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
                flex-shrink: 0;
            }

            .toggle-switch-small input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider-small {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(166, 192, 221, 0.3);
                transition: 0.3s;
                border-radius: 20px;
            }

            .toggle-slider-small:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
                background: white;
                transition: 0.3s;
                border-radius: 50%;
            }

            input:checked + .toggle-slider-small {
                background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
            }

            input:checked + .toggle-slider-small:before {
                transform: translateX(16px);
            }

            /* Hover effects */
            .platform-toggle-item:hover,
            .trigger-toggle-item:hover {
                background: rgba(166, 192, 221, 0.25);
                border-color: rgba(166, 192, 221, 0.4);
            }

            /* Region select styling */
            #region-select:hover {
                background: rgba(166, 192, 221, 0.3);
                border-color: rgba(166, 192, 221, 0.4);
            }

            #region-select:focus {
                outline: none;
                border-color: #A6C0DD;
                box-shadow: 0 0 0 3px rgba(166, 192, 221, 0.2);
            }

            #region-select option {
                background: #18183A;
                color: #FDFAB0;
                padding: 0.5rem;
            }

            /* Friends list scrollbar */
            #friends-list::-webkit-scrollbar {
                width: 6px;
            }

            #friends-list::-webkit-scrollbar-track {
                background: rgba(166, 192, 221, 0.1);
                border-radius: 3px;
            }

            #friends-list::-webkit-scrollbar-thumb {
                background: rgba(166, 192, 221, 0.3);
                border-radius: 3px;
            }

            #friends-list::-webkit-scrollbar-thumb:hover {
                background: rgba(166, 192, 221, 0.5);
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Add Friend button - Open modal
        const addFriendBtn = document.getElementById('add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                const modal = this.container.querySelector('#add-friend-modal');
                if (modal) modal.style.display = 'flex';
            });
        }

        // Close modal
        const closeModalBtn = document.getElementById('close-friend-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                const modal = this.container.querySelector('#add-friend-modal');
                if (modal) modal.style.display = 'none';
            });
        }

        // Close modal on backdrop click
        const modal = this.container.querySelector('#add-friend-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Copy friend code
        const copyCodeBtn = document.getElementById('copy-friend-code');
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                const input = document.getElementById('my-friend-code');
                if (input) {
                    input.select();
                    navigator.clipboard.writeText(input.value);
                    this.showToast('Friend code copied! 📋');
                }
            });
        }

        // Add friend submit
        const addFriendSubmit = document.getElementById('add-friend-submit');
        if (addFriendSubmit) {
            addFriendSubmit.addEventListener('click', () => {
                const input = document.getElementById('friend-code-input');
                if (input && input.value.trim()) {
                    this.addFriend(input.value.trim());
                }
            });
        }

        // Enter key on friend code input
        const friendCodeInput = document.getElementById('friend-code-input');
        if (friendCodeInput) {
            friendCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const input = document.getElementById('friend-code-input');
                    if (input && input.value.trim()) {
                        this.addFriend(input.value.trim());
                    }
                }
            });
        }

        // Remove friend buttons
        this.attachRemoveFriendListeners();

        // Region select
        const regionSelect = document.getElementById('region-select');
        if (regionSelect) {
            regionSelect.addEventListener('change', async (e) => {
                const region = e.target.value;
                await userProfileService.updateRegion(region);
                
                // ✅ CRITICAL: Save to localStorage for TMDB service
                const user = authService.getCurrentUser();
                if (user) {
                    const prefs = JSON.parse(localStorage.getItem(`userPreferences_${user.uid}`) || '{}');
                    prefs.region = region;
                    localStorage.setItem(`userPreferences_${user.uid}`, JSON.stringify(prefs));
                    console.log('[ProfileTab] ✅ Region saved to localStorage:', region);
                }
                
                const selectedRegion = TMDB_REGIONS.find(r => r.code === e.target.value);
                this.showToast(`Region updated to ${selectedRegion?.name || e.target.value} ${selectedRegion?.flag || ''} - Platform list refreshed!`);
                
                // ✅ IMPROVED: Re-render platforms section with better DOM targeting
                const profile = userProfileService.getProfile();
                
                // Find the platforms section more reliably
                const allSections = this.container.querySelectorAll('.settings-section');
                let platformsSectionIndex = -1;
                
                allSections.forEach((section, index) => {
                    const header = section.querySelector('h2');
                    if (header && header.textContent.includes('Streaming Platforms')) {
                        platformsSectionIndex = index;
                    }
                });
                
                if (platformsSectionIndex !== -1) {
                    const platformsSection = allSections[platformsSectionIndex];
                    const newPlatformsHTML = this.renderPlatformsSection(profile);
                    
                    // Replace the entire section
                    platformsSection.outerHTML = newPlatformsHTML;
                    
                    console.log('[ProfileTab] ✅ Platforms section refreshed for region:', region);
                    
                    // Re-attach event listeners for new platform checkboxes
                    setTimeout(() => {
                        this.attachPlatformListeners();
                        console.log('[ProfileTab] ✅ Platform listeners re-attached');
                    }, 100);
                }
            });
        }

        // Platform checkboxes
        this.attachPlatformListeners();

        // Trigger warning checkboxes
        const triggerCheckboxes = document.querySelectorAll('.trigger-checkbox');
        triggerCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const categoryId = parseInt(e.target.dataset.category);
                const isEnabled = e.target.checked;
                
                if (isEnabled) {
                    await userProfileService.enableTriggerCategory(categoryId);
                } else {
                    await userProfileService.disableTriggerCategory(categoryId);
                }
                
                // ✅ CRITICAL: Save to localStorage for TMDB service
                const user = authService.getCurrentUser();
                if (user) {
                    // Get all UNCHECKED (blocked) triggers
                    const allCheckboxes = document.querySelectorAll('.trigger-checkbox');
                    const blockedTriggers = Array.from(allCheckboxes)
                        .filter(cb => !cb.checked)
                        .map(cb => parseInt(cb.dataset.category));
                    
                    const prefs = JSON.parse(localStorage.getItem(`userPreferences_${user.uid}`) || '{}');
                    prefs.blockedTriggers = blockedTriggers;
                    localStorage.setItem(`userPreferences_${user.uid}`, JSON.stringify(prefs));
                    console.log('[ProfileTab] ✅ Blocked triggers saved to localStorage:', blockedTriggers);
                }
                
                const category = TRIGGER_CATEGORIES.find(c => c.id === categoryId);
                this.showToast(`${category?.name || 'Category'} ${isEnabled ? 'enabled ✅' : 'disabled ❌'}`);
            });
        });

        // Show all warnings toggle
        const showAllCheckbox = document.getElementById('show-all-warnings');
        if (showAllCheckbox) {
            showAllCheckbox.addEventListener('change', (e) => {
                userProfileService.setShowAllWarnings(e.target.checked);
                this.showToast(e.target.checked ? 'Showing all warnings ⚠️' : 'Showing selected categories');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await authService.signOut();
                    this.showToast('Signed out successfully 👋');
                    setTimeout(() => window.location.reload(), 1000);
                } catch (error) {
                    console.error('[ProfileTab] Logout failed:', error);
                    this.showToast('Failed to sign out ❌', true);
                }
            });
        }
        
        // Avatar upload click handler
        const avatarContainer = document.getElementById('avatar-container');
        if (avatarContainer) {
            avatarContainer.addEventListener('click', () => {
                console.log('[ProfileTab] Opening avatar upload');
                avatarUpload.open();
            });
        }

        // Listen for avatar updates
        this.avatarUpdateHandler = (event) => {
            console.log('[ProfileTab] Avatar updated:', event.detail.photoURL);
            this.render(this.container);
        };
        window.addEventListener('avatar-updated', this.avatarUpdateHandler);
    }

    attachPlatformListeners() {
        const platformCheckboxes = document.querySelectorAll('.platform-checkbox');
        platformCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const platformId = e.target.dataset.platform;
                await userProfileService.togglePlatform(platformId);
                
                // ✅ CRITICAL: Save to localStorage for TMDB service
                const user = authService.getCurrentUser();
                if (user) {
                    // Get all checked platforms
                    const allCheckboxes = document.querySelectorAll('.platform-checkbox');
                    const enabledPlatforms = Array.from(allCheckboxes)
                        .filter(cb => cb.checked)
                        .map(cb => cb.dataset.platform);
                    
                    const prefs = JSON.parse(localStorage.getItem(`userPreferences_${user.uid}`) || '{}');
                    prefs.platforms = enabledPlatforms;
                    localStorage.setItem(`userPreferences_${user.uid}`, JSON.stringify(prefs));
                    console.log('[ProfileTab] ✅ Platforms saved to localStorage:', enabledPlatforms);
                }
                
                const platform = STREAMING_PLATFORMS.find(p => p.id === platformId);
                const isEnabled = e.target.checked;
                this.showToast(`${platform?.icon} ${platform?.name || platformId} ${isEnabled ? 'enabled ✅' : 'disabled ❌'}`);
            });
        });
    }

    attachRemoveFriendListeners() {
        const removeFriendBtns = this.container.querySelectorAll('.remove-friend-btn');
        removeFriendBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const friendId = btn.dataset.friendId;
                if (confirm('Remove this friend?')) {
                    this.removeFriend(friendId);
                }
            });
        });
    }

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 7rem;
            left: 50%;
            transform: translateX(-50%);
            padding: 0.875rem 1.5rem;
            background: ${isError ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #A6C0DD, #8ba3b8)'};
            border: 1px solid ${isError ? 'rgba(220, 38, 38, 0.5)' : 'rgba(166, 192, 221, 0.5)'};
            color: ${isError ? 'white' : '#18183A'};
            border-radius: 0.75rem;
            font-weight: 600;
            font-size: 0.875rem;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            animation: slideUp 0.3s ease-out;
        `;
        
        const keyframes = document.createElement('style');
        keyframes.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes slideDown {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(20px); }
            }
        `;
        document.head.appendChild(keyframes);
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => {
                toast.remove();
                keyframes.remove();
            }, 300);
        }, 2500);
    }

    destroy() {
        if (this.friendsUnsubscribe) {
            this.friendsUnsubscribe();
            this.friendsUnsubscribe = null;
        }
        
        if (this.avatarUpdateHandler) {
            window.removeEventListener('avatar-updated', this.avatarUpdateHandler);
            this.avatarUpdateHandler = null;
        }
    }
}

const profileTab = new ProfileTab();
export default profileTab;

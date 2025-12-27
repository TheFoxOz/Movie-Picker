/**
 * Storage Service - Firebase Storage for Avatar Uploads
 * 📸 Upload, compress, and manage user avatars
 * 🗜️ Auto-resize to 500x500, compress to <500KB
 * 🔄 Real-time URL updates in Firestore
 */

import { storage, db, auth } from './firebase-config.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

class StorageService {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB max input
        this.targetSize = 500; // 500x500 pixels
        this.quality = 0.8; // 80% JPEG quality
    }

    /**
     * Upload avatar image
     * @param {File} file - Image file from input
     * @param {string} userId - User ID
     * @returns {Promise<string>} Download URL
     */
    async uploadAvatar(file, userId) {
        try {
            console.log('[Storage] Starting avatar upload:', file.name);

            // Validate file
            if (!file) {
                throw new Error('No file provided');
            }

            if (!file.type.startsWith('image/')) {
                throw new Error('File must be an image');
            }

            if (file.size > this.maxFileSize) {
                throw new Error('File too large (max 5MB)');
            }

            // Process image (resize + compress)
            const processedBlob = await this.processImage(file);
            console.log('[Storage] Image processed:', processedBlob.size, 'bytes');

            // Delete old avatar if exists
            await this.deleteAvatar(userId);

            // Upload to Firebase Storage
            const storagePath = `avatars/${userId}/profile.jpg`;
            const storageRef = ref(storage, storagePath);
            
            await uploadBytes(storageRef, processedBlob, {
                contentType: 'image/jpeg',
                customMetadata: {
                    uploadedAt: new Date().toISOString(),
                    originalName: file.name
                }
            });

            console.log('[Storage] Avatar uploaded successfully');

            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            console.log('[Storage] Download URL:', downloadURL);

            // Update Firestore user document
            await this.updateUserAvatar(userId, downloadURL);

            return downloadURL;

        } catch (error) {
            console.error('[Storage] Avatar upload failed:', error);
            throw error;
        }
    }

    /**
     * Process image: resize and compress
     * @param {File} file - Original image file
     * @returns {Promise<Blob>} Processed image blob
     */
    async processImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                // Calculate dimensions (square crop from center)
                const size = Math.min(img.width, img.height);
                const offsetX = (img.width - size) / 2;
                const offsetY = (img.height - size) / 2;

                // Set canvas size
                canvas.width = this.targetSize;
                canvas.height = this.targetSize;

                // Draw cropped and resized image
                ctx.drawImage(
                    img,
                    offsetX, offsetY, size, size,  // Source (crop)
                    0, 0, this.targetSize, this.targetSize  // Destination (resize)
                );

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            console.log('[Storage] Compressed:', blob.size, 'bytes');
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    'image/jpeg',
                    this.quality
                );
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Delete user's avatar from storage
     * @param {string} userId - User ID
     */
    async deleteAvatar(userId) {
        try {
            const storagePath = `avatars/${userId}/profile.jpg`;
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);
            console.log('[Storage] Old avatar deleted');
        } catch (error) {
            // Ignore errors (file might not exist)
            if (error.code !== 'storage/object-not-found') {
                console.warn('[Storage] Delete error:', error);
            }
        }
    }

    /**
     * Update user document with new avatar URL
     * @param {string} userId - User ID
     * @param {string} photoURL - Download URL
     */
    async updateUserAvatar(userId, photoURL) {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                photoURL: photoURL,
                photoUpdatedAt: new Date().toISOString()
            });
            console.log('[Storage] Firestore updated with new avatar URL');
        } catch (error) {
            console.error('[Storage] Failed to update Firestore:', error);
            throw error;
        }
    }

    /**
     * Get current user's avatar URL from Firestore
     * @param {string} userId - User ID
     * @returns {Promise<string|null>} Avatar URL or null
     */
    async getAvatarURL(userId) {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                return userDoc.data().photoURL || null;
            }
            
            return null;
        } catch (error) {
            console.error('[Storage] Failed to get avatar URL:', error);
            return null;
        }
    }

    /**
     * Generate preview URL from file
     * @param {File} file - Image file
     * @returns {string} Object URL for preview
     */
    createPreviewURL(file) {
        return URL.createObjectURL(file);
    }

    /**
     * Revoke preview URL to free memory
     * @param {string} url - Object URL
     */
    revokePreviewURL(url) {
        URL.revokeObjectURL(url);
    }
}

const storageService = new StorageService();
export { storageService, StorageService };

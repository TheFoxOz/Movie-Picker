/**
 * Avatar Upload Component
 * 📸 Camera/gallery picker with preview and cropping
 * 🖼️ Real-time preview before upload
 * ✂️ Square crop with drag positioning
 * 📱 Mobile-friendly file input
 */

import { storageService } from '../services/storage-service.js';
import { authService } from '../services/auth-service.js';

class AvatarUpload {
    constructor() {
        this.modal = null;
        this.currentFile = null;
        this.previewURL = null;
        this.uploading = false;
    }

    init() {
        this.createModal();
        this.attachEventListeners();
    }

    createModal() {
        if (document.getElementById('avatar-upload-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'avatar-upload-modal';
        modal.className = 'modal-overlay';
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
            <div class="avatar-modal-content" style="
                max-width: 500px;
                width: 100%;
                margin: 0 auto;
                padding: 2rem;
                border-radius: 1.5rem;
                background: linear-gradient(180deg, rgba(24, 24, 58, 0.98), rgba(15, 15, 38, 0.98));
                border: 2px solid rgba(166, 192, 221, 0.3);
                backdrop-filter: blur(20px);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slide-up 0.4s ease-out;
            ">
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                    <h2 style="
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #FDFAB0;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    ">
                        <span style="font-size: 1.75rem;">📸</span>
                        <span>Upload Avatar</span>
                    </h2>
                    <button id="close-avatar-modal" style="
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        background: rgba(166, 192, 221, 0.2);
                        border: 2px solid rgba(166, 192, 221, 0.3);
                        color: #FDFAB0;
                        font-size: 1.25rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                        font-weight: 700;
                        line-height: 1;
                    ">×</button>
                </div>

                <!-- File Input Buttons -->
                <div id="upload-buttons" style="
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                ">
                    <button id="take-photo-btn" class="upload-option-btn" style="
                        flex: 1;
                        padding: 1rem;
                        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                        border: none;
                        border-radius: 0.75rem;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.5rem;
                    ">
                        <span style="font-size: 2rem;">📷</span>
                        <span>Take Photo</span>
                    </button>
                    
                    <button id="choose-file-btn" class="upload-option-btn" style="
                        flex: 1;
                        padding: 1rem;
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        border: none;
                        border-radius: 0.75rem;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.5rem;
                    ">
                        <span style="font-size: 2rem;">🖼️</span>
                        <span>Choose File</span>
                    </button>
                </div>

                <!-- Hidden File Inputs -->
                <input type="file" id="camera-input" accept="image/*" capture="user" style="display: none;">
                <input type="file" id="file-input" accept="image/*" style="display: none;">

                <!-- Preview Section -->
                <div id="preview-section" style="display: none;">
                    <!-- Preview Image -->
                    <div style="
                        position: relative;
                        width: 300px;
                        height: 300px;
                        margin: 0 auto 1.5rem;
                        border-radius: 50%;
                        overflow: hidden;
                        border: 4px solid rgba(166, 192, 221, 0.3);
                        background: rgba(166, 192, 221, 0.1);
                    ">
                        <img id="preview-image" style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        ">
                    </div>

                    <!-- Info Text -->
                    <p style="
                        text-align: center;
                        color: #A6C0DD;
                        font-size: 0.875rem;
                        margin: 0 0 1.5rem 0;
                    ">
                        Image will be cropped to a circle
                    </p>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 1rem;">
                        <button id="change-photo-btn" style="
                            flex: 1;
                            padding: 0.875rem;
                            background: rgba(166, 192, 221, 0.2);
                            border: 2px solid rgba(166, 192, 221, 0.3);
                            border-radius: 0.75rem;
                            color: #A6C0DD;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">Change Photo</button>
                        
                        <button id="upload-btn" style="
                            flex: 1;
                            padding: 0.875rem;
                            background: linear-gradient(135deg, #10b981, #059669);
                            border: none;
                            border-radius: 0.75rem;
                            color: white;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.2s;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 0.5rem;
                        ">
                            <span id="upload-btn-icon">✓</span>
                            <span id="upload-btn-text">Upload</span>
                        </button>
                    </div>
                </div>

                <!-- Upload Progress -->
                <div id="upload-progress" style="display: none; text-align: center;">
                    <div style="
                        width: 60px;
                        height: 60px;
                        border: 4px solid rgba(166, 192, 221, 0.2);
                        border-top-color: #A6C0DD;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 2rem auto 1rem;
                    "></div>
                    <p style="color: #A6C0DD; font-size: 0.95rem;">Uploading...</p>
                </div>

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

                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    .upload-option-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
                    }

                    .upload-option-btn:active {
                        transform: translateY(0);
                    }

                    #close-avatar-modal:hover {
                        background: rgba(166, 192, 221, 0.3);
                        transform: scale(1.1);
                    }

                    #change-photo-btn:hover {
                        background: rgba(166, 192, 221, 0.3);
                    }

                    #upload-btn:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }

                    #upload-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                </style>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
    }

    attachEventListeners() {
        // Close button
        const closeBtn = document.getElementById('close-avatar-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Take photo button
        const takePhotoBtn = document.getElementById('take-photo-btn');
        const cameraInput = document.getElementById('camera-input');
        if (takePhotoBtn && cameraInput) {
            takePhotoBtn.addEventListener('click', () => cameraInput.click());
            cameraInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Choose file button
        const chooseFileBtn = document.getElementById('choose-file-btn');
        const fileInput = document.getElementById('file-input');
        if (chooseFileBtn && fileInput) {
            chooseFileBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Change photo button
        const changePhotoBtn = document.getElementById('change-photo-btn');
        if (changePhotoBtn) {
            changePhotoBtn.addEventListener('click', () => {
                this.resetToUploadButtons();
            });
        }

        // Upload button
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.handleUpload());
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

    open() {
        if (!this.modal) this.init();
        this.modal.style.display = 'flex';
        this.resetToUploadButtons();
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.cleanup();
    }

    resetToUploadButtons() {
        const uploadButtons = document.getElementById('upload-buttons');
        const previewSection = document.getElementById('preview-section');
        const uploadProgress = document.getElementById('upload-progress');

        if (uploadButtons) uploadButtons.style.display = 'flex';
        if (previewSection) previewSection.style.display = 'none';
        if (uploadProgress) uploadProgress.style.display = 'none';

        this.cleanup();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('[AvatarUpload] File selected:', file.name, file.size);

        // Validate
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', true);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image too large (max 5MB)', true);
            return;
        }

        this.currentFile = file;
        this.showPreview(file);
    }

    showPreview(file) {
        const uploadButtons = document.getElementById('upload-buttons');
        const previewSection = document.getElementById('preview-section');
        const previewImage = document.getElementById('preview-image');

        if (!previewImage) return;

        // Create preview URL
        if (this.previewURL) {
            URL.revokeObjectURL(this.previewURL);
        }
        this.previewURL = URL.createObjectURL(file);
        previewImage.src = this.previewURL;

        // Show preview section
        if (uploadButtons) uploadButtons.style.display = 'none';
        if (previewSection) previewSection.style.display = 'block';
    }

    async handleUpload() {
        if (!this.currentFile || this.uploading) return;

        const user = authService.getCurrentUser();
        if (!user) {
            this.showToast('Not authenticated', true);
            return;
        }

        this.uploading = true;

        // Show progress
        const previewSection = document.getElementById('preview-section');
        const uploadProgress = document.getElementById('upload-progress');
        const uploadBtn = document.getElementById('upload-btn');

        if (previewSection) previewSection.style.display = 'none';
        if (uploadProgress) uploadProgress.style.display = 'block';
        if (uploadBtn) uploadBtn.disabled = true;

        try {
            const downloadURL = await storageService.uploadAvatar(this.currentFile, user.uid);
            console.log('[AvatarUpload] Upload successful:', downloadURL);
            
            this.showToast('Avatar updated! ✨');
            
            // Wait a bit to show success
            setTimeout(() => {
                this.close();
                // Trigger page reload or event to update UI
                window.dispatchEvent(new CustomEvent('avatar-updated', { 
                    detail: { photoURL: downloadURL }
                }));
            }, 1000);

        } catch (error) {
            console.error('[AvatarUpload] Upload failed:', error);
            this.showToast(error.message || 'Upload failed', true);
            
            // Show preview again
            if (previewSection) previewSection.style.display = 'block';
            if (uploadProgress) uploadProgress.style.display = 'none';
            if (uploadBtn) uploadBtn.disabled = false;
        } finally {
            this.uploading = false;
        }
    }

    cleanup() {
        this.currentFile = null;
        if (this.previewURL) {
            URL.revokeObjectURL(this.previewURL);
            this.previewURL = null;
        }

        // Clear file inputs
        const cameraInput = document.getElementById('camera-input');
        const fileInput = document.getElementById('file-input');
        if (cameraInput) cameraInput.value = '';
        if (fileInput) fileInput.value = '';
    }

    showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 6rem;
            left: 50%;
            transform: translateX(-50%);
            background: ${isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            font-weight: 600;
            z-index: 3000;
            animation: toast-in 0.3s ease-out;
            backdrop-filter: blur(10px);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toast-in 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

const avatarUpload = new AvatarUpload();
export { avatarUpload, AvatarUpload };

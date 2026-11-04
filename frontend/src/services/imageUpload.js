/**
 * ImageKit Upload Service via Cloudflare Worker
 *
 * Uploads images to ImageKit through a secure Cloudflare Worker proxy.
 * The Worker validates Firebase auth tokens and handles ImageKit private key authentication.
 *
 * @module imageUpload
 */

import { auth } from './firebase';

// Cloudflare Worker endpoint for image uploads
const WORKER_URL = 'https://hu-anti-drug-image-upload.abdulazizabdulmenan6695.workers.dev';

/**
 * Upload an image through the Cloudflare Worker to ImageKit
 *
 * @param {File} file - The image file to upload
 * @param {Object} metadata - Upload metadata
 * @param {string} metadata.purpose - Upload purpose: 'profile' or 'leadership'
 * @param {string} [metadata.memberId] - Member ID (required for both profile and leadership)
 * @param {string} [metadata.positionId] - Position ID (required for leadership uploads)
 * @param {Function} [onProgress] - Progress callback (percent: number) => void
 *
 * @returns {Promise<{url: string, fileId: string}>} ImageKit URL and file ID
 * @throws {Error} If upload fails
 *
 * @example
 * // Profile photo upload
 * const result = await uploadImage(file, {
 *   purpose: 'profile',
 *   memberId: currentUser.uid
 * });
 *
 * @example
 * // Leadership photo upload
 * const result = await uploadImage(file, {
 *   purpose: 'leadership',
 *   memberId: '12345',
 *   positionId: 'president'
 * }, (percent) => console.log(`${percent}% uploaded`));
 */
export async function uploadImage(file, metadata, onProgress = null) {
  // Validation
  if (!file) {
    throw new Error('No file provided');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image (JPG, PNG, WebP, etc.)');
  }

  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    throw new Error(`Image must be smaller than ${maxSize / (1024 * 1024)} MB`);
  }

  if (!metadata.purpose || !['profile', 'leadership'].includes(metadata.purpose)) {
    throw new Error('Invalid purpose. Must be "profile" or "leadership"');
  }

  if (!metadata.memberId) {
    throw new Error('memberId is required');
  }

  if (metadata.purpose === 'leadership' && !metadata.positionId) {
    throw new Error('positionId is required for leadership uploads');
  }

  // Get Firebase auth token
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to upload images');
  }

  let idToken;
  try {
    idToken = await user.getIdToken();
  } catch (err) {
    console.error('Failed to get ID token:', err);
    throw new Error('Authentication failed. Please sign in again.');
  }

  // Prepare form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', metadata.purpose);
  formData.append('memberId', metadata.memberId);
  if (metadata.positionId) {
    formData.append('positionId', metadata.positionId);
  }

  // Upload to Cloudflare Worker
  try {
    // Note: FormData with XMLHttpRequest for progress tracking
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });
      }

      // Success handler
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.url && response.fileId) {
              resolve({
                url: response.url,
                fileId: response.fileId,
              });
            } else {
              reject(new Error(response.error || 'Upload failed: Invalid response'));
            }
          } catch (err) {
            reject(new Error('Upload failed: Invalid JSON response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // Error handler
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      // Timeout handler
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Configure and send request
      xhr.open('POST', WORKER_URL);
      xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
      xhr.timeout = 60000; // 60 second timeout
      xhr.send(formData);
    });
  } catch (err) {
    console.error('Upload error:', err);
    throw err;
  }
}

/**
 * Validate Worker URL is configured
 *
 * @returns {boolean} True if Worker URL is configured
 */
export function isWorkerConfigured() {
  return !WORKER_URL.includes('<your-workers-subdomain>');
}

/**
 * Get the configured Worker URL
 *
 * @returns {string} Worker URL
 */
export function getWorkerUrl() {
  return WORKER_URL;
}

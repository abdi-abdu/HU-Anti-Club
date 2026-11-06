/**
 * PDF Generation Utility for Membership Cards
 * 
 * Generates browser-side PDFs from the MembershipCard component.
 * Uses html2canvas to capture the card as an image, then jsPDF to create a PDF.
 * 
 * Card Dimensions: 105mm × 74mm (A7 landscape format)
 * 
 * This approach ensures:
 * - No server-side processing required
 * - Works with Firebase Spark plan (no Cloud Functions needed)
 * - Preserves exact card layout and styling
 * - Handles cross-origin images (profile photos from ImageKit)
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Wait for fonts and images to load before capturing
 * This ensures text renders consistently in PDF
 */
async function waitForFontsAndImages(cardElement) {
  // Wait for document fonts to load
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  
  // Wait for all images within the card to load
  const images = cardElement.querySelectorAll('img');
  const imagePromises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // Resolve even on error to not block
      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });
  });
  
  await Promise.all(imagePromises);
  
  // Additional delay to ensure layout fully stabilizes
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Generate and download a membership card PDF
 * 
 * @param {Object} userProfile - The member's profile data
 * @returns {Promise<boolean>} - Success status
 * @throws {Error} - If PDF generation fails
 */
export async function generateMembershipCardPDF(userProfile) {
  if (!userProfile) {
    throw new Error('User profile is required to generate membership card');
  }

  try {
    // Get the card element from the DOM
    const cardElement = document.getElementById('membership-card-preview');
    
    if (!cardElement) {
      throw new Error('Membership card element not found. Please ensure the card is rendered.');
    }

    // Wait for fonts and images to fully load
    await waitForFontsAndImages(cardElement);
    
    // Get the exact dimensions of the card element in pixels
    const rect = cardElement.getBoundingClientRect();
    
    // Convert the card HTML to a high-quality canvas
    // Removed windowWidth/windowHeight to prevent viewport simulation issues
    const canvas = await html2canvas(cardElement, {
      scale: 3, // Higher scale = better quality (3x resolution)
      useCORS: true, // Enable cross-origin images (for ImageKit photos)
      backgroundColor: '#ffffff',
      logging: false, // Suppress console logs
      imageTimeout: 15000, // 15 second timeout for image loading
      removeContainer: false,
      width: rect.width,
      height: rect.height,
    });

    // A7 card dimensions in mm: 105mm × 74mm (landscape)
    const cardWidthMM = 105;
    const cardHeightMM = 74;

    // Create PDF with landscape orientation
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [cardWidthMM, cardHeightMM],
      compress: true,
    });

    // Convert canvas to image data with maximum quality
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Add the image to fill the entire PDF page
    // Use the exact PDF dimensions to maintain aspect ratio
    pdf.addImage(imgData, 'PNG', 0, 0, cardWidthMM, cardHeightMM, '', 'FAST');

    // Generate filename using university ID (sanitized)
    const sanitizedId = (userProfile.universityId || 'unknown')
      .replace(/[^a-zA-Z0-9-]/g, '_'); // Replace invalid filename chars
    const filename = `HU-Anti-Drug-Club-Membership-Card-${sanitizedId}.pdf`;

    // Trigger download
    pdf.save(filename);

    return true;
  } catch (error) {
    console.error('PDF generation failed:', error);
    
    // Provide user-friendly error messages
    if (error.message && error.message.includes('not found')) {
      throw new Error('Unable to generate PDF. Please refresh the page and try again.');
    } else if (error.message && error.message.includes('timeout')) {
      throw new Error('Image loading timed out. Please check your internet connection and try again.');
    } else {
      throw new Error('Failed to generate membership card PDF. Please try again or contact support.');
    }
  }
}

/**
 * Preload images to avoid CORS issues during PDF generation
 * 
 * @param {string} imageUrl - URL of the image to preload
 * @returns {Promise<void>}
 */
export function preloadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve();
    img.onerror = () => {
      console.warn('Failed to preload image:', imageUrl);
      resolve(); // Resolve anyway to not block the process
    };
    
    img.src = imageUrl;
    
    // Timeout after 10 seconds
    setTimeout(() => resolve(), 10000);
  });
}

/**
 * Validate if the user is eligible to generate a membership card
 * 
 * @param {Object} userProfile - The user's profile data
 * @returns {Object} - { eligible: boolean, reason: string }
 */
export function checkMembershipCardEligibility(userProfile) {
  if (!userProfile) {
    return { eligible: false, reason: 'User profile not found' };
  }

  // Must be a student (not admin)
  if (userProfile.role !== 'student') {
    return { eligible: false, reason: 'Membership cards are only available for student members' };
  }

  // Must have active status
  if (userProfile.status !== 'active') {
    const statusMessages = {
      pending: 'Your membership application is pending approval',
      rejected: 'Your membership application was not approved',
      deactivated: 'Your membership has been deactivated',
    };
    return { 
      eligible: false, 
      reason: statusMessages[userProfile.status] || 'Your account is not active' 
    };
  }

  // Check required fields
  const requiredFields = ['fullName', 'universityId', 'college', 'department', 'yearOfStudy'];
  const missingFields = requiredFields.filter(field => !userProfile[field]);
  
  if (missingFields.length > 0) {
    return { 
      eligible: false, 
      reason: `Missing required information: ${missingFields.join(', ')}. Please update your profile.` 
    };
  }

  return { eligible: true, reason: '' };
}

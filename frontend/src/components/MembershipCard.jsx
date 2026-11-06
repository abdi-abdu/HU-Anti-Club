import React from 'react';
import { User } from 'lucide-react';

/**
 * MembershipCard Component
 * 
 * Displays a professional university-style membership card for HU Anti-Drug Club members.
 * This component is designed to be rendered as HTML and converted to PDF.
 * 
 * Dimensions: 105mm × 74mm (A7 landscape orientation)
 * Design matches the reference membership card layout.
 */
const MembershipCard = ({ userProfile }) => {
  if (!userProfile) return null;

  // Helper function to truncate text gracefully
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Adjust font size based on text length
  const getDynamicFontSize = (text, baseSize, threshold1, threshold2) => {
    if (!text) return `${baseSize}px`;
    if (text.length > threshold2) return `${baseSize - 2}px`;
    if (text.length > threshold1) return `${baseSize - 1}px`;
    return `${baseSize}px`;
  };

  return (
    <div
      id="membership-card-preview"
      style={{
        width: '105mm',
        height: '74mm',
        backgroundColor: '#ffffff',
        border: 'none',
        borderRadius: '10px',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Subtle faded campus background - very light for readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f8fafc',
        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(248,250,252,0.85))',
        zIndex: 0,
      }} />

      {/* Green curved decorative band - top flowing curve */}
      <svg style={{
        position: 'absolute',
        top: '22mm',
        left: 0,
        width: '100%',
        height: '15mm',
        zIndex: 1,
        opacity: 0.9,
      }} viewBox="0 0 400 60" preserveAspectRatio="none">
        <path d="M0,30 Q100,10 200,30 T400,30 L400,60 L0,60 Z" fill="#059669" opacity="0.85"/>
      </svg>

      {/* White curved accent over green */}
      <svg style={{
        position: 'absolute',
        top: '25mm',
        left: 0,
        width: '100%',
        height: '12mm',
        zIndex: 2,
        opacity: 0.8,
      }} viewBox="0 0 400 50" preserveAspectRatio="none">
        <path d="M0,20 Q100,5 200,20 T400,20 L400,50 L0,50 Z" fill="#ffffff" opacity="0.7"/>
      </svg>

      {/* Green curved decorative band - bottom flowing curve */}
      <svg style={{
        position: 'absolute',
        bottom: '13mm',
        left: 0,
        width: '100%',
        height: '12mm',
        zIndex: 1,
        opacity: 0.9,
      }} viewBox="0 0 400 50" preserveAspectRatio="none">
        <path d="M0,0 L400,0 L400,30 Q300,45 200,30 T0,30 Z" fill="#059669" opacity="0.85"/>
      </svg>

      {/* Dark blue curved accent - bottom */}
      <svg style={{
        position: 'absolute',
        bottom: '13mm',
        right: 0,
        width: '50%',
        height: '10mm',
        zIndex: 2,
        opacity: 0.8,
      }} viewBox="0 0 200 40" preserveAspectRatio="none">
        <path d="M0,0 L200,0 L200,25 Q150,35 100,25 T0,25 Z" fill="#1e3a8a" opacity="0.7"/>
      </svg>

      {/* White curved accent - bottom corner */}
      <svg style={{
        position: 'absolute',
        bottom: '15mm',
        left: 0,
        width: '45%',
        height: '8mm',
        zIndex: 2,
        opacity: 0.7,
      }} viewBox="0 0 180 35" preserveAspectRatio="none">
        <path d="M0,0 L180,0 L180,20 Q135,30 90,20 T0,20 Z" fill="#ffffff" opacity="0.6"/>
      </svg>

      {/* Main content container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Dark navy blue header section */}
        <div style={{
          backgroundColor: '#0f2557',
          padding: '3mm 6mm 2.5mm 6mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          flexShrink: 0,
        }}>
          {/* Left Logo - Haramaya University */}
          <div style={{
            width: '14mm',
            height: '14mm',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            padding: '1.5mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '2px solid #ffffff',
          }}>
            <img
              src="/images/hu-logo.jpeg"
              alt="Haramaya University"
              crossOrigin="anonymous"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Center Text */}
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: '0 3mm',
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '0.8px',
              lineHeight: '1.2',
              marginBottom: '0.5mm',
              textTransform: 'uppercase',
            }}>
              HARAMAYA UNIVERSITY
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#fbbf24',
              letterSpacing: '0.8px',
              lineHeight: '1.2',
              textTransform: 'uppercase',
            }}>
              ANTI-DRUG CLUB
            </div>
            <div style={{
              fontSize: '7px',
              fontStyle: 'italic',
              color: '#ffffff',
              letterSpacing: '0.2px',
              lineHeight: '1.1',
              marginTop: '0.5mm',
              opacity: 0.95,
            }}>
              Healthy Students, Drug-Free University
            </div>
          </div>

          {/* Right Logo - Anti-Drug Club */}
          <div style={{
            width: '14mm',
            height: '14mm',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            padding: '1.5mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '2px solid #ffffff',
          }}>
            <img
              src="/images/logo.png"
              alt="Anti-Drug Club"
              crossOrigin="anonymous"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Body section - two column: information LEFT, photo RIGHT */}
        <div style={{
          flex: 1,
          padding: '3mm 7mm',
          display: 'flex',
          flexDirection: 'row',
          gap: '3mm',
          backgroundColor: 'rgba(255,255,255,0.85)',
          position: 'relative',
          boxSizing: 'border-box',
          overflow: 'hidden',
          alignItems: 'center',
        }}>
          {/* LEFT SIDE - Student Information */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '2.2mm',
            justifyContent: 'center',
          }}>
            {/* Name Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              width: '100%',
            }}>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                width: '16mm',
                flexShrink: 0,
                paddingTop: '0.3mm',
              }}>Name</div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                marginRight: '2mm',
                paddingTop: '0.3mm',
              }}>:</div>
              <div style={{
                fontSize: getDynamicFontSize(userProfile.fullName, 8.5, 25, 30),
                fontWeight: 'bold',
                color: '#000000',
                lineHeight: '1.3',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                flex: 1,
                minWidth: 0,
              }}>
                {userProfile.fullName}
              </div>
            </div>

            {/* College Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              width: '100%',
            }}>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                width: '16mm',
                flexShrink: 0,
                paddingTop: '0.3mm',
              }}>College</div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                marginRight: '2mm',
                paddingTop: '0.3mm',
              }}>:</div>
              <div style={{
                fontSize: getDynamicFontSize(userProfile.college, 7.5, 30, 40),
                fontWeight: '600',
                color: '#000000',
                lineHeight: '1.3',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                flex: 1,
                minWidth: 0,
              }}>
                {truncateText(userProfile.college, 55)}
              </div>
            </div>

            {/* Department Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              width: '100%',
            }}>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                width: '16mm',
                flexShrink: 0,
                paddingTop: '0.3mm',
              }}>Department</div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                marginRight: '2mm',
                paddingTop: '0.3mm',
              }}>:</div>
              <div style={{
                fontSize: getDynamicFontSize(userProfile.department, 7.5, 30, 40),
                fontWeight: '600',
                color: '#000000',
                lineHeight: '1.3',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                flex: 1,
                minWidth: 0,
              }}>
                {truncateText(userProfile.department, 55)}
              </div>
            </div>

            {/* Year Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'baseline',
              width: '100%',
            }}>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                width: '16mm',
                flexShrink: 0,
              }}>Year</div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                marginRight: '2mm',
              }}>:</div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: '600',
                color: '#000000',
                lineHeight: '1.3',
              }}>
                {userProfile.yearOfStudy}
              </div>
            </div>

            {/* Student ID Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'baseline',
              width: '100%',
            }}>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                width: '16mm',
                flexShrink: 0,
              }}>Student ID</div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                marginRight: '2mm',
              }}>:</div>
              <div style={{
                fontSize: '8.5px',
                fontWeight: 'bold',
                color: '#000000',
                letterSpacing: '0.2px',
                lineHeight: '1.3',
              }}>
                {userProfile.universityId}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Student Photo */}
          <div style={{
            width: '24mm',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '24mm',
              height: '30mm',
              backgroundColor: '#e8f0fe',
              border: '2.5px solid #1e3a8a',
              borderRadius: '5px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              {userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.fullName}
                  crossOrigin="anonymous"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (parent) {
                      const icon = document.createElement('div');
                      icon.innerHTML = '👤';
                      icon.style.fontSize = '36px';
                      icon.style.color = '#5b7cb8';
                      parent.appendChild(icon);
                    }
                  }}
                />
              ) : (
                <User size={42} color="#5b7cb8" strokeWidth={1.5} />
              )}
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '2mm 7mm 2.5mm 7mm',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}>
          {/* Left - President's Signature Area (NO BARCODE) */}
          <div style={{
            width: '28mm',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              height: '6mm',
              borderBottom: '1.5px solid #64748b',
              marginBottom: '0.5mm',
            }}></div>
            <div style={{
              fontSize: '6px',
              fontWeight: 'bold',
              color: '#1e3a8a',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.1px',
              lineHeight: '1.1',
            }}>
              Club President&apos;s<br/>Signature
            </div>
          </div>

          {/* Center - Membership Label */}
          <div style={{
            backgroundColor: '#0f2557',
            padding: '1.5mm 7mm',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '9px',
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}>
              CLUB MEMBERSHIP
            </div>
          </div>

          {/* Right - Slogan and Stamp Area */}
          <div style={{
            width: '28mm',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{
              fontSize: '6.5px',
              fontStyle: 'italic',
              color: '#059669',
              textAlign: 'center',
              lineHeight: '1.1',
              fontWeight: '600',
              marginBottom: '0.5mm',
            }}>
              Together for a<br/>Drug-Free Tomorrow
            </div>
            <div style={{
              width: '12mm',
              height: '12mm',
              border: '1.5px dashed #64748b',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '0.3mm',
            }}>
              <div style={{
                fontSize: '5.5px',
                color: '#64748b',
                fontWeight: 'bold',
                textAlign: 'center',
                lineHeight: '1.05',
                textTransform: 'uppercase',
              }}>
                Club<br/>Stamp
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipCard;

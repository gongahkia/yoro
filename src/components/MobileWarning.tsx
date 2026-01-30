import { useState, useEffect } from 'react';
import './styles/MobileWarning.css';

const isMobileDevice = (): boolean => {
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;

    // Also check screen width as a fallback
    const isSmallScreen = window.innerWidth <= 768;

    // Check for touch capability combined with small screen
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return mobileRegex.test(userAgent.toLowerCase()) || (isSmallScreen && isTouchDevice);
};

export const MobileWarning: React.FC = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setIsMobile(isMobileDevice());

        // Also listen for resize events
        const handleResize = () => {
            setIsMobile(isMobileDevice());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isMobile || dismissed) return null;

    return (
        <div className="mobile-warning-overlay">
            <div className="mobile-warning-content">
                <div className="mobile-warning-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12" y2="18"/>
                        <path d="M2 12h3M19 12h3" strokeDasharray="2 2"/>
                    </svg>
                </div>

                <h1 className="mobile-warning-title">Desktop Recommended</h1>

                <p className="mobile-warning-message">
                    <strong>Yoro</strong> is a desktop-first text editor designed for
                    focused writing with keyboard shortcuts, vim/emacs modes, and
                    advanced editing features.
                </p>

                <p className="mobile-warning-submessage">
                    For the best experience, please access Yoro from a desktop or laptop computer
                    with a physical keyboard.
                </p>

                <div className="mobile-warning-features">
                    <div className="mobile-warning-feature">
                        <span className="feature-icon">⌨️</span>
                        <span>Keyboard-centric editing</span>
                    </div>
                    <div className="mobile-warning-feature">
                        <span className="feature-icon">📐</span>
                        <span>Wide-screen layout</span>
                    </div>
                    <div className="mobile-warning-feature">
                        <span className="feature-icon">🎯</span>
                        <span>Precise cursor control</span>
                    </div>
                </div>

                <button
                    className="mobile-warning-dismiss"
                    onClick={() => setDismissed(true)}
                >
                    Continue Anyway
                </button>

                <p className="mobile-warning-note">
                    Some features may not work as expected on mobile devices.
                </p>
            </div>
        </div>
    );
};

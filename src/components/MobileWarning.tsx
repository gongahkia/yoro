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

                <h1 className="mobile-warning-title">Eh, use desktop lah</h1>

                <p className="mobile-warning-message">
                    <strong>Yoro</strong> best on desktop one, got vim/emacs mode and all those power features.
                </p>

                <p className="mobile-warning-submessage">
                    For best experience, use desktop or laptop with keyboard lah.
                </p>

                <div className="mobile-warning-features">
                    <div className="mobile-warning-feature">
                        <span className="feature-icon">⌨️</span>
                        <span>Keyboard shiok to use</span>
                    </div>
                    <div className="mobile-warning-feature">
                        <span className="feature-icon">📐</span>
                        <span>Wide screen layout</span>
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
                    Nvm, go in lah
                </button>

                <p className="mobile-warning-note">
                    Mobile some things cannot work properly one lah.
                </p>
            </div>
        </div>
    );
};

import React, { useEffect } from 'react';
import './styles/ImageLightbox.css';

interface ImageLightboxProps {
    src: string | null;
    alt?: string;
    onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (src) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [src, onClose]);

    if (!src) return null;

    return (
        <div className="modal-overlay lightbox-overlay" onClick={onClose} aria-label="Image lightbox" role="dialog">
            <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                <img src={src} alt={alt || 'Full size'} />
                <button className="lightbox-close" onClick={onClose}>&times;</button>
            </div>
        </div>
    );
};

import React, { useEffect, useRef } from 'react';
import { useSinglish } from '../contexts/SinglishContext';
import './styles/ConfirmationModal.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    const sl = useSinglish();
    const resolvedTitle = title ?? (sl ? 'Confirm anot?' : 'Confirm');
    const dialogRef = useRef<HTMLDivElement>(null);

    const readyRef = useRef(false);

    useEffect(() => {
        // Reset ready state when opening
        if (isOpen) {
            readyRef.current = false;
            const timer = setTimeout(() => {
                readyRef.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                onCancel();
            } else if (e.key === 'Enter') {
                // Prevent auto-triggering if the modal just opened
                if (!readyRef.current) return;
                onConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel, onConfirm]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
            <div className="modal-container" onClick={(e) => e.stopPropagation()} ref={dialogRef}>
                <h3 className="modal-title" id="confirmation-modal-title">{resolvedTitle}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button className="modal-btn cancel" onClick={onCancel}>{sl ? 'Dun want' : 'Cancel'}</button>
                    <button className="modal-btn confirm" onClick={onConfirm}>{sl ? 'Delete lah' : 'Delete'}</button>
                </div>
            </div>
        </div>
    );
};

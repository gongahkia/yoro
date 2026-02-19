import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './styles/QuickCaptureModal.css';

interface QuickCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (text: string) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setText('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const handleSubmit = () => {
        if (text.trim()) {
            onCapture(text);
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="quick-capture-overlay" onClick={onClose}>
            <div className="quick-capture-modal" onClick={e => e.stopPropagation()}>
                <div className="quick-capture-header">
                    <h3>Quick Capture</h3>
                    <span className="quick-capture-hint">Cmd+Enter to save</span>
                </div>
                <textarea
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, 100_000))}
                    onKeyDown={handleKeyDown}
                    placeholder="Capture a thought..."
                    maxLength={100_000}
                />
                <div className="quick-capture-footer">
                    <button onClick={onClose}>Cancel</button>
                    <button className="primary" onClick={handleSubmit}>Capture</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

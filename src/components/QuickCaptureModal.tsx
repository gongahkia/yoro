import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSinglish } from '../contexts/SinglishContext';
import './styles/QuickCaptureModal.css';

interface QuickCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (text: string) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
    const sl = useSinglish();
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
                    <span className="quick-capture-hint">{sl ? 'Cmd+Enter to save lah' : 'Cmd+Enter to save'}</span>
                </div>
                <textarea
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, 100_000))}
                    onKeyDown={handleKeyDown}
                    placeholder={sl ? 'Type here lah...' : 'Capture a thought...'}
                    maxLength={100_000}
                    aria-label="Quick capture note content"
                />
                <div className="quick-capture-footer">
                    <button onClick={onClose}>{sl ? 'Nvm' : 'Cancel'}</button>
                    <button className="primary" onClick={handleSubmit}>{sl ? 'Save lah' : 'Capture'}</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

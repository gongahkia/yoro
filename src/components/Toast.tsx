import { useState, useEffect, useCallback } from 'react';
import './styles/Toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastEvent {
    message: string;
    type?: ToastType;
    duration?: number;
}

declare global {
    interface WindowEventMap {
        'yoro-toast': CustomEvent<ToastEvent>;
    }
}

// Helper function to show toast from anywhere
export const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    window.dispatchEvent(new CustomEvent('yoro-toast', {
        detail: { message, type, duration }
    }));
};

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, [removeToast]);

    useEffect(() => {
        const handleToast = (e: CustomEvent<ToastEvent>) => {
            const { message, type = 'info', duration = 3000 } = e.detail;
            addToast(message, type, duration);
        };

        window.addEventListener('yoro-toast', handleToast);
        return () => window.removeEventListener('yoro-toast', handleToast);
    }, [addToast]);

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`toast toast-${toast.type}`}
                    onClick={() => removeToast(toast.id)}
                >
                    <span className="toast-icon">
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '✕'}
                        {toast.type === 'info' && 'i'}
                        {toast.type === 'warning' && '!'}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                </div>
            ))}
        </div>
    );
};

import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active: boolean) {
    const ref = useRef<HTMLElement | null>(null);
    useEffect(() => {
        if (!active || !ref.current) return;
        const el = ref.current;
        const getFocusable = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(e => !e.closest('[hidden]'));
        const first = getFocusable()[0];
        first?.focus();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const focusable = getFocusable();
            if (!focusable.length) { e.preventDefault(); return; }
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === focusable[0]) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); focusable[0].focus(); }
            }
        };
        el.addEventListener('keydown', onKeyDown);
        return () => el.removeEventListener('keydown', onKeyDown);
    }, [active]);
    return ref;
}

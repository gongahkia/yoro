type EventName =
    | 'create_note'
    | 'delete_note'
    | 'duplicate_note'
    | 'view_note'
    | 'export_note'
    | 'move_to_bin'
    | 'restore_note'
    | 'delete_note_permanent';

export const analytics = {
    track: (event: EventName, properties?: Record<string, any>) => {
        // Privacy-focused: No PII, just feature usage
        if (import.meta.env.DEV) {
            console.log(`[Analytics] ${event}`, properties);
        }
        // TODO: Connect to privacy-friendly analytics (e.g. Plausible, Umami)
    }
};

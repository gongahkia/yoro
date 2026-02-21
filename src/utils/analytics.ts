type EventName =
    | 'create_note'
    | 'delete_note'
    | 'duplicate_note'
    | 'view_note'
    | 'export_note'
    | 'quick_capture'
    | 'words_written';

interface DailyRecord {
    date: string; // ISO date 'YYYY-MM-DD'
    counts: Partial<Record<EventName, number>>;
}

interface AnalyticsStore {
    version: 1;
    days: DailyRecord[];
}

const STORAGE_KEY = 'yoro_analytics';
const MAX_DAYS = 365;

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function load(): AnalyticsStore {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { version: 1, days: [] };
        const parsed = JSON.parse(raw) as AnalyticsStore;
        if (parsed.version !== 1 || !Array.isArray(parsed.days)) {
            return { version: 1, days: [] };
        }
        return parsed;
    } catch {
        return { version: 1, days: [] };
    }
}

function save(store: AnalyticsStore): void {
    try {
        // Trim to MAX_DAYS to prevent unbounded growth
        const trimmed: AnalyticsStore = {
            ...store,
            days: store.days.slice(-MAX_DAYS),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
        // localStorage full — silently ignore
    }
}

function increment(event: EventName, amount = 1): void {
    const store = load();
    const date = today();
    const existing = store.days.find(d => d.date === date);
    if (existing) {
        existing.counts[event] = (existing.counts[event] ?? 0) + amount;
    } else {
        store.days.push({ date, counts: { [event]: amount } });
    }
    save(store);
}

export interface DailySummary {
    date: string;
    notesCreated: number;
    notesDeleted: number;
    notesViewed: number;
    wordsWritten: number;
}

export const analytics = {
    track: (event: EventName, properties?: Record<string, unknown>) => {
        // Privacy-focused: no PII, purely local
        if (import.meta.env.DEV) {
            console.log(`[Analytics] ${event}`, properties);
        }
        const amount = event === 'words_written' && typeof properties?.count === 'number'
            ? properties.count
            : 1;
        increment(event, amount);
    },

    /** Track words written — pass the delta word count */
    trackWords: (delta: number): void => {
        if (delta > 0) increment('words_written', delta);
    },

    /** Returns the last N days of aggregated stats */
    getRecentDays: (n = 30): DailySummary[] => {
        const store = load();
        const recent = store.days.slice(-n);
        return recent.map(d => ({
            date: d.date,
            notesCreated: d.counts.create_note ?? 0,
            notesDeleted: d.counts.delete_note ?? 0,
            notesViewed: d.counts.view_note ?? 0,
            wordsWritten: d.counts.words_written ?? 0,
        }));
    },

    /** Total notes created across all recorded days */
    totalNotesCreated: (): number => {
        const store = load();
        return store.days.reduce((sum, d) => sum + (d.counts.create_note ?? 0), 0);
    },

    /** Total words written across all recorded days */
    totalWordsWritten: (): number => {
        const store = load();
        return store.days.reduce((sum, d) => sum + (d.counts.words_written ?? 0), 0);
    },

    /** Clear all stored analytics (for privacy) */
    clear: (): void => {
        localStorage.removeItem(STORAGE_KEY);
    },
};

import type { AppState } from '../types';

const STORAGE_KEY = 'yoro_app_state';

// Default initial state
const initialState: AppState = {
    notes: [],
    preferences: {
        theme: 'light',
        sidebarVisible: false,
        vimMode: false,
        emacsMode: false,
        showLineNumbers: true,
        focusMode: false,
        lineWrapping: true,
        editorAlignment: 'center',
        fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
        fontSize: 16,
        recentCommandIds: [],
        homeViewMode: '3d-carousel',
    },
};

export class StorageError extends Error {
    code: 'QUOTA_EXCEEDED' | 'UNKNOWN';

    constructor(message: string, code: 'QUOTA_EXCEEDED' | 'UNKNOWN') {
        super(message);
        this.code = code;
        this.name = 'StorageError';
    }
}

export const storage = {
    get: (): AppState => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return initialState;
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load data from storage:', error);
            return initialState;
        }
    },

    set: (data: AppState): void => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error: unknown) {
            if (
                error instanceof DOMException &&
                (error.name === 'QuotaExceededError' ||
                    error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            ) {
                throw new StorageError('Storage quota exceeded', 'QUOTA_EXCEEDED');
            }
            throw new StorageError('Failed to save data', 'UNKNOWN');
        }
    },

    clear: (): void => {
        localStorage.removeItem(STORAGE_KEY);
    },
};

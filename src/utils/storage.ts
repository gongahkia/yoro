import LZString from 'lz-string';
import type { AppState } from '../types';

const STORAGE_KEY = 'yoro_app_state';
const SCHEMA_VERSION = 1;

interface VersionedData {
    version: number;
    state: AppState;
}

// Default initial state
const initialState: AppState = {
    notes: [],
    preferences: {
        theme: 'light',
        vimMode: false,
        emacsMode: false,
        showLineNumbers: true,
        focusMode: false,
        focusModeBlur: true,
        lineWrapping: true,
        editorAlignment: 'center',
        fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
        fontSize: 16,
        recentCommandIds: [],
        homeViewMode: '3d-carousel',
        sortOrder: 'updated',
        showDocumentStats: true,
        cursorAnimations: 'subtle',
        singlish: false,
    },
};

function migrate(data: unknown): AppState {
    // Handle unversioned legacy data (pre-versioning)
    if (data && typeof data === 'object' && !('version' in data) && 'notes' in data) {
        return data as AppState;
    }

    const versioned = data as VersionedData;

    // Future migrations go here:
    // if (versioned.version < 2) { ... migrate to v2 ... }

    if (versioned.version <= SCHEMA_VERSION) {
        return versioned.state;
    }

    // Unknown future version — return as-is, best effort
    return versioned.state;
}

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
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return initialState;
            // support both compressed and legacy uncompressed data
            let jsonStr: string;
            try {
                const decompressed = LZString.decompress(raw);
                jsonStr = decompressed && decompressed.length > 0 ? decompressed : raw;
            } catch {
                jsonStr = raw;
            }
            const parsed = JSON.parse(jsonStr);
            return migrate(parsed);
        } catch (error) {
            console.error('Failed to load data from storage:', error);
            return initialState;
        }
    },

    set: (data: AppState): void => {
        try {
            const versioned: VersionedData = { version: SCHEMA_VERSION, state: data };
            const compressed = LZString.compress(JSON.stringify(versioned));
            localStorage.setItem(STORAGE_KEY, compressed);
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

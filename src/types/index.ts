export type NoteId = string;

export interface Note {
    id: NoteId;
    title: string;
    content: string;
    format: 'markdown' | 'canvas';
    tags: string[];
    createdAt: number;
    updatedAt: number;
    isFavorite: boolean;
}

export type Theme = 'light' | 'dark' | 'sepia' | 'dracula';

export interface UserPreferences {
    theme: Theme;
    sidebarVisible: boolean;
    vimMode: boolean;
    showLineNumbers: boolean;
}

export interface AppState {
    notes: Note[];
    preferences: UserPreferences;
}

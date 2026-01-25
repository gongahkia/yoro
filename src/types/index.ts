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
    viewMode?: 'editor' | 'mindmap';
}

export type Theme = 'light' | 'dark' | 'sepia' | 'dracula' | 'nord' | 'solarized-light' | 'solarized-dark';

export interface UserPreferences {
    theme: Theme;
    sidebarVisible: boolean;
    vimMode: boolean;
    showLineNumbers: boolean;
    focusMode: boolean;
    lineWrapping: boolean;
    editorAlignment: 'left' | 'center' | 'right';
}

export interface AppState {
    notes: Note[];
    preferences: UserPreferences;
}

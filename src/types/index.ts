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
    viewMode?: 'editor' | 'mindmap' | 'flowchart' | 'state' | 'sequence';
    deletedAt?: number;
}

export type Theme =
    | 'light' | 'dark'
    | 'sepia-light' | 'sepia-dark'
    | 'dracula-light' | 'dracula-dark'
    | 'nord-light' | 'nord-dark'
    | 'solarized-light' | 'solarized-dark'
    | 'gruvbox-light' | 'gruvbox-dark'
    | 'everforest-light' | 'everforest-dark'
    | 'catppuccin-light' | 'catppuccin-dark'
    | 'rose-pine-light' | 'rose-pine-dark'
    | 'tokyo-night-light' | 'tokyo-night-dark'
    | 'kanagawa-light' | 'kanagawa-dark';

export interface UserPreferences {
    theme: Theme;
    sidebarVisible: boolean;
    vimMode: boolean;
    showLineNumbers: boolean;
    focusMode: boolean;
    lineWrapping: boolean;
    editorAlignment: 'left' | 'center' | 'right';
    fontFamily: string;
    fontSize: number;
    recentCommandIds: string[];
}

export interface AppState {
    notes: Note[];
    preferences: UserPreferences;
}

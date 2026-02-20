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
    viewMode?: 'editor' | 'mindmap' | 'flowchart' | 'state';
    lastCursorPosition?: number;
    lastScrollPosition?: number;
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
    | 'kanagawa-light' | 'kanagawa-dark'
    | 'monokai-light' | 'monokai-dark'
    | 'ayu-light' | 'ayu-dark'
    | 'one-light' | 'one-dark'
    | 'zenburn-light' | 'zenburn-dark'
    | 'palenight-light' | 'palenight-dark'
    | 'material-light' | 'material-dark';

export interface UserPreferences {
    theme: Theme;
    vimMode: boolean;
    emacsMode: boolean;
    showLineNumbers: boolean;
    focusMode: boolean;
    focusModeBlur: boolean;
    lineWrapping: boolean;
    editorAlignment: 'left' | 'center' | 'right';
    fontFamily: string;
    fontSize: number;
    recentCommandIds: string[];
    homeViewMode: '3d-carousel' | '2d-semicircle';
    sortOrder: 'updated' | 'created' | 'alpha' | 'alpha-reverse';
    showDocumentStats: boolean;
    cursorAnimations: 'none' | 'subtle' | 'particles';
    singlish: boolean;
}

export interface AppState {
    notes: Note[];
    preferences: UserPreferences;
}

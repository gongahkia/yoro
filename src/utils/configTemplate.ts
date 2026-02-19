import type { UserPreferences } from '../types';

export function generateConfigTemplate(prefs: UserPreferences): string {
    return `# Yoro Configuration
# Edit these values to customize your experience.
# Changes are applied automatically when you save.

# ═══════════════════════════════════════════════════════════════
# APPEARANCE
# ═══════════════════════════════════════════════════════════════

# Theme options:
# light, dark, sepia-light, sepia-dark, dracula-light, dracula-dark,
# nord-light, nord-dark, solarized-light, solarized-dark,
# gruvbox-light, gruvbox-dark, everforest-light, everforest-dark,
# catppuccin-light, catppuccin-dark, rose-pine-light, rose-pine-dark,
# tokyo-night-light, tokyo-night-dark, kanagawa-light, kanagawa-dark,
# monokai-light, monokai-dark, ayu-light, ayu-dark,
# one-light, one-dark, zenburn-light, zenburn-dark,
# palenight-light, palenight-dark, material-light, material-dark
theme = "${prefs.theme}"

# Home view mode: "3d-carousel" or "2d-semicircle"
homeViewMode = "${prefs.homeViewMode}"

# Sort order: "updated", "created", "alpha", "alpha-reverse"
sortOrder = "${prefs.sortOrder}"

# ═══════════════════════════════════════════════════════════════
# EDITOR
# ═══════════════════════════════════════════════════════════════

# Keybinding modes (only one can be active)
vimMode = ${prefs.vimMode}
emacsMode = ${prefs.emacsMode}

# Focus mode dims non-active lines
focusMode = ${prefs.focusMode}
focusModeBlur = ${prefs.focusModeBlur}

# Line display options
showLineNumbers = ${prefs.showLineNumbers}
lineWrapping = ${prefs.lineWrapping}

# Editor alignment: "left", "center", or "right"
editorAlignment = "${prefs.editorAlignment}"

# Cursor animation: "none", "subtle", or "particles"
cursorAnimations = "${prefs.cursorAnimations}"

# ═══════════════════════════════════════════════════════════════
# TYPOGRAPHY
# ═══════════════════════════════════════════════════════════════

# Font family options:
# Sans:  "Inter, system-ui, -apple-system, sans-serif"
# Serif: "Merriweather, Georgia, Cambria, 'Times New Roman', serif"
# Mono:  "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace"
# Comic: "'Comic Sans MS', 'Comic Sans', cursive"
fontFamily = "${prefs.fontFamily}"

# Font size in pixels (10-32)
fontSize = ${prefs.fontSize}

# ═══════════════════════════════════════════════════════════════
# DISPLAY
# ═══════════════════════════════════════════════════════════════

# Show word count, character count, and reading time
showDocumentStats = ${prefs.showDocumentStats}`.trim();
}

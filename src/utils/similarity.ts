import { Note } from '../types';

export interface SearchResult {
    note: Note;
    score: number;
}

const tokenize = (text: string): Set<string> => {
    return new Set(
        text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3)
    );
};

export const findSimilarNotes = (targetNote: Note, allNotes: Note[]): SearchResult[] => {
    const targetTokens = tokenize(targetNote.title + ' ' + targetNote.content);
    if (targetTokens.size === 0) return [];

    const results: SearchResult[] = [];

    for (const note of allNotes) {
        if (note.id === targetNote.id) continue;
        if (note.deletedAt) continue;

        const noteTokens = tokenize(note.title + ' ' + note.content);
        if (noteTokens.size === 0) continue;

        // Jaccard Similarity
        let intersection = 0;
        targetTokens.forEach(token => {
            if (noteTokens.has(token)) intersection++;
        });

        const union = targetTokens.size + noteTokens.size - intersection;
        const score = union === 0 ? 0 : intersection / union;

        if (score > 0.1) { // Threshold
            results.push({ note, score });
        }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
};

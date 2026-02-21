import { useParams } from 'react-router-dom';
import type { Note } from '../types';
import { Editor } from './Editor';
import { MindMap } from './MindMap';
import { FlowchartBuilder } from './FlowchartBuilder';
import { StateDiagramBuilder } from './StateDiagramBuilder';
import { DrawingCanvas } from './DrawingCanvas';
import { ErrorBoundary } from './ErrorBoundary';

interface NoteEditorWrapperProps {
    notes: Note[];
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
    onNavigate: (id: string) => void;
    vimMode: boolean;
    emacsMode: boolean;
    focusMode: boolean;
    focusModeBlur: boolean;
    lineWrapping: boolean;
    showLineNumbers: boolean;
    editorAlignment: 'left' | 'center' | 'right';
    showDocumentStats: boolean;
    cursorAnimations: 'none' | 'subtle' | 'particles';
    findReplaceOpen: boolean;
    onCloseFindReplace: () => void;
}

export const NoteEditorWrapper: React.FC<NoteEditorWrapperProps> = ({
    notes, onUpdateNote, onNavigate, vimMode, emacsMode, focusMode, focusModeBlur,
    lineWrapping, showLineNumbers, editorAlignment, showDocumentStats, cursorAnimations,
    findReplaceOpen, onCloseFindReplace
}) => {
    const { id } = useParams<{ id: string }>();
    const note = notes.find(n => n.id === id);

    if (!note) return <div>Note not found</div>;

    if (note.viewMode === 'mindmap') {
        return (
            <ErrorBoundary>
                <MindMap
                    markdown={note.content}
                    title={note.title}
                    noteId={note.id}
                    onViewModeChange={(mode) => onUpdateNote(note.id, { viewMode: mode })}
                    onMarkdownChange={(newMarkdown) => onUpdateNote(note.id, { content: newMarkdown })}
                />
            </ErrorBoundary>
        );
    }

    if (note.viewMode === 'flowchart') {
        return (
            <ErrorBoundary>
                <FlowchartBuilder
                    note={note}
                    onUpdateNote={onUpdateNote}
                />
            </ErrorBoundary>
        );
    }

    if (note.viewMode === 'state') {
        return (
            <ErrorBoundary>
                <StateDiagramBuilder
                    note={note}
                    onUpdateNote={onUpdateNote}
                />
            </ErrorBoundary>
        );
    }

    if (note.viewMode === 'drawing') {
        return (
            <ErrorBoundary>
                <DrawingCanvas
                    note={note}
                    onUpdateNote={onUpdateNote}
                />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <Editor
                note={note}
                notes={notes}
                onChange={(content) => onUpdateNote(note.id, { content })}
                onTitleChange={(title) => onUpdateNote(note.id, { title })}
                onNavigate={onNavigate}
                onPositionChange={(cursorPos, scrollPos) => {
                    onUpdateNote(note.id, {
                        lastCursorPosition: cursorPos,
                        lastScrollPosition: scrollPos
                    });
                }}
                vimMode={vimMode}
                emacsMode={emacsMode}
                focusMode={focusMode}
                focusModeBlur={focusModeBlur}
                lineWrapping={lineWrapping}
                showLineNumbers={showLineNumbers}
                editorAlignment={editorAlignment}
                showDocumentStats={showDocumentStats}
                cursorAnimations={cursorAnimations}
                findReplaceOpen={findReplaceOpen}
                onCloseFindReplace={onCloseFindReplace}
            />
        </ErrorBoundary>
    );
};

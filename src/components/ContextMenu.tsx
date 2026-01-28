import React, { useEffect, useState, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import './styles/ContextMenu.css';

interface ContextMenuProps {
    view: EditorView | null;
}

interface MenuPosition {
    x: number;
    y: number;
}

interface MenuItem {
    label: string;
    action: () => void;
    separator?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ view }) => {
    const [position, setPosition] = useState<MenuPosition | null>(null);
    const [items, setItems] = useState<MenuItem[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!view) return;

        const handleContextMenu = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.cm-content')) return;
            
            e.preventDefault();
            const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
            if (!pos) return;

            const { from, to } = view.state.selection.main;
            const isSelection = from !== to;
            
            const tree = syntaxTree(view.state);
            const node = tree.resolve(pos, 1);
            
            const menuItems: MenuItem[] = [];

            // Selection Actions
            if (isSelection) {
                menuItems.push(
                    { label: 'Bold', action: () => dispatchCmd('bold') },
                    { label: 'Italic', action: () => dispatchCmd('italic') },
                    { label: 'Make Heading', action: () => dispatchCmd('h2') },
                    { separator: true, label: '', action: () => {} }
                );
            }

            // Link Actions
            const linkNode = node.type.name.includes('Link') || node.parent?.type.name.includes('Link');
            if (linkNode) {
                 // Try to extract URL if possible, or just generic actions
                 menuItems.push(
                     { label: 'Open Link', action: () => { /* extract and open */ } }, // Hard to extract without precise node match
                     { label: 'Edit Link', action: () => {} }, 
                     { label: 'Remove Link', action: () => {} },
                     { separator: true, label: '', action: () => {} }
                 );
            }

            // List Actions
            const listNode = node.type.name.includes('List');
            if (listNode) {
                 menuItems.push(
                     { label: 'Sort A-Z', action: () => {} }, // Complex to implement sort in place
                     { label: 'Convert to Numbered', action: () => dispatchCmd('list-ol') }
                 );
            }

            // Default
            menuItems.push(
                { label: 'Copy', action: () => { document.execCommand('copy'); } },
                { label: 'Paste', action: () => { navigator.clipboard.readText().then(t => view.dispatch(view.state.replaceSelection(t))); } }
            );

            setItems(menuItems);
            setPosition({ x: e.clientX, y: e.clientY });
        };

        const dispatchCmd = (cmd: string) => {
             window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: cmd } }));
             setPosition(null);
        };

        const handleClick = () => {
            if (position) setPosition(null);
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClick);
        };
    }, [view, position]);

    if (!position) return null;

    return (
        <div 
            className="context-menu" 
            style={{ top: position.y, left: position.x }}
            ref={menuRef}
        >
            {items.map((item, index) => (
                item.separator ? (
                    <div key={index} className="context-menu-separator" />
                ) : (
                    <div key={index} className="context-menu-item" onClick={item.action}>
                        {item.label}
                    </div>
                )
            ))}
        </div>
    );
};

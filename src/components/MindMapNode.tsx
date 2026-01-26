import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const MindMapNode = ({ data, id }: NodeProps) => {
    const noteText = data.note as string | undefined;
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.label as string);
    const [prevLabel, setPrevLabel] = useState(data.label);
    const inputRef = useRef<HTMLInputElement>(null);

    if (data.label !== prevLabel) {
        setEditValue(data.label as string);
        setPrevLabel(data.label);
    }

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editValue !== data.label) {
            if (typeof data.onLabelChange === 'function') {
                data.onLabelChange(id, editValue);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setEditValue(data.label as string);
            setIsEditing(false);
        }
    };

    return (
        <div 
            style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--bg-primary)',
                border: isEditing ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                minWidth: '150px',
                maxWidth: '300px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'left',
                fontFamily: 'var(--editor-font-family, sans-serif)',
                fontSize: 'var(--editor-font-size, 14px)',
                cursor: 'pointer'
            }}
            onDoubleClick={handleDoubleClick}
        >
            <Handle type="target" position={Position.Left} style={{ background: 'var(--primary)' }} />
            
            <div style={{ fontWeight: 'bold', marginBottom: noteText ? '4px' : '0' }}>
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            color: 'inherit',
                            font: 'inherit',
                            outline: 'none',
                            padding: 0,
                            margin: 0
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    data.label as string
                )}
            </div>
            
            {noteText && !isEditing && (
                <div style={{ 
                    fontSize: '0.9em', 
                    opacity: 0.8, 
                    whiteSpace: 'pre-wrap',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '4px',
                    marginTop: '4px'
                }}>
                    {noteText}
                </div>
            )}

            <Handle type="source" position={Position.Right} style={{ background: 'var(--primary)' }} />
        </div>
    );
};

export default memo(MindMapNode);

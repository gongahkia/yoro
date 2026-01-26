import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const MindMapNode = ({ data }: NodeProps) => {
    return (
        <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            minWidth: '150px',
            maxWidth: '300px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'left',
            fontFamily: 'var(--editor-font-family, sans-serif)',
            fontSize: 'var(--editor-font-size, 14px)',
            cursor: 'pointer'
        }}>
            <Handle type="target" position={Position.Left} style={{ background: 'var(--primary)' }} />
            
            <div style={{ fontWeight: 'bold', marginBottom: data.note ? '4px' : '0' }}>
                {data.label as string}
            </div>
            
            {data.note && (
                <div style={{ 
                    fontSize: '0.9em', 
                    opacity: 0.8, 
                    whiteSpace: 'pre-wrap',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '4px',
                    marginTop: '4px'
                }}>
                    {data.note as string}
                </div>
            )}

            <Handle type="source" position={Position.Right} style={{ background: 'var(--primary)' }} />
        </div>
    );
};

export default memo(MindMapNode);

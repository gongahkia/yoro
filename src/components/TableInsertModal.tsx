import React, { useState, useEffect, useRef } from 'react';
import { useSinglish } from '../contexts/SinglishContext';
import { useFocusTrap } from '../utils/useFocusTrap';
import './styles/TableInsertModal.css';

interface TableInsertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (rows: number, cols: number) => void;
}

export const TableInsertModal: React.FC<TableInsertModalProps> = ({
    isOpen,
    onClose,
    onInsert
}) => {
    const sl = useSinglish();
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const rowsInputRef = useRef<HTMLInputElement>(null);
    const trapRef = useFocusTrap(isOpen);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRows(3);
            setCols(3);
            setTimeout(() => rowsInputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onInsert(rows, cols);
            onClose();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const handleInsert = () => {
        onInsert(rows, cols);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="table-modal-overlay" onClick={onClose}>
            <div className="table-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown} ref={trapRef as React.RefObject<HTMLDivElement>}>
                <div className="table-modal-header">
                    <h3>Insert Table</h3>
                </div>
                <div className="table-modal-body">
                    <div className="table-modal-field">
                        <label htmlFor="table-rows">Rows</label>
                        <input
                            ref={rowsInputRef}
                            id="table-rows"
                            type="number"
                            min={2}
                            max={20}
                            value={rows}
                            onChange={e => setRows(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                        />
                    </div>
                    <div className="table-modal-field">
                        <label htmlFor="table-cols">Columns</label>
                        <input
                            id="table-cols"
                            type="number"
                            min={2}
                            max={10}
                            value={cols}
                            onChange={e => setCols(Math.min(10, Math.max(2, parseInt(e.target.value) || 2)))}
                        />
                    </div>
                </div>
                <div className="table-modal-footer">
                    <button className="table-modal-btn cancel" onClick={onClose}>
                        {sl ? 'Nvm' : 'Cancel'}
                    </button>
                    <button className="table-modal-btn insert" onClick={handleInsert}>
                        {sl ? 'Insert lah' : 'Insert'}
                    </button>
                </div>
            </div>
        </div>
    );
};

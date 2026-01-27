import React, { useState, useEffect, useRef } from 'react';
import type { Command, CommandParameter } from './CommandPalette';
import './styles/ParameterInputModal.css';

interface ParameterInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    command: Command | null;
    onSubmit: (command: Command, params: Record<string, string | number>) => void;
}

export const ParameterInputModal: React.FC<ParameterInputModalProps> = ({
    isOpen,
    onClose,
    command,
    onSubmit
}) => {
    const [values, setValues] = useState<Record<string, string | number>>({});
    const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    useEffect(() => {
        if (isOpen && command?.parameters) {
            // Initialize with default values
            const initial: Record<string, string | number> = {};
            command.parameters.forEach(param => {
                if (param.defaultValue !== undefined) {
                    initial[param.name] = param.defaultValue;
                } else if (param.type === 'number') {
                    initial[param.name] = param.min ?? 0;
                } else if (param.type === 'select' && param.options?.[0]) {
                    initial[param.name] = param.options[0].value;
                } else {
                    initial[param.name] = '';
                }
            });
            setValues(initial);
            setTimeout(() => firstInputRef.current?.focus(), 0);
        }
    }, [isOpen, command]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const handleSubmit = () => {
        if (command) {
            onSubmit(command, values);
            onClose();
        }
    };

    const handleValueChange = (name: string, value: string | number, param: CommandParameter) => {
        if (param.type === 'number') {
            let numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (isNaN(numValue)) numValue = param.min ?? 0;
            if (param.min !== undefined) numValue = Math.max(param.min, numValue);
            if (param.max !== undefined) numValue = Math.min(param.max, numValue);
            setValues(prev => ({ ...prev, [name]: numValue }));
        } else {
            setValues(prev => ({ ...prev, [name]: value }));
        }
    };

    if (!isOpen || !command) return null;

    return (
        <div className="param-modal-overlay" onClick={onClose}>
            <div className="param-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="param-modal-header">
                    <h3>{command.label}</h3>
                </div>
                <div className="param-modal-body">
                    {command.parameters?.map((param, index) => (
                        <div key={param.name} className="param-modal-field">
                            <label htmlFor={`param-${param.name}`}>{param.label}</label>
                            {param.type === 'select' ? (
                                <select
                                    ref={index === 0 ? firstInputRef as React.RefObject<HTMLSelectElement> : undefined}
                                    id={`param-${param.name}`}
                                    value={values[param.name] ?? ''}
                                    onChange={e => handleValueChange(param.name, e.target.value, param)}
                                >
                                    {param.options?.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    ref={index === 0 ? firstInputRef as React.RefObject<HTMLInputElement> : undefined}
                                    id={`param-${param.name}`}
                                    type={param.type}
                                    min={param.min}
                                    max={param.max}
                                    placeholder={param.placeholder}
                                    value={values[param.name] ?? ''}
                                    onChange={e => handleValueChange(
                                        param.name,
                                        param.type === 'number' ? parseFloat(e.target.value) : e.target.value,
                                        param
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="param-modal-footer">
                    <button className="param-modal-btn cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="param-modal-btn submit" onClick={handleSubmit}>
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

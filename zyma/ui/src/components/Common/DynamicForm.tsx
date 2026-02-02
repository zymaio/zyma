import React, { useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';

interface FormField {
    key: string;
    label: string;
    type: 'text' | 'select' | 'path';
    placeholder?: string;
    options?: { label: string, value: string }[];
}

interface DynamicFormProps {
    title: string;
    description?: string;
    fields: FormField[];
    initialValues: any;
    onSave: (values: any) => Promise<void>;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ title, description, fields, initialValues, onSave }) => {
    const [values, setValues] = useState(initialValues);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(values);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            alert("Save failed: " + e);
        } finally {
            setIsSaving(false);
        }
    };

    const styles: Record<string, React.CSSProperties> = {
        container: { padding: '32px', maxWidth: '600px', fontSize: 'var(--ui-font-size)' },
        label: { display: 'block', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.8em' },
        input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-side)', color: 'var(--text-primary)', marginBottom: '20px', outline: 'none' },
        button: { padding: '12px 24px', borderRadius: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }
    };

    return (
        <div style={styles.container}>
            <h2 style={{ fontSize: '1.5em', fontWeight: '900', marginBottom: '4px' }}>{title}</h2>
            {description && <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>{description}</p>}

            {fields.map(f => (
                <div key={f.key}>
                    <label style={styles.label}>{f.label}</label>
                    {f.type === 'select' ? (
                        <select 
                            style={styles.input as any} 
                            value={values[f.key]} 
                            onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                        >
                            {f.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : (
                        <input 
                            style={styles.input} 
                            value={values[f.key] || ''} 
                            placeholder={f.placeholder}
                            onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                        />
                    )}
                </div>
            ))}

            <button style={styles.button} onClick={handleSave} disabled={isSaving}>
                {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                <span>{saved ? 'Saved' : 'Save Configuration'}</span>
            </button>
        </div>
    );
};

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, type MouseEvent, type KeyboardEvent } from 'react';
import { CheckCircle2, Info, AlertTriangle, Minus, Plus, Search, X, LoaderCircle } from 'lucide-react';
import './ui.css';
import { useModalBehavior } from '../../hooks/useModalBehavior';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link'; size?: 'small' | 'medium' | 'large'; loading?: boolean };
export function Button({variant = 'primary', size = 'medium', loading, disabled, children, className = '', ...props}: ButtonProps) {
  return <button type="button" {...props} disabled={disabled || loading} aria-busy={loading || undefined} data-size={size} className={`ui-button ui-button-${variant} ${className}`}><span className="ui-button-content">{children}</span>{loading && <LoaderCircle className="ui-spinner" aria-hidden="true" />}</button>;
}
export function IconButton({label, children, ...props}: Omit<ButtonProps, 'aria-label'> & {label: string}) {
  return <Button variant="ghost" {...props} className={`ui-icon-button ${props.className || ''}`} aria-label={label} title={label}>{children}</Button>;
}
export function TextInput({label, hint, error, id, ...props}: InputHTMLAttributes<HTMLInputElement> & {label: string; hint?: string; error?: string}) {
  const generated = useId(); const fieldId = id || generated;
  return <div className="ui-field"><label htmlFor={fieldId}>{label}</label><input {...props} id={fieldId} className={`ui-input ${props.className || ''}`} aria-invalid={!!error} aria-describedby={error || hint ? `${fieldId}-help` : undefined}/>{(error || hint) && <p id={`${fieldId}-help`} className={`ui-hint ${error ? 'ui-error' : ''}`}>{error || hint}</p>}</div>;
}
export function NumberInput(props: Omit<Parameters<typeof TextInput>[0], 'type'>) { return <TextInput {...props} type="number" inputMode="decimal"/>; }
export function Select({label, error, children, ...props}: SelectHTMLAttributes<HTMLSelectElement> & {label: string; error?: string}) {
  const generated = useId(); const id = props.id || generated;
  return <div className="ui-field"><label htmlFor={id}>{label}</label><select {...props} id={id} className="ui-input" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}>{children}</select>{error && <p id={`${id}-error`} className="ui-hint ui-error">{error}</p>}</div>;
}
export function Textarea({label, error, ...props}: TextareaHTMLAttributes<HTMLTextAreaElement> & {label: string; error?: string}) {
  const generated = useId(); const id = props.id || generated;
  return <div className="ui-field"><label htmlFor={id}>{label}</label><textarea rows={3} {...props} id={id} className="ui-input" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}/>{error && <p id={`${id}-error`} className="ui-hint ui-error">{error}</p>}</div>;
}
export function SearchInput({value, onValueChange, label = 'Ürün ara', loading = false}: {value: string; onValueChange: (value: string) => void; label?: string; loading?: boolean}) {
  const id = useId();
  return <div className="ui-field"><label htmlFor={id}>{label}</label><div className="ui-search"><Search aria-hidden="true"/><input id={id} type="search" className="ui-input" value={value} onChange={e => onValueChange(e.target.value)} placeholder="Ürün adı veya stok kodu" aria-busy={loading}/>{value && <IconButton label="Aramayı temizle" onClick={() => onValueChange('')}><X/></IconButton>}</div></div>;
}
export function QuantityStepper({value, onChange, min = 1, max = Infinity, step = 1, disabled = false, label = 'Miktar'}: {value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; disabled?: boolean; label?: string}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = (n: number) => { const next = Math.min(max, Math.max(min, Number(n.toFixed(6)))); onChange(next); setDraft(String(next)); };
  return <div className="ui-stepper" role="group" aria-label={label}><IconButton label="Adedi azalt" disabled={disabled || value <= min} onClick={() => commit(value-step)}><Minus/></IconButton><input aria-label={label} type="number" inputMode="decimal" min={min} max={Number.isFinite(max) ? max : undefined} step={step} value={draft} disabled={disabled} onChange={e => { setDraft(e.target.value); const n = e.target.valueAsNumber; if (Number.isFinite(n) && n >= min && n <= max) onChange(n); }} onBlur={() => { const n = Number(draft); commit(draft.trim() && Number.isFinite(n) ? n : value); }}/><IconButton label="Adedi artır" disabled={disabled || value >= max} onClick={() => commit(value+step)}><Plus/></IconButton></div>;
}
export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'error';
export function StatusBadge({tone = 'neutral', children}: {tone?: Tone; children: ReactNode}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' || tone === 'error' ? AlertTriangle : Info;
  return <span className="ui-badge" data-tone={tone}><Icon aria-hidden="true"/>{children}</span>;
}
export function Section({title, children}: {title: string; children: ReactNode}) { return <section className="ui-section"><h2>{title}</h2>{children}</section>; }
export function KPI({label, value, hint, loading, error}: {label: string; value: string; hint?: string; loading?: boolean; error?: string}) { return <div className="ui-kpi"><p className="ui-hint">{label}</p>{loading ? <Skeleton/> : error ? <p className="ui-error" role="alert">{error}</p> : <strong>{value}</strong>}{hint && <p className="ui-hint">{hint}</p>}</div>; }
export function ProductRow({name, code, price, image, children}: {name: string; code: string; price: string; image?: string; children?: ReactNode}) { return <article className="ui-row">{image && <img className="ui-product-image" src={image} alt={name} width="56" height="56"/>}<div className="ui-row-body"><h3>{name}</h3><p className="ui-hint">{code}</p><p style={{fontVariantNumeric: 'tabular-nums'}}>{price}</p></div><div className="ui-actions">{children}</div></article>; }
export function OrderRow({number, customer, total, status, children}: {number: string; customer: string; total: string; status: ReactNode; children?: ReactNode}) { return <article className="ui-row"><div className="ui-row-body"><h3>{number}</h3><p className="ui-hint">{customer}</p></div><div>{status}<p style={{fontVariantNumeric: 'tabular-nums'}}>{total}</p></div>{children}</article>; }
export function Skeleton() { return <div role="status" aria-label="Yükleniyor" className="ui-skeleton"/>; }
export function FeedbackState({kind, title, description, action}: {kind: 'empty' | 'error' | 'unauthorized'; title: string; description: string; action?: ReactNode}) { return <div className="ui-state" role={kind === 'error' ? 'alert' : 'status'}><StatusBadge tone={kind === 'error' ? 'error' : 'neutral'}>{title}</StatusBadge><p>{description}</p>{action}</div>; }
export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <label
      className={`ui-toggle-switch ${disabled ? 'is-disabled' : ''} ${className}`}
    >
      <div className="ui-toggle-switch-text">
        <span className="ui-toggle-switch-label">{label}</span>
        {description && <span className="ui-toggle-switch-desc">{description}</span>}
      </div>
      <div className="ui-toggle-switch-control">
        <input
          {...props}
          id={inputId}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="ui-toggle-switch-input"
        />
        <span className="ui-toggle-switch-track" aria-hidden="true">
          <span className="ui-toggle-switch-thumb" />
        </span>
      </div>
    </label>
  );
}
export type MenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  rightElement?: ReactNode;
  variant?: 'default' | 'danger' | 'accent';
  active?: boolean;
};
export function MenuItem({
  icon,
  label,
  description,
  badge,
  rightElement,
  variant = 'default',
  active = false,
  disabled = false,
  className = '',
  children,
  ...props
}: MenuItemProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled}
      className={`ui-menu-item ui-menu-item-${variant} ${active ? 'is-active' : ''} ${className}`}
    >
      {icon && <span className="ui-menu-item-icon" aria-hidden="true">{icon}</span>}
      <div className="ui-menu-item-body">
        <span className="ui-menu-item-label">{label || children}</span>
        {description && <span className="ui-menu-item-desc">{description}</span>}
      </div>
      {badge && <span className="ui-menu-item-badge">{badge}</span>}
      {rightElement && <span className="ui-menu-item-right">{rightElement}</span>}
    </button>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useModalBehavior(open, onClose);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement;
    try {
      if (!dialog.open) {
        dialog.showModal();
      }
    } catch (e) {
      console.warn('Modal showModal error:', e);
    }
    return () => {
      try {
        if (dialog?.open) {
          dialog.close();
        }
      } catch (e) {}
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (ref.current && e.target === ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const isInside = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInside) {
        onClose();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const controls = Array.from(
      (e.currentTarget as HTMLDialogElement).querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'
      )
    ).filter(el => el.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (first && ((!e.shiftKey && document.activeElement === last) || (e.shiftKey && document.activeElement === first))) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  };

  return (
    <dialog
      ref={ref}
      className={`ui-dialog ui-scope ${className}`}
      data-size={size}
      aria-labelledby={id}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <IconButton label="Pencereyi kapat" onClick={onClose}>
          <X />
        </IconButton>
      </header>
      <div className="ui-dialog-body">
        {children}
      </div>
      {footer && <footer>{footer}</footer>}
    </dialog>
  );
}
export function Toast({message, onClose}: {message: string | null; onClose: () => void}) { return <div aria-live="polite" aria-atomic="true">{message && <div className="ui-toast"><span>{message}</span><IconButton label="Bildirimi kapat" onClick={onClose}><X/></IconButton></div>}</div>; }

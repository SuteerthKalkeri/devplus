import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { ErrorMessage } from './ErrorMessage';
import { message } from '../lib/error-message';

function Modal({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function NameModal({
  title,
  description,
  label,
  placeholder,
  initialValue = '',
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  label: string;
  placeholder: string;
  initialValue?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <p className="muted">{description}</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const name = String(new FormData(event.currentTarget).get('name')).trim();
          if (!name) {
            setError('Enter a name to continue.');
            return;
          }
          setBusy(true);
          setError('');
          try {
            await onSubmit(name);
          } catch (error) {
            setError(message(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {label}
          <input
            name="name"
            defaultValue={initialValue}
            placeholder={placeholder}
            required
            maxLength={100}
          />
        </label>
        <ErrorMessage message={error} />
        <div className="modal-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ConfirmModal({
  title,
  description,
  action,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  action: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <p className="muted">{description}</p>
      <ErrorMessage message={error} />
      <div className="modal-actions">
        <button className="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="danger-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } catch (error) {
              setError(message(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Working…' : action}
        </button>
      </div>
    </Modal>
  );
}

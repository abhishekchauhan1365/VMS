import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './primitives';

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/40" onClick={onClose} />
      <div className={cn('relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl', className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-40 transition-opacity',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className="absolute inset-0 bg-navy-900/30" onClick={onClose} />
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-full max-w-md transform bg-white shadow-xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && <p className="mb-4 text-sm text-navy-500">{description}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

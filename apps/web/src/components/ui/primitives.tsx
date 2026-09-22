import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-navy-600 text-white hover:bg-navy-700 disabled:bg-navy-300',
  secondary: 'bg-white text-navy-700 border border-navy-200 hover:bg-navy-50',
  ghost: 'text-navy-600 hover:bg-navy-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(({ className, variant = 'primary', ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
      buttonVariants[variant],
      className,
    )}
    {...props}
  />
));
Button.displayName = 'Button';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-navy-100 bg-white shadow-sm', className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1 block text-sm font-medium text-navy-700', className)} {...props} />
  );
}

export function FieldError({ children }: { children?: string | undefined }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-red-600">{children}</p>;
}

const statusColors: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-200 text-gray-700',
  CHECKED_IN: 'bg-emerald-100 text-emerald-800',
  CHECKED_OUT: 'bg-navy-100 text-navy-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
  OVERSTAY: 'bg-red-100 text-red-800 animate-pulse',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusColors[status] ?? 'bg-gray-100 text-gray-700',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-navy-100', className)} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-navy-200 py-12 text-center">
      <p className="font-medium text-navy-700">{title}</p>
      {description && <p className="text-sm text-navy-400">{description}</p>}
    </div>
  );
}

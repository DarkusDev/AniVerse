interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, hint, children }: FormFieldProps): React.JSX.Element {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function inputCls(hasError = false): string {
  const base =
    'w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none transition-colors focus:ring-1 focus:ring-brand/30';
  return hasError
    ? `${base} border-red-500/50 focus:border-red-500/50`
    : `${base} border-surface-border focus:border-brand/60`;
}

import { AlertTriangle } from 'lucide-react';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  tone?: 'danger' | 'orange';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ title, message, confirmLabel, busyLabel = 'Working...', busy = false, tone = 'danger', onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmStyle = tone === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-200' : 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-200';
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" className="w-full max-w-md overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-300" />
      <div className="p-6 sm:p-7">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><AlertTriangle size={23} /></div>
        <h2 id="confirm-dialog-title" className="text-xl font-black text-slate-900">{title}</h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Keep it</button>
          <button type="button" disabled={busy} onClick={onConfirm} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-4 disabled:opacity-60 ${confirmStyle}`}>{busy ? busyLabel : confirmLabel}</button>
        </div>
      </div>
    </section>
  </div>;
}

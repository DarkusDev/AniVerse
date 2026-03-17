'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listsApi, type AnimeUserStatus, type ListEntry } from '@/lib/api-client';
import { LIST_STATUSES, LIST_STATUS_CONFIG } from '@/lib/anime-utils';

interface Props {
  animeId: number;
  totalEpisodes?: number | null;
}

type ButtonState = 'idle' | 'loading' | 'saving';

export default function ListAddButton({ animeId, totalEpisodes }: Props): React.JSX.Element | null {
  const { user } = useAuth();
  const [entry, setEntry] = useState<ListEntry | null>(null);
  const [state, setState] = useState<ButtonState>('loading');
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch existing entry on mount
  useEffect(() => {
    if (!user) {
      setState('idle');
      return;
    }
    listsApi
      .getEntry(animeId)
      .then((e) => { setEntry(e); setState('idle'); })
      .catch((err: { status?: number }) => {
        // 404 → not in list, anything else → ignore silently
        setState('idle');
        if (err?.status !== 404) console.warn('listEntry fetch', err);
      });
  }, [animeId, user]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  const handleSelectStatus = async (status: AnimeUserStatus) => {
    setOpen(false);
    setState('saving');
    try {
      if (entry) {
        const updated = await listsApi.updateEntry(animeId, { status });
        setEntry(updated);
        showFeedback(`Estado: ${LIST_STATUS_CONFIG[status]?.label ?? status}`);
      } else {
        const created = await listsApi.createEntry({
          animeId,
          status,
          totalEpisodes: totalEpisodes ?? undefined,
        });
        setEntry(created);
        showFeedback('Añadido a tu lista');
      }
    } catch {
      showFeedback('Error al guardar');
    } finally {
      setState('idle');
    }
  };

  const handleRemove = async () => {
    setOpen(false);
    setState('saving');
    try {
      await listsApi.deleteEntry(animeId);
      setEntry(null);
      showFeedback('Eliminado de tu lista');
    } catch {
      showFeedback('Error al eliminar');
    } finally {
      setState('idle');
    }
  };

  // Not logged in — show link to login
  if (!user) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated px-4 py-2.5 text-sm font-semibold text-gray-400 transition-all hover:border-brand/40 hover:text-white"
      >
        + Añadir a mi lista
      </a>
    );
  }

  const cfg = entry ? LIST_STATUS_CONFIG[entry.status] : null;

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Feedback toast */}
      {feedback && (
        <div className="absolute -top-10 left-0 whitespace-nowrap rounded-lg bg-surface-elevated border border-surface-border px-3 py-1.5 text-xs font-medium text-white shadow-lg z-50">
          {feedback}
        </div>
      )}

      <button
        onClick={() => state === 'idle' && setOpen((o) => !o)}
        disabled={state === 'loading' || state === 'saving'}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-wait ${
          entry && cfg
            ? `${cfg.bg} ${cfg.color} hover:opacity-80`
            : 'border-brand/40 bg-brand/10 text-brand-light hover:bg-brand/20'
        }`}
      >
        {state === 'loading' || state === 'saving' ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : entry && cfg ? (
          <>
            <span>{cfg.icon}</span>
            {cfg.label}
            <span className="ml-0.5 text-xs opacity-60">▾</span>
          </>
        ) : (
          <>
            <span className="text-base leading-none">+</span>
            Añadir a lista
            <span className="ml-0.5 text-xs opacity-60">▾</span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-surface-border bg-surface-elevated shadow-2xl shadow-black/40">
          {LIST_STATUSES.map((s) => {
            const c = LIST_STATUS_CONFIG[s]!;
            const isActive = entry?.status === s;
            return (
              <button
                key={s}
                onClick={() => void handleSelectStatus(s)}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                  isActive ? `font-semibold ${c.color}` : 'text-gray-300'
                }`}
              >
                <span className="w-4 text-center text-xs">{c.icon}</span>
                {c.label}
                {isActive && <span className="ml-auto text-xs">✓</span>}
              </button>
            );
          })}

          {entry && (
            <>
              <div className="mx-3 border-t border-surface-border" />
              <button
                onClick={() => void handleRemove()}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                <span className="w-4 text-center text-xs">✕</span>
                Eliminar de lista
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

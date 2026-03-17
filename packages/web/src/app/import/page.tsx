'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { importApi, type ImportJob, type ImportSource } from '@/lib/api-client';

// ─── Progress panel ───────────────────────────────────────────────────────────

interface PanelState {
  phase: 'idle' | 'running' | 'done' | 'error';
  job: ImportJob | null;
  localError: string;
}

const IDLE: PanelState = { phase: 'idle', job: null, localError: '' };

function ProgressBar({ processed, total }: { processed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (processed / total) * 100) : 0;
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-border">
      <div
        className="h-full rounded-full bg-brand transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-surface border border-surface-border px-3 py-2">
      <span className={`text-lg font-extrabold ${color}`}>{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">{label}</span>
    </div>
  );
}

interface ImportPanelProps {
  source: ImportSource;
  label: string;
  logo: string;
  placeholder: string;
  onStart: (username: string) => Promise<string>;
}

function ImportPanel({ source, label, logo, placeholder, onStart }: ImportPanelProps) {
  const [username, setUsername] = useState('');
  const [state, setState] = useState<PanelState>(IDLE);
  const esRef = useRef<EventSource | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  const start = async () => {
    if (!username.trim() || state.phase === 'running') return;

    esRef.current?.close();
    setState({ phase: 'running', job: null, localError: '' });

    let jobId: string;
    try {
      jobId = await onStart(username.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar la importación';
      setState({ phase: 'error', job: null, localError: msg });
      return;
    }

    const es = importApi.openProgressStream(jobId);
    esRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      const job = JSON.parse(event.data) as ImportJob;
      setState((prev) => ({
        ...prev,
        phase: job.status === 'done' ? 'done' : job.status === 'error' ? 'error' : 'running',
        job,
      }));
      if (job.status === 'done' || job.status === 'error') {
        es.close();
        esRef.current = null;
      }
    };

    es.onerror = () => {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        localError: prev.job ? '' : 'Error de conexión con el servidor',
      }));
      es.close();
      esRef.current = null;
    };
  };

  const reset = () => {
    esRef.current?.close();
    esRef.current = null;
    setState(IDLE);
    setUsername('');
  };

  const { phase, job, localError } = state;
  const isRunning = phase === 'running';
  const isDone = phase === 'done';
  const isError = phase === 'error';

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-elevated p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{logo}</span>
        <div>
          <h2 className="text-lg font-bold text-white">{label}</h2>
          <p className="text-xs text-gray-500">Importa tu lista de {label}</p>
        </div>
      </div>

      {/* Input + button */}
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void start(); }}
          placeholder={placeholder}
          disabled={isRunning}
          className="flex-1 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 disabled:opacity-50"
        />
        {phase === 'idle' ? (
          <button
            onClick={() => void start()}
            disabled={!username.trim()}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Importar
          </button>
        ) : (
          <button
            onClick={reset}
            className="rounded-xl border border-surface-border px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            {isRunning ? 'Cancelar' : 'Nuevo'}
          </button>
        )}
      </div>

      {/* Local error (pre-job) */}
      {isError && localError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {localError}
        </div>
      )}

      {/* Job progress */}
      {job && (
        <div className="space-y-3">
          {/* Status message */}
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            )}
            {isDone && <span className="text-green-400">✓</span>}
            {isError && <span className="text-red-400">✕</span>}
            <p
              className={`text-sm ${
                isError
                  ? 'text-red-400'
                  : isDone
                    ? 'text-green-400'
                    : 'text-gray-300'
              }`}
            >
              {job.errorMessage ?? job.message}
            </p>
          </div>

          {/* Progress bar */}
          {job.total > 0 && (
            <>
              <ProgressBar processed={job.processed} total={job.total} />
              <p className="text-right text-xs text-gray-600">
                {job.processed} / {job.total}
              </p>
            </>
          )}

          {/* Stats */}
          {(job.imported > 0 || job.updated > 0 || job.skipped > 0 || job.errors > 0) && (
            <div className="grid grid-cols-4 gap-2">
              <StatBadge label="Nuevos" value={job.imported} color="text-green-400" />
              <StatBadge label="Actualizados" value={job.updated} color="text-blue-400" />
              <StatBadge label="Omitidos" value={job.skipped} color="text-gray-500" />
              <StatBadge label="Errores" value={job.errors} color="text-red-400" />
            </div>
          )}

          {/* Done summary */}
          {isDone && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              ¡Importación completada! Revisa tu{' '}
              <a href="/my-list" className="font-bold underline underline-offset-2 hover:text-green-300">
                lista de anime
              </a>
              .
            </div>
          )}

          {/* Remote error */}
          {isError && job.errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {job.errorMessage}
            </div>
          )}
        </div>
      )}

      {/* Rate limit notice */}
      {source === 'mal' && phase === 'idle' && (
        <p className="text-[11px] text-gray-700">
          La importación de MAL puede tardar varios minutos en listas grandes debido al límite de
          velocidad de la API de Jikan (3 req/s).
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage(): React.JSX.Element {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex items-center justify-center py-40">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white">Importar lista</h1>
          <p className="mt-2 text-gray-400 text-sm">
            Importa tu historial desde MyAnimeList o AniList. Las entradas existentes se
            actualizarán con los datos externos.
          </p>
        </div>

        {/* Info banner */}
        <div className="mb-6 flex gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
          <span className="shrink-0 text-brand-light">ℹ</span>
          <p className="text-xs leading-relaxed text-gray-400">
            Los status, puntuaciones y progreso de episodios serán importados y sincronizados con tu
            cuenta de AniVerse. Los animes se cachean localmente para no depender de la API externa.
          </p>
        </div>

        {/* Panels */}
        <div className="grid gap-6 md:grid-cols-2">
          <ImportPanel
            source="mal"
            label="MyAnimeList"
            logo="🔵"
            placeholder="Tu usuario de MAL"
            onStart={async (u) => {
              const r = await importApi.startMal(u);
              return r.jobId;
            }}
          />
          <ImportPanel
            source="anilist"
            label="AniList"
            logo="🟢"
            placeholder="Tu usuario de AniList"
            onStart={async (u) => {
              const r = await importApi.startAniList(u);
              return r.jobId;
            }}
          />
        </div>

        {/* Mapping tables */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 text-xs text-gray-500">
          <div>
            <h3 className="mb-2 font-semibold text-gray-400 uppercase tracking-wider">
              Estados MAL → AniVerse
            </h3>
            <table className="w-full border-collapse">
              <tbody>
                {[
                  ['Watching', 'Viendo'],
                  ['Completed', 'Completado'],
                  ['On-Hold', 'En pausa'],
                  ['Dropped', 'Abandonado'],
                  ['Plan to Watch', 'Planeado'],
                ].map(([from, to]) => (
                  <tr key={from} className="border-b border-surface-border">
                    <td className="py-1.5 pr-3 font-mono text-gray-500">{from}</td>
                    <td className="py-1.5 text-gray-400">→ {to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-400 uppercase tracking-wider">
              Estados AniList → AniVerse
            </h3>
            <table className="w-full border-collapse">
              <tbody>
                {[
                  ['CURRENT / REPEATING', 'Viendo'],
                  ['COMPLETED', 'Completado'],
                  ['PLANNING', 'Planeado'],
                  ['DROPPED', 'Abandonado'],
                  ['PAUSED', 'En pausa'],
                ].map(([from, to]) => (
                  <tr key={from} className="border-b border-surface-border">
                    <td className="py-1.5 pr-3 font-mono text-gray-500">{from}</td>
                    <td className="py-1.5 text-gray-400">→ {to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

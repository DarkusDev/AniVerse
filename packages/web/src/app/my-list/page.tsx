'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { listsApi, type AnimeUserStatus, type ListEntry } from '@/lib/api-client';
import { LIST_STATUSES, LIST_STATUS_CONFIG } from '@/lib/anime-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabCount {
  status: AnimeUserStatus;
  count: number;
}

// ─── Episode progress bar ─────────────────────────────────────────────────────

function EpisodeBar({
  watched,
  total,
}: {
  watched: number;
  total: number | null;
}): React.JSX.Element {
  const pct = total && total > 0 ? Math.min(100, (watched / total) * 100) : 0;
  const showBar = total !== null && total > 0;

  return (
    <div className="mt-1.5">
      <span className="text-xs text-gray-500">
        {watched}
        {total ? ` / ${total}` : ''} eps
      </span>
      {showBar && (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-border">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pct >= 100 ? 'bg-green-500' : 'bg-brand'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: ListEntry;
  onPlusOne: (entry: ListEntry) => void;
  onStatusChange: (entry: ListEntry, status: AnimeUserStatus) => void;
  onRemove: (entry: ListEntry) => void;
  plusOnePending: boolean;
}

function EntryCard({
  entry,
  onPlusOne,
  onStatusChange,
  onRemove,
  plusOnePending,
}: EntryCardProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title =
    entry.anime?.titleEnglish ?? entry.anime?.titleRomaji ?? `Anime #${entry.animeId}`;
  const cover = entry.anime?.coverImage ?? null;
  const total = entry.totalEpisodes ?? entry.anime?.episodes ?? null;
  const cfg = LIST_STATUS_CONFIG[entry.status];

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const canPlusOne = total === null || entry.episodesWatched < total;

  return (
    <div className="group flex gap-3 rounded-xl border border-surface-border bg-surface-elevated p-3 transition-colors hover:border-brand/20">
      {/* Cover */}
      <Link href={`/anime/${entry.animeId}`} className="shrink-0">
        <div className="relative h-20 w-14 overflow-hidden rounded-lg bg-surface border border-surface-border">
          {cover ? (
            <Image src={cover} alt={title} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-700 text-xl">?</div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <Link
            href={`/anime/${entry.animeId}`}
            className="block text-sm font-semibold text-white leading-snug line-clamp-2 hover:text-brand-light transition-colors"
          >
            {title}
          </Link>

          {/* Episode progress */}
          <EpisodeBar watched={entry.episodesWatched} total={total} />
        </div>

        {/* Score */}
        {entry.score !== null && (
          <div className="mt-1.5">
            <span className="text-xs text-yellow-400 font-semibold">★ {entry.score.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {/* Status chip + menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80 ${cfg?.bg ?? ''} ${cfg?.color ?? 'text-gray-400'}`}
          >
            {cfg?.label ?? entry.status} ▾
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-surface-border bg-surface-elevated shadow-2xl shadow-black/50">
              {LIST_STATUSES.map((s) => {
                const c = LIST_STATUS_CONFIG[s]!;
                const active = entry.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => { setMenuOpen(false); onStatusChange(entry, s); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 ${
                      active ? `font-bold ${c.color}` : 'text-gray-300'
                    }`}
                  >
                    <span className="w-3 text-center">{c.icon}</span>
                    {c.label}
                    {active && <span className="ml-auto">✓</span>}
                  </button>
                );
              })}
              <div className="mx-3 border-t border-surface-border" />
              <button
                onClick={() => { setMenuOpen(false); onRemove(entry); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 transition-colors hover:bg-red-500/10"
              >
                <span className="w-3 text-center">✕</span>
                Eliminar
              </button>
            </div>
          )}
        </div>

        {/* +1 button */}
        <button
          onClick={() => canPlusOne && onPlusOne(entry)}
          disabled={plusOnePending || !canPlusOne}
          title={canPlusOne ? '+1 episodio' : 'Ya completaste todos los episodios'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition-all ${
            canPlusOne
              ? 'border-brand/40 bg-brand/10 text-brand-light hover:bg-brand/30 hover:scale-110 active:scale-95'
              : 'border-surface-border text-gray-700 cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {plusOnePending ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-light border-t-transparent" />
          ) : (
            '+1'
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyListPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AnimeUserStatus>('WATCHING');
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [tabCounts, setTabCounts] = useState<Partial<Record<AnimeUserStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const PER_PAGE = 50;

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Load counts for all tabs (initial + after mutations)
  const loadCounts = useCallback(async () => {
    const results = await Promise.allSettled(
      LIST_STATUSES.map((s) => listsApi.getMyList({ status: s, perPage: 1 })),
    );
    const counts: Partial<Record<AnimeUserStatus, number>> = {};
    LIST_STATUSES.forEach((s, i) => {
      const r = results[i];
      if (r?.status === 'fulfilled') counts[s] = r.value.total;
    });
    setTabCounts(counts);
  }, []);

  // Load entries for active tab
  const loadEntries = useCallback(async (status: AnimeUserStatus, p: number) => {
    setLoading(true);
    try {
      const data = await listsApi.getMyList({ status, page: p, perPage: PER_PAGE });
      setEntries(data.results);
      setLastPage(data.lastPage);
      setTotal(data.total);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadCounts();
  }, [user, loadCounts]);

  useEffect(() => {
    if (!user) return;
    setPage(1);
    void loadEntries(activeTab, 1);
  }, [activeTab, user, loadEntries]);

  // ── Optimistic +1 ─────────────────────────────────────────────────────────

  const handlePlusOne = useCallback((entry: ListEntry) => {
    const total = entry.totalEpisodes ?? entry.anime?.episodes ?? null;
    const newCount = entry.episodesWatched + 1;
    const autoComplete = total !== null && newCount >= total;
    const newStatus: AnimeUserStatus = autoComplete ? 'COMPLETED' : entry.status;

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.animeId === entry.animeId
          ? { ...e, episodesWatched: newCount, status: newStatus }
          : e,
      ),
    );

    setPendingIds((s) => new Set(s).add(entry.animeId));

    listsApi
      .updateEntry(entry.animeId, { episodesWatched: newCount, status: newStatus })
      .then((updated) => {
        setEntries((prev) =>
          prev.map((e) => (e.animeId === entry.animeId ? updated : e)),
        );
        if (autoComplete) void loadCounts();
      })
      .catch(() => {
        // Revert on error
        setEntries((prev) =>
          prev.map((e) => (e.animeId === entry.animeId ? entry : e)),
        );
      })
      .finally(() => {
        setPendingIds((s) => {
          const next = new Set(s);
          next.delete(entry.animeId);
          return next;
        });
      });
  }, [loadCounts]);

  // ── Status change ─────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    (entry: ListEntry, status: AnimeUserStatus) => {
      if (status !== activeTab) {
        // Optimistic: remove from current tab — entry moves to another tab
        setEntries((prev) => prev.filter((e) => e.animeId !== entry.animeId));
        setTotal((n) => Math.max(0, n - 1));

        listsApi
          .updateEntry(entry.animeId, { status })
          .catch(() => {
            // Revert: re-add entry to current tab
            setEntries((prev) => [entry, ...prev]);
            setTotal((n) => n + 1);
          })
          .finally(() => void loadCounts());
      } else {
        // Same tab: update in-place with server response so episodesWatched
        // reflects any backend adjustment (e.g. COMPLETED → fill to total)
        listsApi
          .updateEntry(entry.animeId, { status })
          .then((updated) => {
            setEntries((prev) =>
              prev.map((e) => (e.animeId === entry.animeId ? updated : e)),
            );
          })
          .catch(() => undefined);
      }
    },
    [activeTab, loadCounts],
  );

  // ── Remove ────────────────────────────────────────────────────────────────

  const handleRemove = useCallback(
    (entry: ListEntry) => {
      setEntries((prev) => prev.filter((e) => e.animeId !== entry.animeId));
      setTotal((n) => Math.max(0, n - 1));

      listsApi
        .deleteEntry(entry.animeId)
        .catch(() => {
          setEntries((prev) => [entry, ...prev]);
          setTotal((n) => n + 1);
        })
        .finally(() => void loadCounts());
    },
    [loadCounts],
  );

  if (authLoading || !user) {
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

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-white">Mi Lista</h1>
          <p className="mt-1 text-sm text-gray-500">
            {Object.values(tabCounts).reduce((a, b) => a + (b ?? 0), 0)} anime guardados
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {LIST_STATUSES.map((s) => {
            const cfg = LIST_STATUS_CONFIG[s]!;
            const count = tabCounts[s] ?? 0;
            const active = activeTab === s;
            return (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? `${cfg.bg} ${cfg.color}`
                    : 'text-gray-500 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <span>{cfg.icon}</span>
                {cfg.label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-white/15' : 'bg-surface-elevated text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[104px] rounded-xl bg-surface-elevated border border-surface-border animate-pulse"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-5xl mb-4">{LIST_STATUS_CONFIG[activeTab]?.icon}</p>
            <p className="text-lg font-semibold text-white mb-1">
              No tienes anime en {LIST_STATUS_CONFIG[activeTab]?.label.toLowerCase()}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Explora el catálogo y añade títulos a tu lista.
            </p>
            <Link
              href="/explore"
              className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-light transition-colors"
            >
              Explorar anime
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-gray-600">
              {total} título{total !== 1 ? 's' : ''}
              {lastPage > 1 && ` — página ${page} de ${lastPage}`}
            </p>

            <div className="space-y-2">
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onPlusOne={handlePlusOne}
                  onStatusChange={handleStatusChange}
                  onRemove={handleRemove}
                  plusOnePending={pendingIds.has(entry.animeId)}
                />
              ))}
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const p = Math.max(1, page - 1);
                    setPage(p);
                    void loadEntries(activeTab, p);
                  }}
                  disabled={page === 1}
                  className="rounded-lg border border-surface-border px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-gray-500">{page} / {lastPage}</span>
                <button
                  onClick={() => {
                    const p = Math.min(lastPage, page + 1);
                    setPage(p);
                    void loadEntries(activeTab, p);
                  }}
                  disabled={page >= lastPage}
                  className="rounded-lg border border-surface-border px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

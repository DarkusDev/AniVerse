'use client';

import { useCallback, useEffect, useState } from 'react';
import Navbar from '@/components/ui/Navbar';
import AnimeGrid from '@/components/anime/AnimeGrid';
import { animeApi, type AnimeListItem, type AnimePageInfo } from '@/lib/api-client';
import { useDebounce } from '@/hooks/useDebounce';
import { GENRES, FORMATS, SORT_OPTIONS } from '@/lib/anime-utils';

const YEARS = Array.from({ length: new Date().getFullYear() - 1959 }, (_, i) => new Date().getFullYear() - i);

interface Filters {
  q: string;
  genre: string;
  format: string;
  year: string;
  sort: string;
}

const DEFAULT_FILTERS: Filters = {
  q: '',
  genre: '',
  format: '',
  year: '',
  sort: 'POPULARITY',
};

export default function ExplorePage(): React.JSX.Element {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<AnimeListItem[]>([]);
  const [pageInfo, setPageInfo] = useState<AnimePageInfo | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedQ = useDebounce(filters.q, 400);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await animeApi.search({
          q: debouncedQ || undefined,
          genre: filters.genre || undefined,
          format: filters.format || undefined,
          year: filters.year ? Number(filters.year) : undefined,
          sort: filters.sort || undefined,
          page,
          perPage: 20,
        });
        if (!cancelled) {
          setItems(data.results);
          setPageInfo(data.pageInfo);
        }
      } catch {
        if (!cancelled) setError('Error al cargar los resultados. Intenta de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [debouncedQ, filters.genre, filters.format, filters.year, filters.sort, page]);

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) =>
    k !== 'sort' ? Boolean(v) : v !== 'POPULARITY'
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-white">Explorar</h1>
          <p className="mt-1 text-gray-400 text-sm">Descubre miles de títulos de anime</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar anime..."
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
          />
          {filters.q && (
            <button
              onClick={() => setFilter('q', '')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Sort */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ordenar por</h3>
                <div className="space-y-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFilter('sort', opt.value)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        filters.sort === opt.value
                          ? 'bg-brand/20 text-brand-light font-medium'
                          : 'text-gray-400 hover:bg-surface-elevated hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Formato</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setFilter('format', '')}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      !filters.format
                        ? 'bg-brand/20 text-brand-light font-medium'
                        : 'text-gray-400 hover:bg-surface-elevated hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  {FORMATS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilter('format', filters.format === f.value ? '' : f.value)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        filters.format === f.value
                          ? 'bg-brand/20 text-brand-light font-medium'
                          : 'text-gray-400 hover:bg-surface-elevated hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Año</h3>
                <select
                  value={filters.year}
                  onChange={(e) => setFilter('year', e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
                >
                  <option value="">Todos</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Genres */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Género</h3>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setFilter('genre', filters.genre === g ? '' : g)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        filters.genre === g
                          ? 'bg-brand text-white'
                          : 'bg-surface-elevated text-gray-400 hover:bg-brand/20 hover:text-brand-light border border-surface-border'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  onClick={reset}
                  className="w-full rounded-lg border border-surface-border py-2 text-xs font-medium text-gray-500 transition-colors hover:border-brand/30 hover:text-white"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile filters row */}
            <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
              <select
                value={filters.sort}
                onChange={(e) => setFilter('sort', e.target.value)}
                className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-white outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={filters.format}
                onChange={(e) => setFilter('format', e.target.value)}
                className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-white outline-none"
              >
                <option value="">Formato</option>
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <select
                value={filters.year}
                onChange={(e) => setFilter('year', e.target.value)}
                className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-white outline-none"
              >
                <option value="">Año</option>
                {YEARS.slice(0, 30).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {hasActiveFilters && (
                <button onClick={reset} className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-white">
                  Limpiar
                </button>
              )}
            </div>

            {/* Result count */}
            {!loading && pageInfo && (
              <p className="mb-4 text-xs text-gray-500">
                {pageInfo.total.toLocaleString('es')} resultados
                {pageInfo.lastPage > 1 && ` — página ${pageInfo.currentPage} de ${pageInfo.lastPage}`}
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Grid */}
            <AnimeGrid items={items} loading={loading} />

            {/* Pagination */}
            {!loading && pageInfo && pageInfo.lastPage > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-surface-border px-4 py-2 text-sm text-gray-400 transition-colors hover:border-brand/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-gray-500">
                  {page} / {pageInfo.lastPage}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pageInfo.hasNextPage}
                  className="rounded-lg border border-surface-border px-4 py-2 text-sm text-gray-400 transition-colors hover:border-brand/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import ListAddButton from '@/components/anime/ListAddButton';
import { animeApi, type AnimeDetail } from '@/lib/api-client';
import {
  cleanDescription,
  FORMAT_LABELS,
  STATUS_LABELS,
  SEASON_LABELS,
  formatFuzzyDate,
  formatAiringTime,
  getCoverImage,
  getAnimeTitle,
  scoreColor,
  scoreBg,
} from '@/lib/anime-utils';

const SITE_ICONS: Record<string, string> = {
  Crunchyroll: '🟠',
  Funimation: '🟣',
  Netflix: '🔴',
  'Amazon Prime Video': '🔵',
  HiDive: '🟡',
};

export default function AnimeDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await animeApi.getById(Number(id));
        if (!cancelled) setAnime(data);
      } catch {
        if (!cancelled) setError('No se pudo cargar este anime. Puede que el ID no exista.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <LoadingSkeleton />;

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40 text-center px-4">
          <p className="text-5xl mb-4">😵</p>
          <p className="text-gray-400">{error || 'Anime no encontrado.'}</p>
          <Link href="/explore" className="mt-6 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-light">
            Volver al explorador
          </Link>
        </div>
      </div>
    );
  }

  const title = getAnimeTitle(anime.title);
  const cover = getCoverImage(anime.coverImage);
  const description = cleanDescription(anime.description);
  const mainStudio = anime.studios.nodes[0];
  const uniqueStreamingSites = Array.from(
    new Map(anime.streamingEpisodes.map((e) => [e.site, e])).values()
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      {/* Banner */}
      <div className="relative h-56 md:h-72 lg:h-80 w-full overflow-hidden bg-surface-elevated">
        {anime.bannerImage ? (
          <Image
            src={anime.bannerImage}
            alt={title}
            fill
            className="object-cover object-top"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark/60 via-surface to-surface" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row -mt-24 md:-mt-32 relative z-10">
          {/* Cover */}
          <div className="shrink-0 w-40 md:w-52">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border-2 border-surface-border shadow-2xl">
              <Image
                src={cover}
                alt={title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2 md:pt-28">
            {/* Title */}
            <h1 className="text-2xl font-extrabold text-white md:text-3xl lg:text-4xl leading-tight">
              {title}
            </h1>
            {anime.title.native && (
              <p className="mt-1 text-sm text-gray-500">{anime.title.native}</p>
            )}

            {/* Meta badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {anime.averageScore !== null && (
                <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold ${scoreBg(anime.averageScore)} ${scoreColor(anime.averageScore)}`}>
                  ★ {(anime.averageScore / 10).toFixed(1)}
                </span>
              )}
              {anime.format && (
                <span className="rounded-lg bg-surface-elevated border border-surface-border px-2.5 py-1 text-xs font-semibold text-gray-300">
                  {FORMAT_LABELS[anime.format] ?? anime.format}
                </span>
              )}
              {anime.status && (
                <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  anime.status === 'RELEASING'
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-surface-elevated border border-surface-border text-gray-400'
                }`}>
                  {STATUS_LABELS[anime.status] ?? anime.status}
                </span>
              )}
              {anime.season && anime.seasonYear && (
                <span className="rounded-lg bg-surface-elevated border border-surface-border px-2.5 py-1 text-xs font-semibold text-gray-300">
                  {SEASON_LABELS[anime.season] ?? anime.season} {anime.seasonYear}
                </span>
              )}
              {anime.episodes && (
                <span className="rounded-lg bg-surface-elevated border border-surface-border px-2.5 py-1 text-xs font-semibold text-gray-300">
                  {anime.episodes} eps
                </span>
              )}
              {anime.duration && (
                <span className="rounded-lg bg-surface-elevated border border-surface-border px-2.5 py-1 text-xs font-semibold text-gray-300">
                  {anime.duration} min
                </span>
              )}
            </div>

            {/* Next airing */}
            {anime.nextAiringEpisode && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand/10 border border-brand/20 px-3 py-1.5 text-xs font-medium text-brand-light">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-light animate-pulse" />
                Ep {anime.nextAiringEpisode.episode} — {formatAiringTime(anime.nextAiringEpisode.airingAt)}
              </div>
            )}

            {/* Genres */}
            {anime.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {anime.genres.map((g) => (
                  <Link
                    key={g}
                    href={`/explore?genre=${encodeURIComponent(g)}`}
                    className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-medium text-brand-light hover:bg-brand/20 transition-colors"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            )}

            {/* Add to list */}
            <div className="mt-5">
              <ListAddButton
                animeId={anime.id}
                totalEpisodes={anime.episodes}
              />
            </div>
          </div>
        </div>

        {/* Main body */}
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {/* Left column: synopsis + characters + streaming + relations */}
          <div className="md:col-span-2 space-y-8">
            {/* Synopsis */}
            {description && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-white">Sinopsis</h2>
                <p className="text-sm leading-relaxed text-gray-400">{description}</p>
              </section>
            )}

            {/* Characters */}
            {anime.characters.nodes.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-white">Personajes</h2>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-8">
                  {anime.characters.nodes.map((c) => (
                    <div key={c.id} className="text-center">
                      <div className="relative mx-auto mb-1.5 h-14 w-14 overflow-hidden rounded-full border border-surface-border bg-surface-elevated">
                        {c.image.medium ? (
                          <Image src={c.image.medium} alt={c.name.full} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-600 text-lg">?</div>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-gray-400 leading-tight line-clamp-2">{c.name.full}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Streaming */}
            {uniqueStreamingSites.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-white">Plataformas de streaming</h2>
                <div className="flex flex-wrap gap-3">
                  {uniqueStreamingSites.map((ep) => (
                    <a
                      key={ep.site}
                      href={ep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-brand/40 hover:bg-brand/10"
                    >
                      <span>{SITE_ICONS[ep.site] ?? '▶'}</span>
                      {ep.site}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Relations */}
            {anime.relations.nodes.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-white">Relacionados</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {anime.relations.nodes.slice(0, 8).map((r) => {
                    const relTitle = getAnimeTitle(r.title);
                    const relCover = getCoverImage(r.coverImage);
                    return (
                      <Link key={r.id} href={`/anime/${r.id}`} className="group flex gap-2 rounded-xl border border-surface-border bg-surface-elevated p-2 hover:border-brand/30 transition-colors">
                        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg">
                          <Image src={relCover} alt={relTitle} fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-light">{r.type}</p>
                          <p className="mt-0.5 text-xs font-medium text-white line-clamp-2 leading-tight">{relTitle}</p>
                          {r.format && (
                            <p className="mt-0.5 text-[9px] text-gray-500">{FORMAT_LABELS[r.format] ?? r.format}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Right column: stats */}
          <aside className="space-y-6">
            {/* Stats card */}
            <div className="rounded-2xl border border-surface-border bg-surface-elevated p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Información</h3>

              {[
                { label: 'Estudio', value: mainStudio?.name },
                { label: 'Fuente', value: anime.source?.replace(/_/g, ' ') },
                { label: 'Emisión', value: formatFuzzyDate(anime.startDate) },
                { label: 'Fin', value: formatFuzzyDate(anime.endDate) },
                { label: 'Episodios', value: anime.episodes ? String(anime.episodes) : undefined },
                { label: 'Duración', value: anime.duration ? `${anime.duration} min` : undefined },
                {
                  label: 'Popularidad',
                  value: anime.popularity ? `#${anime.popularity.toLocaleString('es')}` : undefined,
                },
                {
                  label: 'Puntuación media',
                  value: anime.meanScore ? `${anime.meanScore}/100` : undefined,
                },
              ]
                .filter((s) => s.value)
                .map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="mt-0.5 text-sm text-white">{value}</p>
                  </div>
                ))}
            </div>

            {/* Top tags */}
            {anime.tags.filter((t) => !t.isMediaSpoiler).length > 0 && (
              <div className="rounded-2xl border border-surface-border bg-surface-elevated p-5">
                <h3 className="mb-3 text-sm font-bold text-white uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {anime.tags
                    .filter((t) => !t.isMediaSpoiler)
                    .slice(0, 12)
                    .map((t) => (
                      <span
                        key={t.name}
                        className="rounded-full bg-surface border border-surface-border px-2.5 py-0.5 text-[10px] font-medium text-gray-400"
                        title={`${t.rank}%`}
                      >
                        {t.name}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Rankings */}
            {anime.rankings.filter((r) => r.allTime).slice(0, 2).map((r) => (
              <div key={`${r.type}-${r.context}`} className="rounded-2xl border border-surface-border bg-surface-elevated p-4 flex items-center gap-3">
                <span className="text-2xl font-extrabold text-gradient">#{r.rank}</span>
                <span className="text-xs text-gray-400">{r.context}</span>
              </div>
            ))}

            {/* Trailer */}
            {anime.trailer?.site === 'youtube' && (
              <a
                href={`https://www.youtube.com/watch?v=${anime.trailer.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
              >
                ▶ Ver tráiler en YouTube
              </a>
            )}
          </aside>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}

function LoadingSkeleton(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="h-56 md:h-72 bg-surface-elevated animate-pulse" />
      <div className="mx-auto max-w-7xl px-4 md:px-8 -mt-24 relative z-10">
        <div className="flex gap-8">
          <div className="w-40 md:w-52 aspect-[2/3] rounded-xl bg-surface-elevated animate-pulse shrink-0" />
          <div className="flex-1 pt-28 space-y-3">
            <div className="h-8 w-2/3 rounded-lg bg-surface-elevated animate-pulse" />
            <div className="h-4 w-1/4 rounded bg-surface-elevated animate-pulse" />
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 w-16 rounded-lg bg-surface-elevated animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { AnimeListItem } from '@/lib/api-client';
import {
  FORMAT_LABELS,
  getCoverImage,
  getAnimeTitle,
  scoreColor,
  scoreBg,
} from '@/lib/anime-utils';

interface Props {
  anime: AnimeListItem;
}

export default function AnimeCard({ anime }: Props): React.JSX.Element {
  const title = getAnimeTitle(anime.title);
  const cover = getCoverImage(anime.coverImage);
  const format = anime.format ? (FORMAT_LABELS[anime.format] ?? anime.format) : null;

  return (
    <Link href={`/anime/${anime.id}`} className="group relative block">
      {/* Card container — 2:3 aspect ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface-elevated border border-surface-border transition-all duration-300 group-hover:border-brand/40 group-hover:shadow-xl group-hover:shadow-brand/10 group-hover:scale-[1.02]">
        {/* Cover image */}
        <Image
          src={cover}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={cover.startsWith('/')}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Score badge */}
        {anime.averageScore !== null && (
          <div
            className={`absolute top-2 right-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold backdrop-blur-sm ${scoreBg(anime.averageScore)} ${scoreColor(anime.averageScore)}`}
          >
            ★ {(anime.averageScore / 10).toFixed(1)}
          </div>
        )}

        {/* Format badge */}
        {format && (
          <div className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-300 backdrop-blur-sm">
            {format}
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="line-clamp-2 text-xs font-semibold leading-tight text-white drop-shadow">
            {title}
          </p>

          {/* Hover genres */}
          {anime.genres.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {anime.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-brand/30 px-1.5 py-0.5 text-[9px] font-medium text-brand-light"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

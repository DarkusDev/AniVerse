import type { AnimeListItem } from '@/lib/api-client';
import AnimeCard from './AnimeCard';
import AnimeCardSkeleton from './AnimeCardSkeleton';

interface Props {
  items: AnimeListItem[];
  loading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
}

export default function AnimeGrid({
  items,
  loading = false,
  skeletonCount = 20,
  emptyMessage = 'No se encontraron resultados.',
}: Props): React.JSX.Element {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <AnimeCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((anime) => (
        <AnimeCard key={anime.id} anime={anime} />
      ))}
    </div>
  );
}

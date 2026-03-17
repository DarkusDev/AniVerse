import type { AnimeListItem } from './api-client';

export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
  'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
] as const;

export const FORMATS = [
  { value: 'TV', label: 'Serie TV' },
  { value: 'TV_SHORT', label: 'TV Corta' },
  { value: 'MOVIE', label: 'Película' },
  { value: 'SPECIAL', label: 'Especial' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'MUSIC', label: 'Musical' },
] as const;

export const FORMAT_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Corta',
  MOVIE: 'Película',
  SPECIAL: 'Especial',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Musical',
};

export const STATUS_LABELS: Record<string, string> = {
  FINISHED: 'Finalizado',
  RELEASING: 'En emisión',
  NOT_YET_RELEASED: 'Próximamente',
  CANCELLED: 'Cancelado',
  HIATUS: 'En pausa',
};

export const SEASON_LABELS: Record<string, string> = {
  WINTER: 'Invierno',
  SPRING: 'Primavera',
  SUMMER: 'Verano',
  FALL: 'Otoño',
};

export const SORT_OPTIONS = [
  { value: 'POPULARITY', label: 'Popularidad' },
  { value: 'SCORE', label: 'Puntuación' },
  { value: 'TRENDING', label: 'Tendencia' },
  { value: 'NEWEST', label: 'Más reciente' },
  { value: 'TITLE', label: 'Título' },
] as const;

export function getAnimeTitle(title: AnimeListItem['title']): string {
  return title.english ?? title.romaji ?? title.native ?? 'Sin título';
}

export function getCoverImage(coverImage: AnimeListItem['coverImage']): string {
  return (
    coverImage.extraLarge ??
    coverImage.large ??
    coverImage.medium ??
    '/placeholder-cover.jpg'
  );
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray-500';
  if (score >= 75) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

export function scoreBg(score: number | null): string {
  if (score === null) return 'bg-gray-800/80';
  if (score >= 75) return 'bg-green-500/20 border border-green-500/30';
  if (score >= 60) return 'bg-yellow-500/20 border border-yellow-500/30';
  return 'bg-red-500/20 border border-red-500/30';
}

export function cleanDescription(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatFuzzyDate(date: { year: number | null; month: number | null; day: number | null } | null): string {
  if (!date?.year) return '—';
  const parts: string[] = [String(date.year)];
  if (date.month) {
    const month = new Date(0, date.month - 1).toLocaleString('es', { month: 'short' });
    parts.unshift(month);
    if (date.day) parts.unshift(String(date.day));
  }
  return parts.join(' ');
}

export function formatAiringTime(airingAt: number): string {
  const date = new Date(airingAt * 1000);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `en ${days}d ${hours}h`;
  if (hours > 0) return `en ${hours}h`;
  return 'pronto';
}

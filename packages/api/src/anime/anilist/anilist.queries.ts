// Campos compartidos entre listados y detalle
const MEDIA_BASE_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large medium }
  bannerImage
  genres
  averageScore
  popularity
  episodes
  status
  season
  seasonYear
  format
  description(asHtml: false)
`;

export const SEARCH_ANIME = `
  query SearchAnime(
    $search: String
    $genres: [String]
    $formats: [MediaFormat]
    $seasonYear: Int
    $sort: [MediaSort]
    $page: Int
    $perPage: Int
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(
        search: $search
        genre_in: $genres
        format_in: $formats
        seasonYear: $seasonYear
        sort: $sort
        type: ANIME
        isAdult: false
      ) {
        ${MEDIA_BASE_FIELDS}
      }
    }
  }
`;

export const GET_TRENDING = `
  query GetTrending($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
        ${MEDIA_BASE_FIELDS}
      }
    }
  }
`;

export const GET_SEASONAL = `
  query GetSeasonal(
    $season: MediaSeason
    $seasonYear: Int
    $page: Int
    $perPage: Int
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(
        season: $season
        seasonYear: $seasonYear
        sort: POPULARITY_DESC
        type: ANIME
        isAdult: false
      ) {
        ${MEDIA_BASE_FIELDS}
      }
    }
  }
`;

export const GET_ANIME_DETAIL = `
  query GetAnimeDetail($id: Int) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_BASE_FIELDS}
      meanScore
      trending
      duration
      source
      tags { name rank isMediaSpoiler }
      studios(isMain: true) { nodes { id name } }
      characters(sort: [ROLE, RELEVANCE], perPage: 8) {
        nodes { id name { full } image { medium } }
      }
      relations {
        nodes {
          id type
          title { romaji english }
          coverImage { medium }
          format status
        }
      }
      streamingEpisodes { title thumbnail url site }
      trailer { id site }
      startDate { year month day }
      endDate   { year month day }
      nextAiringEpisode { airingAt episode }
      rankings { rank type context allTime season year }
    }
  }
`;

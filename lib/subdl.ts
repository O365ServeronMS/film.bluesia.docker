const SUBDL_API_KEY = process.env.SUBDL_API_KEY || 'your_api_key_here';
const SUBDL_BASE_URL = 'https://api.subdl.com/api/v1';

export interface SubdlSubtitle {
  release_name: string;
  name: string;
  lang: string;
  url: string; // The URL to download the subtitle zip file
}

export interface SubdlResponse {
  status: boolean;
  results: {
    sd_id: string;
    type: string;
    name: string;
    imdb_id: string;
    tmdb_id: string;
    first_air_date: string;
    subtitles: {
      id: string;
      language: string;
      release_name: string;
      url: string;
    }[];
  }[];
}

export async function getSubtitles(imdbId: string, languages: string = 'vi,en'): Promise<SubdlSubtitle[]> {
  try {
    const res = await fetch(`${SUBDL_BASE_URL}/subtitles?api_key=${SUBDL_API_KEY}&imdb_id=${imdbId}&languages=${languages}`);
    const data: SubdlResponse = await res.json();
    
    if (data.status && data.results && data.results.length > 0) {
      const allSubtitles: SubdlSubtitle[] = [];
      data.results.forEach(result => {
        if (result.subtitles) {
          result.subtitles.forEach(sub => {
            allSubtitles.push({
              release_name: sub.release_name,
              name: result.name,
              lang: sub.language,
              url: `https://dl.subdl.com${sub.url}` // Download URL usually requires base domain
            });
          });
        }
      });
      return allSubtitles;
    }
    return [];
  } catch (error) {
    console.error('[Subdl API] Error:', error);
    return [];
  }
}

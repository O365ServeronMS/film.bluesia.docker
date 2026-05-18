const APB_BASE_URL = 'https://apibay.org';

export interface PirateBayResult {
  id: string;
  name: string;
  info_hash: string;
  leechers: string;
  seeders: string;
  num_files: string;
  size: string;
  username: string;
  added: string;
  status: string;
  category: string;
  imdb: string;
}

export async function searchPirateBay(query: string): Promise<PirateBayResult[]> {
  try {
    const res = await fetch(`${APB_BASE_URL}/q.php?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    // apibay returns a single object { id: '0', name: 'No results returned', ... } if nothing is found
    if (data && data.length > 0 && data[0].id !== '0') {
      return data;
    }
    return [];
  } catch (error) {
    console.error('[PirateBay API] Search Error:', error);
    return [];
  }
}

export function generatePirateBayMagnet(hash: string, name: string) {
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2F47.ip-51-68-199.eu%3A6969%2Fannounce`;
}

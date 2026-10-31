// Globaler In-Memory Cache für die aktuelle Kickbase-Version (wird 1x pro Stunde aktualisiert)
let cachedUserAgent = 'Kickster/4.10.0/9245 (iPhone; iOS 26.6; Scale/3.00)';
let lastVersionFetch = 0;

async function getLatestUserAgent() {
  const now = Date.now();
  // Nur einmal pro Stunde (3.600.000 ms) bei Apple anfragen
  if (now - lastVersionFetch > 3600000) {
    try {
      const res = await fetch('https://itunes.apple.com/lookup?id=678241305&country=de');
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].version) {
        const latestVersion = data.results[0].version;
        cachedUserAgent = `Kickster/${latestVersion}/9245 (iPhone; iOS 26.6; Scale/3.00)`;
        lastVersionFetch = now;
      }
    } catch (e) {
      console.error('Fehler beim Abrufen der neusten Kickbase-Version:', e);
    }
  }
  return cachedUserAgent;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight (OPTIONS) mit 24h Max-Age cachen
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, KB-Region, KB-Store-Region',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const cache = caches.default;
    const authHeader = request.headers.get('Authorization') || '';
    
    // Eindeutigen Cache-Key pro Nutzer/Token erzeugen (verhindert Datenmischung zwischen Ligen)
    const uniqueCacheUrl = new URL(request.url);
    if (authHeader) {
      uniqueCacheUrl.searchParams.set('__auth_token', authHeader.slice(-15));
    }
    const cacheKey = new Request(uniqueCacheUrl.toString(), request);

    // 2. GET-Anfragen aus dem Cache beantworten (falls vorhanden)
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const responseFromCache = new Response(cachedResponse.body, cachedResponse);
        responseFromCache.headers.set('X-Worker-Cache', 'HIT');
        return responseFromCache;
      }
    }

    // 3. Aktuelle App-Version für den User-Agent ermitteln
    const dynamicUserAgent = await getLatestUserAgent();

    // 4. Request an die Kickbase API vorbereiten
    const targetUrl = `https://api.kickbase.com${url.pathname}${url.search}`;
    const headers = new Headers();
    headers.set('User-Agent', dynamicUserAgent);
    headers.set('KB-Region', 'DE');
    headers.set('KB-Store-Region', 'DEU');
    headers.set('Accept', 'application/json');

    if (authHeader) headers.set('Authorization', authHeader);

    const contentType = request.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);

    const fetchOptions = {
      method: request.method,
      headers: headers,
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      fetchOptions.body = request.body;
    }

    try {
      // 5. Anfrage an Kickbase ausführen
      const response = await fetch(targetUrl, fetchOptions);
      const newResponse = new Response(response.body, response);
      
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, KB-Region, KB-Store-Region');

      // 6. GET-Antworten im Cache speichern
      if (request.method === 'GET' && response.status === 200) {
        newResponse.headers.set('X-Worker-Cache', 'MISS');
        let ttl = 0;

        // Globale Spieler-Daten & Marktwerte (15 Minuten)
        if (url.pathname.includes('/marketValue/') || url.pathname.includes('/transferHistory')) {
          ttl = 900; 
        } 
        // Liga-spezifische Daten wie Kader & Markt (2 Minuten)
        else if (url.pathname.includes('/leagues/')) {
          ttl = 120; 
        }

        if (ttl > 0) {
          newResponse.headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
          ctx.waitUntil(cache.put(cacheKey, newResponse.clone()));
        }
      }

      // 7. Automatische Cache-Invalidierung bei Schreib-Aktionen
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && response.status >= 200 && response.status < 300) {
        ctx.waitUntil((async () => {
          const leagueMatch = url.pathname.match(/\/leagues\/(\d+)/);
          if (leagueMatch && leagueMatch[1]) {
            const leagueId = leagueMatch[1];
            
            const pathsToInvalidate = [
              `/v4/leagues/${leagueId}/market`,
              `/v4/leagues/${leagueId}/squad`,
              `/v4/leagues/${leagueId}/overview`,
              `/v4/leagues/selection`
            ];

            for (const path of pathsToInvalidate) {
              const invUrl = new URL(`https://${url.hostname}${path}`);
              if (authHeader) {
                invUrl.searchParams.set('__auth_token', authHeader.slice(-15));
              }
              await cache.delete(new Request(invUrl.toString()));
            }
          }
        })());
      }

      return newResponse;
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  },
};
/**
 * Vercel Serverless Function - DoesTheDogDie Proxy
 * Endpoint: /api/trigger-warnings
 */

export default async function handler(req, res) {
    console.log('[API] Request received:', req.method, req.url);
    console.log('[API] Query params:', JSON.stringify(req.query));
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        console.log('[API] Preflight request handled');
        return res.status(200).end();
    }

    const { action, title, imdbId, mediaId } = req.query;

    // Check for API key
    const DDD_API_KEY = process.env.DTD_API_KEY || 
                        process.env.VITE_DTD_API_KEY || 
                        process.env.DOES_THE_DOG_DIE_API_KEY;
    
    if (!DDD_API_KEY) {
        console.error('[API] ❌ DoesTheDogDie API key not configured');
        console.error('[API] Available env vars:', Object.keys(process.env).filter(k => k.includes('API')));
        return res.status(200).json({ 
            items: [],
            warnings: [],
            error: 'API key not configured'
        });
    }

    console.log('[API] ✅ API key found');

    const DDD_BASE_URL = 'https://www.doesthedogdie.com';

    try {
        let url;
        
        // Route based on action
        switch (action) {
            case 'search-title':
                if (!title) {
                    console.error('[API] ❌ Title parameter missing');
                    return res.status(400).json({ 
                        error: 'Title required',
                        warnings: []
                    });
                }
                url = `${DDD_BASE_URL}/dddsearch?q=${encodeURIComponent(title)}`;
                break;
                
            case 'search-imdb':
                if (!imdbId) {
                    console.error('[API] ❌ IMDB ID parameter missing');
                    return res.status(400).json({ 
                        error: 'IMDB ID required',
                        warnings: []
                    });
                }
                url = `${DDD_BASE_URL}/dddsearch?imdb=${imdbId}`;
                break;
                
            case 'get-warnings':
                if (!mediaId) {
                    console.error('[API] ❌ Media ID parameter missing');
                    return res.status(400).json({ 
                        error: 'Media ID required',
                        warnings: []
                    });
                }
                url = `${DDD_BASE_URL}/media/${mediaId}`;
                break;
                
            default:
                console.error('[API] ❌ Invalid action:', action);
                return res.status(400).json({ 
                    error: 'Invalid action',
                    validActions: ['search-title', 'search-imdb', 'get-warnings'],
                    warnings: []
                });
        }

        console.log('[API] 🔄 Proxying request to:', url);

        // Make request to DoesTheDogDie API
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': DDD_API_KEY,
                'User-Agent': 'MoviEase/1.0'
            },
            signal: AbortSignal.timeout(10000)
        });

        console.log('[API] Response status:', response.status, response.statusText);

        if (!response.ok) {
            console.error('[API] ❌ DDD API error:', response.status, response.statusText);
            
            const errorText = await response.text();
            console.error('[API] Error response:', errorText.substring(0, 200));
            
            return res.status(200).json({ 
                items: [],
                warnings: [],
                error: `DoesTheDogDie API error: ${response.status}`,
                status: response.status
            });
        }

        const contentType = response.headers.get('content-type');
        console.log('[API] Response content-type:', contentType);

        const data = await response.json();
        
        console.log('[API] ✅ Success:', action);
        console.log('[API] Response preview:', JSON.stringify(data).substring(0, 150) + '...');
        
        // Ensure warnings array exists
        if (!data.warnings) {
            data.warnings = [];
        }
        
        return res.status(200).json(data);

    } catch (error) {
        console.error('[API] ❌ Proxy error:', error.message);
        console.error('[API] Error stack:', error.stack);
        
        return res.status(200).json({ 
            items: [],
            warnings: [],
            error: 'Proxy failed',
            message: error.message
        });
    }
}

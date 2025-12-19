/**
 * Vercel Serverless Function - DoesTheDogDie Proxy
 * ✅ FIXED: Parameter names match frontend calls
 * ✅ FIXED: Proper JSON response format
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, title, imdbId, mediaId } = req.query;

    // Check for API key
    const DDD_API_KEY = process.env.DTD_API_KEY || 
                        process.env.VITE_DTD_API_KEY || 
                        process.env.DOES_THE_DOG_DIE_API_KEY;
    
    if (!DDD_API_KEY) {
        console.error('[API] DoesTheDogDie API key not configured');
        return res.status(200).json({ 
            items: [],
            warnings: [],
            error: 'API key not configured'
        });
    }

    const DDD_BASE_URL = 'https://www.doesthedogdie.com';

    try {
        let url;
        
        // Route based on action
        switch (action) {
            case 'search-title':
                if (!title) {
                    return res.status(400).json({ 
                        error: 'Title required',
                        warnings: []
                    });
                }
                url = `${DDD_BASE_URL}/dddsearch?q=${encodeURIComponent(title)}`;
                break;
                
            case 'search-imdb':
                if (!imdbId) {
                    return res.status(400).json({ 
                        error: 'IMDB ID required',
                        warnings: []
                    });
                }
                url = `${DDD_BASE_URL}/dddsearch?imdb=${imdbId}`;
                break;
                
            case 'get-warnings':
                if (!mediaId) {
                    return res.status(400).json({ 
                        error: 'Media ID required',
                        warnings: []
                    });
                }
                url = `${DDD_BASE_URL}/media/${mediaId}`;
                break;
                
            default:
                return res.status(400).json({ 
                    error: 'Invalid action',
                    validActions: ['search-title', 'search-imdb', 'get-warnings'],
                    warnings: []
                });
        }

        console.log('[API] Proxying request to:', url);

        // Make request to DoesTheDogDie API
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': DDD_API_KEY,
                'User-Agent': 'MoviEase/1.0'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            console.error('[API] DDD API error:', response.status, response.statusText);
            return res.status(200).json({ 
                items: [],
                warnings: [],
                error: `DoesTheDogDie API error: ${response.status}`,
                status: response.status
            });
        }

        const data = await response.json();
        
        console.log('[API] ✅ Success:', action, '- Response:', JSON.stringify(data).substring(0, 100));
        
        // Ensure warnings array exists
        if (!data.warnings) {
            data.warnings = [];
        }
        
        return res.status(200).json(data);

    } catch (error) {
        console.error('[API] Proxy error:', error.message);
        return res.status(200).json({ 
            items: [],
            warnings: [],
            error: 'Proxy failed',
            message: error.message
        });
    }
}

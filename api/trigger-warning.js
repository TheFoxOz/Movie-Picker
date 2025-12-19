/**
 * Vercel Serverless Function - DoesTheDogDie Proxy
 * ✅ Bypasses CORS by proxying requests from backend
 * ✅ FIXED: Proper error handling and API key detection
 * ✅ FIXED: Returns empty warnings array on errors (prevents app crashes)
 * 
 * Deploy this to /api/trigger-warnings.js in your Vercel project
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, title, imdbId, dddId } = req.query;

    // ✅ FIXED: Check multiple environment variable names
    const DDD_API_KEY = process.env.DTD_API_KEY || 
                        process.env.VITE_DTD_API_KEY || 
                        process.env.DOES_THE_DOG_DIE_API_KEY;
    
    if (!DDD_API_KEY) {
        console.error('[API] DoesTheDogDie API key not configured');
        // ✅ Return empty warnings instead of error (prevents app crashes)
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
                if (!dddId) {
                    return res.status(400).json({ 
                        error: 'DDD ID required',
                        warnings: []
                    });
                }
                url = `${DDD_BASE_URL}/media/${dddId}`;
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
            // ✅ Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            console.error('[API] DDD API error:', response.status, response.statusText);
            
            // ✅ Return empty warnings instead of error
            return res.status(200).json({ 
                items: [],
                warnings: [],
                error: `DoesTheDogDie API error: ${response.status}`,
                status: response.status
            });
        }

        const data = await response.json();
        
        console.log('[API] ✅ Success:', action, '- Items:', data?.items?.length || 0);
        
        // ✅ Ensure warnings array exists
        if (!data.warnings) {
            data.warnings = [];
        }
        
        // Return the data
        return res.status(200).json(data);

    } catch (error) {
        console.error('[API] Proxy error:', error.message);
        
        // ✅ Return empty warnings instead of error (graceful degradation)
        return res.status(200).json({ 
            items: [],
            warnings: [],
            error: 'Proxy failed',
            message: error.message
        });
    }
}

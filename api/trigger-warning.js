/**
 * Vercel Serverless Function - DoesTheDogDie Proxy
 * ✅ Bypasses CORS by proxying requests from backend
 * 
 * Deploy this to /api/trigger-warnings.js in your Vercel project
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action, title, imdbId, dddId } = req.query;

    // Get API key from environment variable
    const DDD_API_KEY = process.env.DDD_API_KEY || process.env.DTD_API_KEY;
    
    if (!DDD_API_KEY) {
        console.error('[API] DoesTheDogDie API key not configured');
        return res.status(500).json({ error: 'API key not configured' });
    }

    const DDD_BASE_URL = 'https://www.doesthedogdie.com';

    try {
        let url;
        
        // Route based on action
        switch (action) {
            case 'search-title':
                if (!title) {
                    return res.status(400).json({ error: 'Title required' });
                }
                url = `${DDD_BASE_URL}/dddsearch?q=${encodeURIComponent(title)}`;
                break;
                
            case 'search-imdb':
                if (!imdbId) {
                    return res.status(400).json({ error: 'IMDB ID required' });
                }
                url = `${DDD_BASE_URL}/dddsearch?imdb=${imdbId}`;
                break;
                
            case 'get-warnings':
                if (!dddId) {
                    return res.status(400).json({ error: 'DDD ID required' });
                }
                url = `${DDD_BASE_URL}/media/${dddId}`;
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        console.log('[API] Proxying request to:', url);

        // Make request to DoesTheDogDie API
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': DDD_API_KEY,
                'User-Agent': 'MoviePicker/1.0'
            }
        });

        if (!response.ok) {
            console.error('[API] DDD API error:', response.status);
            return res.status(response.status).json({ 
                error: 'DoesTheDogDie API error',
                status: response.status 
            });
        }

        const data = await response.json();
        
        console.log('[API] ✅ Success:', action);
        
        // Return the data
        return res.status(200).json(data);

    } catch (error) {
        console.error('[API] Proxy error:', error);
        return res.status(500).json({ 
            error: 'Proxy failed',
            message: error.message 
        });
    }
}

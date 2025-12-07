/**
 * DoesTheDogDie API Proxy
 * Vercel Serverless Function
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { movieId } = req.query;
    
    if (!movieId) {
        return res.status(400).json({ error: 'Missing movieId' });
    }
    
    const apiKey = process.env.DDD_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }
    
    try {
        const response = await fetch(
            `https://www.doesthedogdie.com/dddsearch?q=${movieId}`,
            {
                headers: {
                    'X-API-KEY': apiKey,
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`DDD API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        res.setHeader('Cache-Control', 's-maxage=86400');
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('[DDD Proxy]', error);
        return res.status(500).json({ error: 'Failed to fetch warnings' });
    }
}

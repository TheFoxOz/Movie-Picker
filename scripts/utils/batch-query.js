/**
 * Batch Query Helper - Week 2 Performance Optimization
 * ✅ Batch Firestore queries efficiently
 * ✅ Parallel query execution
 * ✅ Error handling per query
 * ✅ Result aggregation
 */

import { getDocs, query, where, collection, documentId } from 'firebase/firestore';

/**
 * Batch get documents by IDs
 * Firestore limits "in" queries to 30 items, so we batch automatically
 */
export async function batchGetDocuments(db, collectionName, ids, options = {}) {
    if (!ids || ids.length === 0) {
        return [];
    }

    const BATCH_SIZE = 30; // Firestore's "in" query limit
    const batches = [];

    // Split into batches of 30
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        batches.push(ids.slice(i, i + BATCH_SIZE));
    }

    console.log(`[BatchQuery] Fetching ${ids.length} documents in ${batches.length} batch(es)`);

    try {
        // Execute all batches in parallel
        const batchPromises = batches.map(async (batchIds) => {
            const q = query(
                collection(db, collectionName),
                where(documentId(), 'in', batchIds)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        });

        const results = await Promise.all(batchPromises);
        const allDocs = results.flat();

        console.log(`[BatchQuery] Successfully fetched ${allDocs.length}/${ids.length} documents`);
        return allDocs;

    } catch (error) {
        console.error('[BatchQuery] Error fetching documents:', error);
        if (options.throwOnError) {
            throw error;
        }
        return [];
    }
}

/**
 * Execute multiple queries in parallel with error handling
 */
export async function parallelQueries(queries, options = {}) {
    const { 
        maxConcurrent = 5,          // Max concurrent queries
        continueOnError = true,     // Continue if one query fails
        timeout = 10000             // Timeout per query (ms)
    } = options;

    console.log(`[ParallelQuery] Executing ${queries.length} queries (max ${maxConcurrent} concurrent)`);

    const results = [];
    const errors = [];

    // Execute in batches to limit concurrency
    for (let i = 0; i < queries.length; i += maxConcurrent) {
        const batch = queries.slice(i, i + maxConcurrent);
        
        const batchResults = await Promise.allSettled(
            batch.map(async (queryFn, index) => {
                try {
                    // Add timeout
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Query timeout')), timeout)
                    );
                    
                    const result = await Promise.race([
                        queryFn(),
                        timeoutPromise
                    ]);
                    
                    return { success: true, data: result, index: i + index };
                } catch (error) {
                    return { success: false, error, index: i + index };
                }
            })
        );

        // Process batch results
        batchResults.forEach((result, batchIndex) => {
            const globalIndex = i + batchIndex;
            
            if (result.status === 'fulfilled' && result.value.success) {
                results[globalIndex] = result.value.data;
            } else {
                const error = result.status === 'rejected' ? result.reason : result.value.error;
                errors.push({ index: globalIndex, error });
                
                if (!continueOnError) {
                    throw error;
                }
                
                results[globalIndex] = null;
            }
        });
    }

    if (errors.length > 0) {
        console.warn(`[ParallelQuery] ${errors.length} queries failed:`, errors);
    }

    console.log(`[ParallelQuery] Completed: ${results.filter(r => r !== null).length}/${queries.length} successful`);

    return { results, errors };
}

/**
 * Batch write operations with automatic chunking
 * Firestore batch writes are limited to 500 operations
 */
export async function batchWrite(db, operations, options = {}) {
    const { writeBatch } = await import('firebase/firestore');
    
    const BATCH_SIZE = 500; // Firestore's batch write limit
    const batches = [];

    // Split into batches of 500
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
        batches.push(operations.slice(i, i + BATCH_SIZE));
    }

    console.log(`[BatchWrite] Writing ${operations.length} operations in ${batches.length} batch(es)`);

    try {
        const results = await Promise.all(
            batches.map(async (batchOps) => {
                const batch = writeBatch(db);
                
                batchOps.forEach(op => {
                    if (op.type === 'set') {
                        batch.set(op.ref, op.data, op.options || {});
                    } else if (op.type === 'update') {
                        batch.update(op.ref, op.data);
                    } else if (op.type === 'delete') {
                        batch.delete(op.ref);
                    }
                });

                return batch.commit();
            })
        );

        console.log(`[BatchWrite] Successfully committed ${batches.length} batch(es)`);
        return { success: true, batches: results.length };

    } catch (error) {
        console.error('[BatchWrite] Error writing batches:', error);
        throw error;
    }
}

/**
 * Retry failed queries with exponential backoff
 */
export async function retryQuery(queryFn, options = {}) {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await queryFn();
            
            if (attempt > 0) {
                console.log(`[RetryQuery] Succeeded on attempt ${attempt + 1}`);
            }
            
            return result;
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                console.error(`[RetryQuery] Failed after ${maxRetries + 1} attempts:`, error);
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                baseDelay * Math.pow(backoffMultiplier, attempt),
                maxDelay
            );

            console.warn(`[RetryQuery] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Debounce query execution to avoid rapid repeated calls
 */
export function debounceQuery(queryFn, delay = 300) {
    let timeoutId = null;
    let pendingResolvers = [];

    return function(...args) {
        return new Promise((resolve, reject) => {
            // Clear existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Add to pending resolvers
            pendingResolvers.push({ resolve, reject });

            // Set new timeout
            timeoutId = setTimeout(async () => {
                const resolvers = [...pendingResolvers];
                pendingResolvers = [];

                try {
                    const result = await queryFn(...args);
                    resolvers.forEach(r => r.resolve(result));
                } catch (error) {
                    resolvers.forEach(r => r.reject(error));
                }
            }, delay);
        });
    };
}

/**
 * Cache query results with automatic cache invalidation
 */
export function cacheQuery(queryFn, cacheKey, ttl = 300000) {
    const cache = new Map();

    return async function(...args) {
        const key = typeof cacheKey === 'function' ? cacheKey(...args) : cacheKey;
        const now = Date.now();

        // Check cache
        if (cache.has(key)) {
            const cached = cache.get(key);
            if (now - cached.timestamp < ttl) {
                console.log(`[CacheQuery] Cache hit: ${key}`);
                return cached.data;
            }
        }

        // Execute query
        console.log(`[CacheQuery] Cache miss: ${key}`);
        const result = await queryFn(...args);

        // Store in cache
        cache.set(key, {
            data: result,
            timestamp: now
        });

        return result;
    };
}

/**
 * Utility: Create optimized pagination query
 */
export function createPaginatedQuery(baseQuery, pageSize = 20) {
    let lastDoc = null;
    let hasMore = true;

    return {
        async next() {
            if (!hasMore) {
                return { docs: [], hasMore: false };
            }

            const { query: firestoreQuery, limit, startAfter } = await import('firebase/firestore');
            
            let q = firestoreQuery(baseQuery, limit(pageSize));
            
            if (lastDoc) {
                q = firestoreQuery(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            
            if (snapshot.empty || snapshot.docs.length < pageSize) {
                hasMore = false;
            }

            if (snapshot.docs.length > 0) {
                lastDoc = snapshot.docs[snapshot.docs.length - 1];
            }

            return {
                docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                hasMore
            };
        },
        
        reset() {
            lastDoc = null;
            hasMore = true;
        }
    };
}

export default {
    batchGetDocuments,
    parallelQueries,
    batchWrite,
    retryQuery,
    debounceQuery,
    cacheQuery,
    createPaginatedQuery
};

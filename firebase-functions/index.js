/**
 * Cloud Function: Secure Friend Code Lookup
 * ✅ CRITICAL FIX: Replaces client-side user collection scan
 * Deploy to Firebase Functions
 * 
 * Security benefits:
 * - No client access to full users collection
 * - Indexed query (1 read vs 1000+)
 * - Rate limiting possible
 * - Audit logging
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Find user by friend code
 * Call from client: firebase.functions().httpsCallable('findUserByFriendCode')
 */
exports.findUserByFriendCode = functions.https.onCall(async (data, context) => {
    // ✅ Security: Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to look up friend codes'
        );
    }

    const { friendCode } = data;

    // ✅ Validation
    if (!friendCode || typeof friendCode !== 'string') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Friend code must be a non-empty string'
        );
    }

    const normalizedCode = friendCode.toUpperCase().trim();

    // ✅ Validate format (assuming 6-digit alphanumeric)
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Friend code must be 6 alphanumeric characters'
        );
    }

    try {
        // ✅ INDEXED QUERY: Single read using friendCode index
        const usersRef = db.collection('users');
        const query = usersRef.where('friendCode', '==', normalizedCode).limit(1);
        const snapshot = await query.get();

        if (snapshot.empty) {
            return {
                found: false,
                message: 'No user found with this friend code'
            };
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // ✅ Security: Only return necessary data
        return {
            found: true,
            user: {
                uid: userDoc.id,
                displayName: userData.displayName || 'Anonymous',
                photoURL: userData.photoURL || null,
                friendCode: userData.friendCode
            }
        };

    } catch (error) {
        console.error('[findUserByFriendCode] Error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to look up friend code'
        );
    }
});

/**
 * Generate unique friend code for new user
 * Call during user creation
 */
exports.generateFriendCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const code = generateCode();
        
        // Check if code already exists
        const existing = await db.collection('users')
            .where('friendCode', '==', code)
            .limit(1)
            .get();

        if (existing.empty) {
            return { friendCode: code };
        }

        attempts++;
    }

    throw new functions.https.HttpsError(
        'internal',
        'Failed to generate unique friend code'
    );
});

/**
 * Add friend by code (with validation)
 * Safer than client-side implementation
 */
exports.addFriendByCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { friendCode } = data;
    const currentUserId = context.auth.uid;

    // Find friend
    const friendQuery = await db.collection('users')
        .where('friendCode', '==', friendCode.toUpperCase())
        .limit(1)
        .get();

    if (friendQuery.empty) {
        throw new functions.https.HttpsError('not-found', 'Friend code not found');
    }

    const friendDoc = friendQuery.docs[0];
    const friendId = friendDoc.id;

    // ✅ Prevent self-friending
    if (friendId === currentUserId) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Cannot add yourself as a friend'
        );
    }

    // ✅ Check if already friends
    const existingFriendship = await db.collection('friends')
        .where('user1', 'in', [currentUserId, friendId])
        .where('user2', 'in', [currentUserId, friendId])
        .limit(1)
        .get();

    if (!existingFriendship.empty) {
        throw new functions.https.HttpsError(
            'already-exists',
            'Already friends with this user'
        );
    }

    // ✅ Create bidirectional friendship
    const batch = db.batch();

    // Add to friends collection (single doc for relationship)
    const friendshipRef = db.collection('friends').doc();
    batch.set(friendshipRef, {
        user1: currentUserId,
        user2: friendId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
    });

    // Update both users' friend lists
    batch.update(db.collection('users').doc(currentUserId), {
        friends: admin.firestore.FieldValue.arrayUnion(friendId),
        friendCount: admin.firestore.FieldValue.increment(1)
    });

    batch.update(db.collection('users').doc(friendId), {
        friends: admin.firestore.FieldValue.arrayUnion(currentUserId),
        friendCount: admin.firestore.FieldValue.increment(1)
    });

    await batch.commit();

    return {
        success: true,
        friend: {
            uid: friendId,
            displayName: friendDoc.data().displayName
        }
    };
});

/**
 * FIRESTORE INDEXES NEEDED:
 * 
 * Create in Firebase Console → Firestore → Indexes:
 * 
 * Collection: users
 * Fields:
 *   - friendCode (Ascending)
 * 
 * This enables the efficient query in findUserByFriendCode
 */

/**
 * Firebase Cloud Functions — PartyBot secure backend layer.
 *
 * Functions:
 *   - generateCard:  Proxy to Gemini for AI card generation. Holds the key,
 *                    enforces rate limiting, and runs server-side moderation.
 *   - searchUsers:   Indexed prefix search over usernames (RTDB).
 *
 * Deploy:
 *   firebase deploy --only functions
 *
 * Set the Gemini key (one-time):
 *   firebase functions:secrets:set GEMINI_API_KEY
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-2.0-flash';
const FREE_DAILY_LIMIT = 5;

// ──────────────────────── Moderation ────────────────────────

const UNSAFE_PATTERNS = [
  /\b(kill|murder|suicide|rape|assault|weapon|gun|knife|bomb|drugs?|cocaine|heroin|meth)\b/i,
  /\b(racist|sexist|homophobic|slur|hate\s*speech)\b/i,
  /\b(child|minor|underage)\b/i,
  /\b(nazi|terrorist|extremist)\b/i,
];

const isSafe = (text) => !UNSAFE_PATTERNS.some((p) => p.test(text));

// ──────────────────────── Rate Limit ────────────────────────

async function bumpAndCheckUsage(uid, isPremium) {
  if (isPremium) return;
  const today = new Date().toISOString().split('T')[0];
  const ref = admin.database().ref(`aiUsage/${uid}/${today}`);
  const snap = await ref.transaction((v) => (v || 0) + 1);
  const used = snap.snapshot.val() || 0;
  if (used > FREE_DAILY_LIMIT) {
    throw new HttpsError(
      'resource-exhausted',
      `Daily limit reached (${FREE_DAILY_LIMIT} cards). Upgrade to Premium for unlimited.`
    );
  }
}

// ──────────────────────── generateCard ────────────────────────

exports.generateCard = onCall(
  { secrets: [GEMINI_API_KEY], cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { system, user } = request.data || {};
    if (typeof system !== 'string' || typeof user !== 'string') {
      throw new HttpsError('invalid-argument', 'system and user prompts are required.');
    }
    if (!isSafe(user)) {
      throw new HttpsError('failed-precondition', 'Prompt failed moderation.');
    }

    // Check premium entitlement to bypass rate limit
    const userSnap = await admin.database().ref(`users/${uid}`).once('value');
    const isPremium = !!userSnap.val()?.isPremium;
    await bumpAndCheckUsage(uid, isPremium);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY.value()}`;
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error('Gemini error', resp.status, body);
      throw new HttpsError('internal', `Gemini request failed (${resp.status})`);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new HttpsError('internal', 'Empty Gemini response');

    if (!isSafe(text)) {
      throw new HttpsError('failed-precondition', 'Generated content failed moderation.');
    }

    return { text };
  }
);

// ──────────────────────── searchUsers ────────────────────────

exports.searchUsers = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const query = String(request.data?.query || '').trim().toLowerCase();
  if (query.length < 2) return { results: [] };

  // Prefix search via usernameLower index. Requires:
  //   "users": { ".indexOn": ["usernameLower"] }   (in database.rules.json)
  const snap = await admin
    .database()
    .ref('users')
    .orderByChild('usernameLower')
    .startAt(query)
    .endAt(query + '\uf8ff')
    .limitToFirst(20)
    .once('value');

  const results = [];
  snap.forEach((child) => {
    if (child.key === uid) return;
    const v = child.val() || {};
    results.push({
      id: child.key,
      username: v.username || '',
      email: v.email || undefined,
      avatarURL: v.avatarURL || undefined,
    });
  });
  return { results };
});

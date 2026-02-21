const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const crypto = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp();
}

// function to get firestore db lazily
function getFirestore() {
  return admin.firestore();
}

const SHARED_SETTINGS_COLLECTION = 'sharedSettings';
const DEFAULT_TTL_HOURS = 24;
const MAX_TTL_HOURS = 168; // 7 dní
const SCHEMA_VERSION = 1;

const clampTtl = (ttlHours) => {
  if (!ttlHours || Number.isNaN(ttlHours)) return DEFAULT_TTL_HOURS;
  return Math.max(1, Math.min(MAX_TTL_HOURS, Math.floor(ttlHours)));
};

const buildPreview = (payload) => {
  const ui = payload?.ui || {};
  const breathing = payload?.breathing || {};
  return {
    language: ui.language || 'SK',
    themeId: ui.themeId || null,
    profiles: Array.isArray(breathing.breathProfiles) ? breathing.breathProfiles.length : 0,
    continueAfterEnd: !!breathing.continueAfterEnd
  };
};

exports.createSharedSettings = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Musíš být přihlášen.');
  }

  const scope = data?.scope || {};
  const payload = data?.payload || {};
  const ttlHours = clampTtl(data?.ttlHours);
  const oneTime = data?.oneTime !== false; // default true

  // Základní validace rozsahu
  if (!scope.ui && !scope.breathing) {
    throw new functions.https.HttpsError('invalid-argument', 'Musí být vybrán alespoň jeden scope (ui nebo breathing).');
  }

  // Připrav payload
  const docPayload = {
    schemaVersion: SCHEMA_VERSION
  };
  if (scope.ui) {
    docPayload.ui = JSON.parse(JSON.stringify(payload.ui || {}));
  }
  if (scope.breathing) {
    docPayload.breathing = JSON.parse(JSON.stringify(payload.breathing || {}));
  }

  const shareId = crypto.randomBytes(16).toString('hex');
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + ttlHours * 60 * 60 * 1000);

  const doc = {
    ownerUid: context.auth.uid,
    createdAt: now,
    expiresAt,
    oneTime,
    usedAt: null,
    status: 'active',
    scope: {
      ui: !!scope.ui,
      breathing: !!scope.breathing
    },
    payload: docPayload,
    preview: buildPreview(docPayload)
  };

  await getFirestore().collection(SHARED_SETTINGS_COLLECTION).doc(shareId).set(doc);

  return {
    shareId,
    expiresAt: expiresAt.toDate().toISOString(),
    oneTime,
    scope: doc.scope,
    preview: doc.preview
  };
});

exports.consumeSharedSettings = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Musíš být přihlášen.');
  }

  const shareId = (data?.shareId || '').trim();
  if (!shareId) {
    throw new functions.https.HttpsError('invalid-argument', 'Chybí shareId.');
  }

  const snap = await getFirestore().collection(SHARED_SETTINGS_COLLECTION).doc(shareId).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Sdílení nenalezeno nebo vypršelo.');
  }

  const doc = snap.data();
  const now = admin.firestore.Timestamp.now();

  if (doc.status === 'revoked') {
    throw new functions.https.HttpsError('failed-precondition', 'Sdílení bylo zrušeno.');
  }
  if (doc.oneTime && doc.usedAt) {
    throw new functions.https.HttpsError('failed-precondition', 'Sdílení již bylo použito.');
  }
  if (doc.expiresAt && doc.expiresAt.toMillis() < now.toMillis()) {
    throw new functions.https.HttpsError('failed-precondition', 'Sdílení vypršelo.');
  }

  // Vrátit payload a případně označit jako použité
  if (doc.oneTime) {
    await snap.ref.update({
      usedAt: now,
      status: 'used'
    });
  }

  return {
    shareId,
    scope: doc.scope || {},
    payload: doc.payload || {},
    preview: doc.preview || {},
    expiresAt: doc.expiresAt ? doc.expiresAt.toDate().toISOString() : null,
    oneTime: !!doc.oneTime
  };
});

# Firebase Integration

**Last updated:** 2025-10-29
**Related:** [Tech Stack](tech-stack.md), [Architecture](architecture.md)

## Overview

Projekt používá Firebase 12.4.0 jako **Backend as a Service (BaaS)** pro authentication, storage, databases a cloud functions.

## Firebase Services v Použití

### 1. Firebase Authentication

**Purpose:** Přihlašování do admin panelu

**Implementation:**
```javascript
// src/config/firebase.js
import { getAuth } from 'firebase/auth'

const auth = getAuth(app)

// Login flow
import { signInWithEmailAndPassword } from 'firebase/auth'

await signInWithEmailAndPassword(auth, email, password)
```

**Features:**
- Email/password authentication
- Input validation a sanitization
- Password strength requirements
- Protected routes (admin panel)

**Security:**
```javascript
// Validation před odesláním
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function sanitizeInput(input) {
  return input.replace(/[<>]/g, '') // Strip HTML
}
```

### 2. Firebase Storage

**Purpose:** Ukládání MP3 audio souborů

**Structure:**
```
meditation-app-bucket/
├── slova/
│   ├── sk/           # Slovenské mluvené meditace
│   │   ├── hlas1m-relaxacia.mp3
│   │   ├── hlas2f-spanok.mp3
│   │   └── ...
│   └── cz/           # České mluvené meditace
│       └── ...
├── hudba/
│   ├── album1/       # Relaxační hudba
│   ├── album2/
│   └── ...
└── temp/             # Temporary uploads
```

**Access Pattern:**
```javascript
import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage'

const storage = getStorage()

// List files v složce
const folderRef = ref(storage, 'slova/sk')
const result = await listAll(folderRef)

// Get download URL
const fileRef = ref(storage, 'slova/sk/hlas1m-relaxacia.mp3')
const url = await getDownloadURL(fileRef)
```

**CORS Issue Fix:**
- Service Worker musí správně handlovat CORS
- Download URLs jsou signed URLs s expiracemi
- Fallback na direct storage access pokud URL expiruje

### 3. Firestore (Cloud Database)

**Purpose:** Primary metadata storage

**Collections:**
```
meditation-app (Firestore)
├── audioMetadata/          # Audio file metadata
│   ├── {fileId}
│   │   ├── filename: string
│   │   ├── duration: number
│   │   ├── title: string
│   │   ├── voice: number
│   │   ├── targetGender: string
│   │   ├── language: string
│   │   ├── downloadURL: string
│   │   └── lastModified: timestamp
│   └── ...
├── userPreferences/        # User settings
│   └── {userId}
│       ├── language: 'sk'|'cz'
│       ├── preferredGender: 'm'|'f'|'n'
│       └── preferredVoice: number
└── analytics/              # Usage analytics (planned)
```

**Access Pattern:**
```javascript
import { getFirestore, collection, doc, getDoc, setDoc } from 'firebase/firestore'

const db = getFirestore()

// Read metadata
const docRef = doc(db, 'audioMetadata', fileId)
const docSnap = await getDoc(docRef)
if (docSnap.exists()) {
  return docSnap.data()
}

// Write metadata
await setDoc(docRef, {
  filename,
  duration,
  downloadURL,
  lastModified: new Date()
})
```

**Indexes:**
- `language` + `targetGender` (composite index pro filtrování)
- `lastModified` (sorting)

### 4. Realtime Database

**Purpose:** Fallback a real-time synchronizace metadat

**Structure:**
```json
{
  "metadata": {
    "hlas1m-relaxacia": {
      "duration": 600,
      "title": "Relaxácia",
      "voice": 1,
      "targetGender": "m",
      "language": "sk"
    },
    "hlas2f-spanok": {
      "duration": 900,
      "title": "Spánok",
      "voice": 2,
      "targetGender": "f",
      "language": "sk"
    }
  },
  "stats": {
    "totalFiles": 42,
    "lastSync": "2025-10-29T12:00:00Z"
  }
}
```

**Access Pattern:**
```javascript
import { getDatabase, ref, get, set, onValue } from 'firebase/database'

const db = getDatabase()

// Read
const snapshot = await get(ref(db, `metadata/${filename}`))
if (snapshot.exists()) {
  return snapshot.val()
}

// Write
await set(ref(db, `metadata/${filename}`), metadata)

// Real-time listener
onValue(ref(db, 'metadata'), (snapshot) => {
  const data = snapshot.val()
  updateLocalCache(data)
})
```

**Proč Realtime DB když máme Firestore?**
- Firestore může být pomalý pro simple key-value reads
- Realtime DB je rychlejší pro real-time sync
- Fallback pokud Firestore selže
- Levnější pro high-frequency reads

### 5. Cloud Functions

**Purpose:** Backend logika (metadata sync, cleanup, statistiky)

**Runtime:** Node.js 18

**Deployed Functions:**

#### `onFileUpload` (Storage trigger)
```javascript
// Automaticky běží při uploadu souboru do Storage
export const onFileUpload = onObjectFinalized(async (object) => {
  const { name, bucket } = object

  // Extract metadata z názvu souboru
  const metadata = parseFilename(name)

  // Get download URL
  const url = await getDownloadURL(ref(storage, name))

  // Save to Firestore + Realtime DB
  await Promise.all([
    saveToFirestore(name, { ...metadata, downloadURL: url }),
    saveToRealtimeDB(name, metadata)
  ])
})
```

#### `syncStorage` (HTTP callable)
```javascript
// Manuální sync všech souborů
export const syncStorage = onCall(async (request) => {
  const folders = ['slova/sk', 'slova/cz', 'hudba']

  for (const folder of folders) {
    const files = await listAll(ref(storage, folder))
    for (const file of files.items) {
      // Process každý soubor
      await processFile(file)
    }
  }

  return { success: true, processed: totalFiles }
})
```

#### `saveScrapedMetadata` (HTTP callable)
```javascript
// Uložení metadata z MP3 extraction
export const saveScrapedMetadata = onCall(async (request) => {
  const { filename, metadata } = request.data

  await setDoc(doc(db, 'audioMetadata', filename), {
    ...metadata,
    source: 'scraped',
    scrapedAt: new Date()
  })
})
```

#### `cleanupMetadata` (HTTP callable)
```javascript
// Cleanup orphaned metadata (soubory smazané ze Storage)
export const cleanupMetadata = onCall(async () => {
  const metadataDocs = await getDocs(collection(db, 'audioMetadata'))
  const orphans = []

  for (const doc of metadataDocs.docs) {
    const fileExists = await checkFileExists(doc.data().filename)
    if (!fileExists) {
      orphans.push(doc.id)
      await deleteDoc(doc.ref)
    }
  }

  return { cleaned: orphans.length }
})
```

#### `getFileStats` (HTTP callable)
```javascript
// Statistiky souborů
export const getFileStats = onCall(async () => {
  const [storageFiles, metadataDocs] = await Promise.all([
    listAll(ref(storage, '')),
    getDocs(collection(db, 'audioMetadata'))
  ])

  return {
    totalFiles: storageFiles.items.length,
    withMetadata: metadataDocs.size,
    missingMetadata: storageFiles.items.length - metadataDocs.size
  }
})
```

**Deployment:**
```bash
cd functions
npm run deploy
# nebo
firebase deploy --only functions
```

### 6. Firebase Hosting

**Purpose:** Produkční hosting PWA aplikace

**Configuration (firebase.json):**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

**Deployment:**
```bash
npm run build
firebase deploy --only hosting
```

**Features:**
- CDN auto-enabled
- SSL certificates auto
- Custom domain support
- Rollback support

## Environment Configuration

**.env (gitignored):**
```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=meditation-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meditation-app
VITE_FIREBASE_STORAGE_BUCKET=meditation-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_RECAPTCHA_SITE_KEY=6Le...
```

**Initialization (src/config/firebase.js):**
```javascript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const realtimeDb = getDatabase(app)
export const storage = getStorage(app)
```

## Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Metadata readable by all, writable only by admin
    match /audioMetadata/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // User preferences only by owner
    match /userPreferences/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Audio files readable by all, writable only by admin
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Realtime Database Rules
```json
{
  "rules": {
    "metadata": {
      ".read": true,
      ".write": "auth != null"
    },
    "stats": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

## Error Handling

### Firebase Error Codes
```javascript
// src/services/errorMonitoring.js
function handleFirebaseError(error) {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Neplatný email formát'
    case 'auth/user-not-found':
      return 'Uživatel neexistuje'
    case 'storage/object-not-found':
      return 'Soubor nenalezen'
    case 'permission-denied':
      return 'Nedostatečná oprávnění'
    default:
      return 'Neznámá chyba Firebase'
  }
}
```

## Performance Considerations

### Optimization Strategies

**1. Metadata Caching:**
- Memory cache (LRU)
- localStorage persistence
- Prefetch next tracks

**2. Connection Pooling:**
- Reuse Firebase instances
- Don't reinitialize per component

**3. Batch Operations:**
```javascript
// ❌ Pomalé - multiple requests
for (const file of files) {
  await getDoc(doc(db, 'audioMetadata', file.id))
}

// ✅ Rychlé - single batch
const refs = files.map(f => doc(db, 'audioMetadata', f.id))
const docs = await getDocs(query(collection(db, 'audioMetadata'), where(documentId(), 'in', refs)))
```

**4. Pagination:**
```javascript
// Limit queries
const q = query(
  collection(db, 'audioMetadata'),
  orderBy('lastModified', 'desc'),
  limit(20)
)
```

## Cost Optimization

### Current Usage Estimates (Spark Plan - Free Tier)

**Storage:**
- ~100 MB audio files (well under 5 GB free limit)

**Firestore:**
- ~50 documents (well under 1 GB free limit)
- ~1000 reads/day (under 50k free limit)

**Cloud Functions:**
- ~10 invocations/day (under 2M free limit)

**Hosting:**
- ~10 GB/month transfer (under 10 GB free limit)

**Status:** Projekt fit do free tier 🎉

### If Scaling Required (Blaze Plan)

**Optimization strategies:**
- Cache aggressively (reduce Firestore reads)
- Use Realtime DB for hot data (cheaper than Firestore)
- CDN pro audio (reduce Storage bandwidth)
- Batch Cloud Functions (reduce invocations)

## Monitoring & Debugging

### Firebase Console
- Authentication users
- Firestore data explorer
- Storage file browser
- Functions logs
- Performance monitoring (planned)

### Local Emulators
```bash
cd functions
npm run serve

# Starts emulators:
# - Auth: localhost:9099
# - Firestore: localhost:8080
# - Functions: localhost:5001
# - Storage: localhost:9199
```

## Migration Path (Future)

Pokud Firebase přestane stačit:

**Option 1: Multi-cloud**
- Metadata → Supabase (Postgres)
- Audio → AWS S3 + CloudFront CDN
- Functions → Vercel Edge Functions

**Option 2: Self-hosted**
- Metadata → PostgreSQL
- Audio → MinIO (S3-compatible)
- Auth → Auth0
- Backend → Node.js API

## Related Documentation

- `FIREBASE_METADATA_COLLECTION_SYSTEM.md` - Metadata collection flow
- `FIRESTORE_METADATA_IMPLEMENTATION.md` - Firestore schema
- `FIREBASE_STORAGE_FIX.md` - Storage CORS fix
- `FIREBASE_REFERENCE_ERROR_FIX.md` - Reference error bugfix

## Související kontext

- [Tech Stack](tech-stack.md)
- [Architecture](architecture.md)
- [Audio System](audio-system.md)

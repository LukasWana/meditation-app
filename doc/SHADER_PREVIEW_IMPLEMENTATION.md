## Shader Preview – Implementace

### Datový model

**Realtime Database (`shader-previews/{shaderKey}`)**

```json
{
  "previewUrl": "https://firebasestorage.googleapis.com/…/preview.webp?v={etag}",
  "thumbnailUrl": "https://firebasestorage.googleapis.com/…/thumbnail.webp?v={etag}",
  "generatedAt": "2025-11-10T10:00:00.000Z",
  "generationSource": "client-offline",
  "webglVersion": "webgl2",
  "status": "ready",
  "errorMessage": "",
  "etag": "1731234567-default",
  "renderSettings": {
    "width": 512,
    "height": 512,
    "format": "image/webp"
  },
  "lastRequester": "admin@meditace"
}
```

- **status**: `ready | processing | queued | error | missing`.
- **etag**: jednoduchý inkrement nebo hash, slouží pro bust cache.
- **thumbnailUrl**: volitelné, ukazuje na komprimovanou verzi pro rychlý list.
- **renderSettings**: umožňuje budoucí změny rozlišení nebo formátu.

**Storage (`shader-previews/{shaderKey}/`)**

- `preview.webp` – hlavní náhled (Full HD nebo 512×512 dle potřeby).
- `thumbnail.webp` – komprimovaná verze (cca 256×256, quality 0.6).
- budoucí videa (`preview.mp4`) lze přidat se stejným etagem.

**Logy (`shader-previews-logs/{jobId}`)**

```json
{
  "startedAt": "2025-11-10T09:55:00.000Z",
  "finishedAt": "2025-11-10T10:00:00.000Z",
  "requestedBy": "simple-admin-ui",
  "shaderKeys": ["AlienTube", "AuroraBorealis"],
  "status": "completed",
  "errorCount": 0,
  "notes": "Client batch regenerate"
}
```

### Offline skript `scripts/generateShaderPreviews.js`

1. **Autentizace:** pomocí Firebase Admin SDK (`serviceAccount.json` přes `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_DATABASE_URL`).
2. **Načtení shaderů:** čte `src/assets/shaders/*.ts` a vestavěné varianty; konverzní logika je sdílena s klientem přes inlined helpery z `previewRendererCore`.
3. **Render pipeline:**
   - Headless Chromium (Puppeteer) + WebGL: renderuje fragment shader a exportuje přímo do WebP (canvas → dataURL).
   - Dvojitý render (full/thumbnail) pro minimalizaci závislostí.
   - Uložení na Storage (`preview.webp`, `thumbnail.webp`).
   - Zápis metadat do Realtime DB (`status`, `previewUrl`, `etag`, `generatedAt`, `webglVersion`).
4. **Batch režim:** CLI volby `--filter`, `--only`, `--limit`, `--dry-run`.
5. **Logování:** zapisuje průběh do `shader-previews-logs/{jobId}` a do konzole.

`npm run shader:generate` → `node scripts/generateShaderPreviews.js --all`

#### Service account & prostředí

1. **Vytvoření service accountu**
   - Otevři [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) nebo Firebase → *Project Settings* → *Service Accounts*.
   - Vytvoř nový účet, např. `shader-previews-admin`.
   - Přiřaď minimálně role:
     - `Firebase Admin` nebo kombinaci `Storage Admin`, `Realtime Database Admin`.
   - Vygeneruj nový JSON klíč a stáhni ho.

2. **Lokální uložení**
   - V repo vytvoř (gitignore) např. `config/serviceAccounts/`.
   - Ulož JSON jako `config/serviceAccounts/shader-previews-admin.json`.
   - Zkopíruj šablonu `env/shader-previews.env.example` → `.env` v kořeni projektu a uprav hodnoty.
   - Skripty (`npm run shader:*`) načítají `.env` automaticky pomocí `dotenv`.
   - Pokud chceš používat jiný soubor, nastav `DOTENV_CONFIG_PATH=env/shader-previews.env` před spuštěním.

3. **CI / GitHub Actions**
   - Ulož JSON do `GitHub Secrets` jako např. `FIREBASE_SERVICE_ACCOUNT_JSON`.
   - V workflow:
     ```yaml
     - name: Decode service account
       run: |
         echo "${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}" > serviceAccount.json
     - name: Generate previews
       run: npm run shader:queue
       env:
         FIREBASE_SERVICE_ACCOUNT_PATH: ${{ github.workspace }}/serviceAccount.json
         FIREBASE_STORAGE_BUCKET: meditations-audio.appspot.com
         FIREBASE_DATABASE_URL: https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app
     ```

4. **Watcher v produkci**
   - Spusť `npm run shader:queue:watch` (např. přes PM2/systemd/Docker).
   - Lze upravit interval (`--interval=120000`) nebo max. počet (`--max=10`).

### Fronta a zpracování

- UI nastavuje `status=queued`. Skript `scripts/processShaderPreviewQueue.js` pravidelně hledá tyto záznamy a volá generátor s `mode=only`.
- `npm run shader:queue` – jednorázové zpracování fronty.
- `npm run shader:queue:watch` – kontinuální režim (`--watch`), interval lze upravit `--interval=60000`.
- Volby `--max`, `--dry-run`, `--quality`, `--width`, `--thumb`, `--no-log`.
- Skript znovu použije stejné env proměnné jako generátor; pro dlouhodobý běh (např. PM2/systemd) stačí exportovat `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_DATABASE_URL`.

### Admin service `src/services/realtimeShaderPreviewService.js`

- API:
  - `fetch(shaderKey)` / `fetchAll()`
  - `subscribe(shaderKey, callback)` / `subscribeAll(callback)`
  - `upsert(shaderKey, data)` / `markStatus(shaderKey, status, meta)`
  - `requestRegeneration(shaderKeys, options)`
  - `delete(shaderKey)`
- Interní cache s TTL (výchozí 120 s), invalidace přes `etag`.
- Lazy load – modul se importuje až při vstupu do admin UI.

### UI integrace – `SimpleAdminScreen`

- Nová sekce **„Shader náhledy“**:
  - Tabulka: `Shader`, `Status`, `Poslední generování`, `WebGL`, `Zdroj`, `Akce`.
  - Akce: `Regenerovat` (zapíše job), `Otevřít v galerii` (nové okno `/shader-selection?shader={id}`).
  - Badge pro stavy (`processing`, `error`), tooltip s chybou.
  - Realtime aktualizace přes `subscribeAll`.

### Workflow podpora

- Tlačítko **„Regenerovat všechno“** vytvoří job, nastaví všem shaderům `status=queued` a popsaný skript spustí admin ručně (`node scripts/generateShaderPreviews.js --all`).
- Doporučený provoz: běžící watcher (`npm run shader:queue:watch`), který z fronty postupně generuje nové náhledy.
- Lokalní cache (`ShaderGallery.jsx`) udržuje strukturu:

```json
{
  "etag": "1731234567-default",
  "previewUrl": "https://…/preview.webp?v=1731234567-default",
  "updatedAt": 1731234567000,
  "source": "remote"
}
```

- Při načtení galerie se vždy dotáže Realtime DB, porovná `etag`, stáhne nové URL a uloží do `localStorage`.
- Fallback: pokud remote chybí, použije existující on-device generator a uloží s `source: "local"`.

### Další kroky

- Aktualizovat Firebase Rules pro čtení/zápis nových uzlů a Storage složek.
- Přidat GitHub Action pro pravidelné spouštění skriptu (cron).
- Udržovat bezpečně service account JSON a ENV proměnné (`FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_DATABASE_URL`).


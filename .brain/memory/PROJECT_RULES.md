# Project-Specific Rules - Meditation App

**Last updated:** 2025-10-29

Toto jsou project-specific pravidla pro Meditation App. Rozšiřují obecná Memory System v2.0 pravidla.

## 🎯 Development Principles

### 1. User Experience First
- **Rychlost:** Vždy prioritizovat rychlost načítání (cache, lazy loading)
- **Offline:** App musí fungovat offline (Service Worker critical)
- **Animace:** Smooth animace s Framer Motion spring physics
- **Mobile-first:** Touch optimization, gesture support

### 2. Code Organization
- **Feature-based:** Každá feature v `src/features/`
- **Hooks pattern:** Business logika v custom hooks
- **Service layer:** External calls pouze přes services
- **Clean exports:** Každá složka má `index.js`

### 3. Testing Requirements
**Coverage targets:**
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

**Test priority:**
1. Critical paths (audio playback, meditation timer)
2. Services (Firebase, cache, metadata)
3. Hooks (custom hooks s business logikou)
4. Utils (validation, error handling)
5. Components (UI komponenty)

**Test locations:**
- Unit tests: `src/tests/`
- Integration tests: `src/tests/integration/` (TBD)
- E2E tests: `e2e/` (TBD)

### 4. Git Workflow
**Husky pre-commit hooks:**
- ✅ ESLint must pass (max 0 warnings)
- ✅ Security check (API keys detection)
- ⚠️ Block .env files from commits

**Commit messages:**
- Format: `type(scope): description`
- Types: feat, fix, refactor, test, docs, chore
- Scope: audio, firebase, meditation, admin, deps, atd.

**Examples:**
```
feat(audio): implementovat voice switcher
fix(firebase): opravit CORS issue s Storage URLs
refactor(metadata): konsolidovat 5-level fallback
test(hooks): přidat testy pro useAudioFilter
docs(brain): aktualizovat context/audio-system.md
```

### 5. Firebase Best Practices
**Security:**
- ❌ NIKDY necheckinovat .env soubory
- ✅ Všechny keys v environment variables
- ✅ Firebase rules restrictive (read all, write auth only)
- ✅ Input validation před odesláním do Firebase

**Performance:**
- Cache aggressively (LRU + localStorage)
- Batch Firestore operations
- Use Realtime DB pro hot data
- Prefetch next tracks

**Cost optimization:**
- Minimalizovat Firestore reads (cache je king)
- Cloud Functions pouze pro esenciální operace
- CDN pro audio files (plánováno)

### 6. Audio System Rules
**File naming convention:**
```
hlas{N}{kod}-{tema}.mp3

Příklady:
hlas1m-relaxacia.mp3  (hlas 1, muž)
hlas2f-spanok.mp3     (hlas 2, žena)
hlas3-dychanie.mp3    (hlas 3, obecné)
```

**Metadata fallback order:**
1. Memory cache (always check first)
2. localStorage (persistent cache)
3. Firestore (primary cloud)
4. Realtime DB (fallback cloud)
5. MP3 extraction (last resort)

**Voice switching:**
- Najdi všechny verze stejné meditace
- Umožni switch mezi hlasy 1-4
- Keep playback position při switchi (plánováno)

### 7. Performance Targets
**Load times:**
- Time to Interactive: < 3s
- First Contentful Paint: < 1.5s
- Metadata load: < 500ms (cached)

**Memory:**
- LRU cache max: 100 items
- localStorage max: 5MB
- Service Worker cache: 50MB

**Audio:**
- Preload time: < 2s
- Seek latency: < 100ms
- Voice switch: < 500ms

## 🧪 Testing Checklist

**Before každý commit:**
- [ ] ESLint clean (0 warnings)
- [ ] Existující testy passují
- [ ] Nový kód má testy (pokud applicable)
- [ ] .env soubory nejsou tracked

**Before merge/deploy:**
- [ ] All tests pass (unit + integration)
- [ ] Coverage targets splněny (70%)
- [ ] Manual testing v Chrome + Firefox + Safari
- [ ] Mobile testing (iOS + Android)
- [ ] Offline mode funguje
- [ ] No console errors/warnings

## 📝 Documentation Standards

### Code Comments
**Kdy psát komentáře:**
- Complex algorithms (priority calculation, metadata fallback)
- Non-obvious workarounds (CORS fix)
- Firebase security considerations
- Performance optimizations

**Kdy NEPSÁT komentáře:**
- Očividný kód (// Set loading to true)
- Self-explanatory function names
- Redundant info

### Context Files
**Kdy vytvořit nový context file:**
- Nový major feature (např. `context/notifications-system.md`)
- Nová integrace (např. `context/analytics.md`)
- Komplexní pattern (např. `context/state-management.md`)

**Kdy aktualizovat existující:**
- Tech stack se změní (add/remove dependency)
- Architektura pattern se změní
- Firebase setup změna

### Learned Files
**Kdy vytvořit learned file:**
- Bug trval >1 hodinu na fixing
- Root cause byl non-obvious
- Lesson je applicable i pro budoucnost

**Formát:**
```markdown
# Lesson: {Bug Name}

**Date:** YYYY-MM-DD
**Task:** {Související task ID}
**Severity:** Low|Medium|High

## What Happened
{Popis problému}

## Root Cause
{Proč k tomu došlo}

## Solution
{Jak jsme to opravili}

## Takeaway
{Co si z toho odnést}
```

## 🚨 Critical Patterns

### Pattern: Metadata Loading
**ALWAYS use 5-level fallback:**
```javascript
const metadata = await getMetadata(filename)
// NEVER directly call Firestore/Realtime DB
// ALWAYS go through unifiedMetadataService
```

### Pattern: Error Handling
**ALWAYS catch Firebase errors:**
```javascript
try {
  await firebaseOperation()
} catch (error) {
  errorMonitoring.logError(error)
  // Fallback nebo user-friendly message
}
```

### Pattern: Audio Player
**ALWAYS check audio loaded:**
```javascript
audioRef.current.addEventListener('canplay', () => {
  // NOW safe to play
})
```

### Pattern: Cache Usage
**ALWAYS check cache first:**
```javascript
// ✅ Good
const cached = cache.get(key)
if (cached) return cached
const fresh = await fetchData()
cache.set(key, fresh)

// ❌ Bad
const data = await fetchData() // Ignores cache
```

## 🔧 Custom Workflows

### Workflow: Adding New Screen
1. Create screen component v `src/features/{feature}/screens/`
2. Add route v `App.jsx`
3. Add navigation link (pokud applicable)
4. Add Framer Motion transitions
5. Add lazy loading
6. Test offline behavior
7. Update context/architecture.md s novým screenem

### Workflow: Adding New Audio Feature
1. Design v `src/features/audio/`
2. Create hook pokud má business logiku
3. Integrate s unifiedMetadataService
4. Test 5-level fallback
5. Add caching
6. Test voice switching compatibility
7. Update context/audio-system.md
8. Add tests

### Workflow: Firebase Schema Change
1. Update Firestore/Realtime DB structure
2. Update security rules
3. Write migration script (pokud nutné)
4. Update `src/services/*Service.js`
5. Test fallback behavior
6. Update context/firebase-integration.md
7. Deploy Cloud Functions pokud ovlivněny

### Workflow: Fixing Bug
1. Reproduce bug locally
2. Write failing test (TDD approach)
3. Debug root cause
4. Implement fix
5. Verify test passes
6. Manual testing
7. Create learned/{bug-name}.md pokud non-trivial
8. Update changelog

### Workflow: Adding Dependency
1. Check bundle size impact
2. Check compatibility s Vite + React 18
3. npm install
4. Update context/tech-stack.md
5. Update README dependencies section (pokud major)
6. Test build
7. Commit s commit message: `deps: add {package}`

## 🎨 UI/UX Guidelines

### Animation Timing
- **Page transitions:** 300ms
- **Button feedback:** 150ms
- **Modal open/close:** 250ms
- **Loading spinners:** Appear after 200ms delay

### Colors (Design system TBD)
- Primary: (define in Tailwind config)
- Secondary: (define)
- Accent: (define)
- Error: Red shades
- Success: Green shades

### Typography
- Font family: IBM Plex Sans
- Headings: Bold
- Body: Regular
- Small text: 14px minimum (accessibility)

### Touch Targets
- Minimum: 44x44px (iOS guidelines)
- Spacing: 8px mezi touch targets
- Feedback: WhileTap animation vždy

## 🔐 Security Checklist

**Before každý release:**
- [ ] .env soubory v .gitignore
- [ ] Firebase rules reviewed
- [ ] Input validation na všech forms
- [ ] XSS protection (sanitize user input)
- [ ] CORS properly configured
- [ ] No hardcoded secrets v kódu
- [ ] Dependencies updated (npm audit)

## 📦 Build & Deployment

### Build Process
```bash
npm run build
# Outputs to dist/

# Check bundle size
ls -lh dist/assets/

# Verify no .env in build
grep -r "VITE_FIREBASE" dist/ # Should be empty
```

### Deployment Checklist
- [ ] Tests pass
- [ ] Build successful
- [ ] Bundle size reasonable (<2MB)
- [ ] Environment variables set v Firebase Hosting
- [ ] Firebase rules deployed
- [ ] Cloud Functions deployed (pokud změny)
- [ ] Test v production (smoke test)

### Rollback Plan
```bash
# Firebase Hosting rollback
firebase hosting:rollback

# Cloud Functions rollback
# (Manual: redeploy previous version)
```

## 🤝 Commands Management

**Location:** `.brain/commands/` (symlinked to `.claude/commands/`)

**Naming:** kebab-case (e.g., `brain-status.md`)

**Format:** YAML frontmatter + implementation

**Planned commands:**
- `/brain-status` - Přehled brain stavu
- `/brain-update` - Update memory
- `/brain-finish` - Finalize session
- `/run-tests` - Run test suite s coverage
- `/deploy` - Build + deploy workflow

## 📊 Metrics to Track

**Development:**
- Test coverage %
- Build time
- Bundle size
- Number of ESLint warnings

**Production (planned):**
- Error rate
- Performance metrics (FCP, TTI)
- Cache hit rate
- Audio load time

## 🔄 Maintenance Schedule

**Weekly:**
- npm audit fix
- Check Firebase costs
- Review TODO comments v kódu

**Monthly:**
- Dependencies update
- Brain cleanup (`/brain-cleanup`)
- Archive old tasks
- Review learned/ files

**Quarterly:**
- Major dependency upgrades
- Architecture review
- Performance audit
- Security audit

---

**Pro obecná Memory System pravidla viz:**
`/c/work/projects/altisima-central-vault/__home/projects/ai/brain/memory/rules.md`

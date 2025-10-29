# 📋 Next Session TODO

**Generated:** 2025-10-29 23:15
**Previous session:** Brain system setup

## 🎯 Quick Start

1. **Review changelog:** `.brain/memory/changelog/2025-10.md`
2. **Check context:** 5 context files available v `.brain/memory/context/`
3. **Ready items:** 2 High Priority items čekají v todo-later Ready section

## ✅ Ready to Start (High Priority)

### Option 1: CI/CD Pipeline Setup
**Why:** Automatizovat testy a deployment, zvýšit kvalitu
**What to do:**
- GitHub Actions workflow pro auto testy
- Linting v CI
- Build verification
- Auto-deployment do Firebase (optional)

**Context available:**
- PROJECT_RULES.md - Git workflow a testing standards
- tech-stack.md - Testing setup (Vitest, ESLint)

### Option 2: Rozšířit Test Coverage
**Why:** Pouze 5 test souborů, target je 70% coverage
**What to do:**
- Testy pro komponenty (AudioPlayer, MeditationScreen, atd.)
- Firebase integration testy
- E2E testy pro kritické flows (audio playback, meditation timer)

**Context available:**
- architecture.md - Component hierarchy
- audio-system.md - Audio features to test
- PROJECT_RULES.md - Testing requirements

## 🔍 Explore & Learn

Pokud chceš nejdřív prozkoumat codebase více:
- **Přečti existing dokumentaci:** 40 MD souborů v rootu (AUDIO_*.md, FIREBASE_*.md, SECURITY_*.md)
- **Prozkoumej features:** `src/features/` (audio, meditation, navigation)
- **Zkontroluj existing testy:** `src/tests/`

## 📚 Available Context

**Brain Memory:**
```
.brain/memory/
├── context/
│   ├── project-overview.md      # Start zde pro high-level přehled
│   ├── tech-stack.md            # Tech details
│   ├── architecture.md          # Design patterns
│   ├── firebase-integration.md  # Firebase services
│   └── audio-system.md         # Audio features
├── PROJECT_RULES.md            # Development principles
└── todo-later.md              # Backlog (2 Ready, 6 Someday/Maybe)
```

## 💡 Recommendations

**Recommended Order:**
1. **First:** CI/CD Pipeline (foundation pro quality)
2. **Then:** Rozšířit Test Coverage (využije CI pipeline)
3. **Later:** Konsolidace dokumentace (Medium priority)

**Proč tento pořadek?**
- CI/CD umožní automatické testování
- Test coverage bude automaticky ověřován v CI
- S testy a CI můžeme bezpečně refactorovat dokumentaci

## 🚀 Jak začít?

Řekni mi jeden z následujících:
- **"Začněme s CI/CD"** → Vytvoříme GitHub Actions workflow
- **"Začněme s testy"** → Rozšíříme test coverage
- **"Chci prozkoumat XYZ"** → Prozkoumáme specifickou část codebase
- **"Co by ses pustil první ty?"** → Dám ti doporučení

---

**Note:** Brain system je ready. Při vytvoření první task se automaticky vytvoří task file v `.brain/memory/tasks/`.

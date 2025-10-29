# .brain - Meditation App Memory System

**Projekt:** Meditation App
**Inicializováno:** 2025-10-29
**Memory System:** v2.0

## 📚 O této struktuře

`.brain/` slouží jako **centralizovaný memory systém** pro sledování vývoje projektu, kontextu, rozhodnutí a naučených lekcí.

## 📂 Struktura

```
.brain/
├── README.md                    # Tento soubor
├── commands/                    # Custom slash commands (symlinked to .claude/commands/)
└── memory/                      # Memory systém
    ├── changelog/               # Timeline změn
    │   └── YYYY-MM.md
    ├── tasks/                   # Aktivní a dokončené tasky
    │   ├── {NNNN}-{name}-{YYYY-MM}.md
    │   └── archive/             # Archivované dokončené tasky
    ├── context/                 # Dlouhodobý kontext projektu
    │   ├── project-overview.md  # High-level přehled
    │   ├── tech-stack.md        # Tech stack a dependencies
    │   ├── architecture.md      # Architektura a design patterns
    │   ├── firebase-integration.md
    │   └── audio-system.md
    ├── decisions/               # Architecture Decision Records (ADR)
    │   └── YYYY-MM-{topic}.md
    ├── learned/                 # Naučené lekce z bugů a issues
    │   └── {bug-name}.md
    └── todo-later.md           # Backlog a future ideas
```

## 🎯 Kdy použít co

### Context Files (`context/`)
**Použití:** Dlouhodobý kontext, který se nemění často
- Tech stack
- Architektura
- Firebase setup
- Design patterns

**Aktualizace:** Když se změní fundamentální věci

### Task Files (`tasks/`)
**Použití:** Sledování aktivní práce
- Co děláme teď
- Plán implementace
- Průběžný progress

**Lifecycle:** OPEN → PLAN → PROCESS → TEST → REVIEW → DONE → ACCEPTED

### Changelog (`changelog/`)
**Použití:** Timeline změn (co se stalo kdy)
- Session summary
- Major milestones
- Bug fixes

**Formát:** Měsíční soubory (YYYY-MM.md)

### Decisions (`decisions/`)
**Použití:** Důležitá technická rozhodnutí
- Proč jsme zvolili Firebase
- Proč Framer Motion místo GSAP
- Proč feature-based struktura

**Formát:** ADR (Architecture Decision Record)

### Learned (`learned/`)
**Použití:** Lekce z bugů a problémů
- Co se pokazilo
- Root cause
- Jak jsme to opravili
- Co si z toho odnést

### Todo Later (`todo-later.md`)
**Použití:** Future ideas a backlog
- Ready - připravené stát se tasky
- Someday/Maybe - vágní nápady
- Completed/Declined - archiv

## 📖 Existující Context

### Aktuální context files

1. **[project-overview.md](memory/context/project-overview.md)**
   - Co je to za projekt
   - Hlavní features
   - Silné/slabé stránky
   - Klíčové metriky

2. **[tech-stack.md](memory/context/tech-stack.md)**
   - React 18.2.0 + Vite 7.1.11
   - Firebase 12.4.0 (Auth, Firestore, Storage, Functions)
   - Framer Motion 12.23.24
   - Vitest + Testing Library

3. **[architecture.md](memory/context/architecture.md)**
   - Feature-based organization
   - Design patterns (Custom Hooks, Service Layer, Metadata Fallback)
   - State management
   - Error boundaries

4. **[firebase-integration.md](memory/context/firebase-integration.md)**
   - Firebase services (Auth, Storage, Firestore, Realtime DB, Functions)
   - Security rules
   - Cloud Functions (onFileUpload, syncStorage, atd.)
   - Environment configuration

5. **[audio-system.md](memory/context/audio-system.md)**
   - Inteligentní filtering (gender/language/voice)
   - 5-level metadata fallback
   - Voice switching
   - Background preloading

## 🚀 Quick Start

### Začínáš novou session?
```bash
# 1. Přečti si changelog (co se dělo)
cat .brain/memory/changelog/2025-10.md

# 2. Zkontroluj aktivní tasky
ls .brain/memory/tasks/*.md
```

### Začínáš nový task?
```bash
# Vytvoř task file
touch .brain/memory/tasks/0001-{name}-2025-10.md

# Použij template (viz rules.md)
```

### Dokončil jsi práci?
```bash
# 1. Aktualizuj changelog
# 2. Přesuň task do DONE/ACCEPTED
# 3. Promysli "learned" lekci pokud byl bug
```

## 🔗 Integration s existující dokumentací

**Původní dokumentace:** 40 MD souborů v rootu projektu

**Status:** Ponecháno jako historická reference

**Consolidation strategie:**
- Fundamentální info přesunuto do `.brain/memory/context/`
- Bugfix historie může být konvertována do `.brain/memory/learned/`
- Security/Performance dokumenty zůstávají v rootu (referenční)

## 🛠️ Commands

Custom slash commands budou přidány do `.brain/commands/` a symlinknuty do `.claude/commands/`.

**Planned:**
- `/brain-status` - Přehled stavu brain systému
- `/brain-update` - Update memory z aktuální session
- `/brain-finish` - Finalizace session

## 📊 Project Status (Initial)

**Code:**
- 18,219 řádků
- 52 feature files
- 26 components
- 20 hooks
- 25 services

**Testing:**
- 5 test souborů (target: 70% coverage)
- Unit tests: hooks, services, utils
- Integration tests: TBD
- E2E tests: TBD

**Documentation:**
- 40 původních MD souborů
- 5 nových context files v .brain/
- ADR: TBD

**Git:**
- Branch: main
- Status: clean
- Last commit: oprava zobrazování názvů souborů v admin panelu

## 🎓 Memory System Rules

Detailní pravidla pro používání memory systému viz:
- Root: `/c/work/projects/altisima-central-vault/__home/projects/ai/brain/memory/rules.md`
- Kopie pravidel aplikovaná i zde

**Key principles:**
- Autonomous writing (neptat se na každou změnu)
- Lifecycle states (OPEN → PLAN → PROCESS → TEST → REVIEW → DONE → ACCEPTED)
- Context over changelog (důležité věci do context/, ne jen do changelog)
- Decision tracking (ADR pro důležitá rozhodnutí)

## 🔍 Hledání informací

```bash
# Najdi info v contextu
grep -r "Firebase" .brain/memory/context/

# Najdi task podle tématu
grep -r "audio" .brain/memory/tasks/

# Zkontroluj changelog pro určitý měsíc
cat .brain/memory/changelog/2025-10.md
```

## 📝 Contributing

Když přidáváš nový context file:
1. Použij clear název (kebab-case)
2. Přidej "Last updated" datum
3. Přidej "Related" odkazy na související files
4. Používej markdown a emoji pro čitelnost

## 🧹 Maintenance

**Monthly:**
- Archive ACCEPTED tasks do `tasks/archive/YYYY-MM/`
- Review todo-later.md (Someday/Maybe → Ready nebo smazat)
- Archive learned/ items >6 months

**Commands:**
- `/brain-cleanup` - Automatický cleanup (planned)

---

**Pro detaily o Memory System v2.0 viz:**
`/c/work/projects/altisima-central-vault/__home/projects/ai/brain/memory/rules.md`

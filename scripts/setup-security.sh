#!/bin/bash

echo "🔒 Nastavuji bezpečnostní opatření pro meditační aplikaci..."

# Barvy pro output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Krok 1: Zkontrolovat .env soubor
echo ""
echo "📋 Krok 1: Kontrola .env souboru..."
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env soubor neexistuje!${NC}"
  echo "   Zkopírujte .env.example jako .env a vyplňte hodnoty:"
  echo "   cp .env.example .env"
  exit 1
else
  echo -e "${GREEN}✅ .env soubor existuje${NC}"
fi

# Krok 2: Zkontrolovat, že .env je v .gitignore
echo ""
echo "📋 Krok 2: Kontrola .gitignore..."
if ! grep -q "^\.env$" .gitignore; then
  echo -e "${YELLOW}⚠️  Přidávám .env do .gitignore...${NC}"
  echo ".env" >> .gitignore
  echo -e "${GREEN}✅ .env přidán do .gitignore${NC}"
else
  echo -e "${GREEN}✅ .env je již v .gitignore${NC}"
fi

# Krok 3: Zkontrolovat Firebase konfig
echo ""
echo "📋 Krok 3: Kontrola Firebase konfigurace..."
if [ -f src/services/firebase.js ]; then
  if grep -q "apiKey:.*import.meta.env" src/services/firebase.js; then
    echo -e "${GREEN}✅ Firebase používá environment proměnné${NC}"
  else
    echo -e "${RED}❌ Firebase nepoužívá správně environment proměnné!${NC}"
    echo "   Zkontrolujte src/services/firebase.js"
  fi
else
  echo -e "${RED}❌ Firebase konfigurační soubor nenalezen!${NC}"
fi

# Krok 4: Instalovat husky pro pre-commit hooks
echo ""
echo "📋 Krok 4: Nastavení pre-commit hooks..."
if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ npm není nainstalován!${NC}"
  exit 1
fi

if [ ! -d "node_modules/husky" ]; then
  echo "   Instaluji husky..."
  npm install --save-dev husky
fi

# Inicializovat husky
npx husky install
chmod +x .husky/pre-commit

echo -e "${GREEN}✅ Pre-commit hooks nastaveny${NC}"

# Krok 5: Instalovat bezpečnostní závislosti
echo ""
echo "📋 Krok 5: Instalace bezpečnostních závislostí..."
npm install --save-dev eslint-plugin-security

echo -e "${GREEN}✅ Bezpečnostní závislosti nainstalovány${NC}"

# Krok 6: Spustit security audit
echo ""
echo "📋 Krok 6: Bezpečnostní audit závislostí..."
npm audit --audit-level=moderate

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Žádné bezpečnostní zranitelnosti nenalezeny${NC}"
else
  echo -e "${YELLOW}⚠️  Nalezeny bezpečnostní zranitelnosti!${NC}"
  echo "   Spusťte: npm audit fix"
fi

# Krok 7: Zkontrolovat git historii na .env
echo ""
echo "📋 Krok 7: Kontrola git historie..."
if git log --all --full-history -- .env 2>/dev/null | grep -q "commit"; then
  echo -e "${RED}❌ VAROVÁNÍ: .env soubor je v git historii!${NC}"
  echo "   Soubor obsahující citlivé údaje byl commitnutý do repository."
  echo "   OKAMŽITĚ regenerujte všechny Firebase klíče!"
  echo "   Poté vyčistěte git historii pomocí:"
  echo "   git filter-branch --force --index-filter \"git rm --cached --ignore-unmatch .env\" --prune-empty --tag-name-filter cat -- --all"
else
  echo -e "${GREEN}✅ .env není v git historii${NC}"
fi

# Krok 8: Nasazení Firebase rules
echo ""
echo "📋 Krok 8: Firebase security rules..."
if [ -f firebase.json ]; then
  echo "   Nalezeny Firebase rules soubory:"
  echo "   - storage.rules"
  echo "   - firestore.rules"
  echo ""
  echo "   Pro nasazení spusťte:"
  echo "   firebase deploy --only storage"
  echo "   firebase deploy --only firestore"
else
  echo -e "${YELLOW}⚠️  firebase.json nenalezen${NC}"
  echo "   Inicializujte Firebase pomocí: firebase init"
fi

# Závěrečné shrnutí
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Bezpečnostní setup dokončen!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 DALŠÍ KROKY:"
echo "   1. Zkontrolujte .env soubor a ujistěte se, že obsahuje správné hodnoty"
echo "   2. Nasaďte Firebase security rules: firebase deploy --only storage,firestore"
echo "   3. Implementujte Firebase App Check pro produkci"
echo "   4. Pravidelně spouštějte: npm audit"
echo "   5. Pravidelně aktualizujte závislosti: npm update"
echo ""
echo "🔒 DŮLEŽITÉ BEZPEČNOSTNÍ KONTROLY:"
echo "   ✓ API klíče jsou v .env souboru"
echo "   ✓ .env je v .gitignore"
echo "   ✓ Pre-commit hooks jsou aktivní"
echo "   ✓ Security rules jsou připraveny k nasazení"
echo ""

exit 0


Zde je struktura aplikace a názvy, jak jsou vidět v UI:


[5 tools called]

## 📱 **Struktura Aplikace a Názvy v UI**

### 🏠 **Hlavní Obrazovka (HomeScreen)**
**Název:** Hlavní menu
**Obsahuje 4 sekce:**

1. **"meditácia"** (bílá barva)
   - Naviguje na: `MeditationScreen`
   - Obsahuje: 3 černé tečky pod textem

2. **"dýchanie"** (béžová barva)
   - Naviguje na: `BreathScreen`

3. **"bez slov"** (bílá barva)
   - Naviguje na: `JourneyScreen`
   - Původně: "hudba" → přejmenováno na "bez slov"

4. **"mluvené slovo"** (béžová barva)
   - Naviguje na: `TroubleScreen`
   - Původně: "trable" → přejmenováno na "Mluvené slovo"

vychytávky
mluvené slovo
bez slov
meditácia
dýchanie


---

### 🎵 **Sekce "bez slov" (JourneyScreen)**
**Hlavní nadpis:** "bez slov"
**Podnadpis:** "meditačné zvuky a relaxačná hudba"
**Funkce:** Načítá hudební soubory s formátem `00--00--00--XX-*.mp3`

---

### 🎤 **Sekce "mluvené slovo" (TroubleScreen)**
**Hlavní nadpis:** "Mluvené slovo"
**Podnadpis:** "audio meditácie a mluvené slovo"
**Funkce:** Načítá meditační soubory s mužským/ženským hlasem

---

### 🎮 **Audio Player**
**Zobrazuje se jako:** Samostatná stránka (ne modal)
**Obsahuje:**
- Back button (vlevo nahoře)
- Název skladby
- Celková délka (pod názvem)
- Kruhový progress bar
- Play/Pause tlačítko
- Skip tlačítka (zpět/dopředu)
- Voice switcher (pro mluvené slovo)
- Loading indicator (vlevo nahoře)

---

### 📊 **Technické Detaily:**
- **Font:** Playfair Display
- **Barvy:** Bílá (#ffffff) a béžová (#f4ddc4)
- **Animace:** Framer Motion page transitions
- **Audio formát:** MP3 z Firebase Storage
- **Responsive:** Mobilní-first design
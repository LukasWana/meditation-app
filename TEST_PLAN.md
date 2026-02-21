# 🧪 Komplexní testovací plán aplikace Meditace & Dýchání

Tento dokument slouží jako systematický průvodce pro manuální testování všech klíčových funkcí aplikace, zejména s ohledem na podporu mobilních zařízení (Android/iOS) a webové PWA verze.

## 1️⃣ Testování základní navigace a UI
- [ ] **Spuštění aplikace:** Aplikace se načte bez chyb v konzoli.
- [ ] **Responzivita:** Prvky se správně přeskládají na mobilu i na desktopu.
- [ ] **Tmavý/Světlý režim:** Přepínání motivů funguje a barvy jsou dobře čitelné ve všech sekcích.
- [ ] **Lokalizace:** Přepínání jazyků (CS/EN/SK) okamžitě aktualizuje všechny texty.
- [ ] **Offline PWA:** Aplikaci lze nainstalovat na plochu mobilu/PC a spustit po odpojení od internetu.

## 2️⃣ Modul: Dýchání (Breathing)
*Kritická sekce z hlediska zpracování audia na mobilních zařízeních.*

### Přehrávač a Časování
- [ ] **Spuštění dýchání:** Lze spustit cyklus rovnou nebo s přípravným časem.
- [ ] **Přípravný čas (Countdown):** Správně odpočítává. Pokud je nastaven countdown zvuk (tikání), hraje.
- [ ] **Přesnost fází:** Grafická animace a odpočítávání přesně sedí na nastavený čas nádechu/výdechu.
- [ ] **Zastavení a Reset:** Tlačítko пауза/stop ukončí všechny právě hrající zvuky. Reset vynuluje čas.

### Zvukový Engine (Web Audio API)
*Důležité testovat na Android Chrome a iOS Safari kvůli striktní politice.*
- [ ] **Fáze Nádechu a Výdechu:** Zvuky plynule navazují (fade in/fade out) podle délky sekvence.
- [ ] **Krátké zvuky (Kliknutí na přechodu):** Zvuk tiknutí nebo přehození zvonku zazní přesně při změně fáze.
- [ ] **Finální zvuk:** Po uplynutí celkového času se přehraje závěrečný zvuk (např. gong).
- [ ] **Galerie Zvuků:** Lze si v prohlížeči zvuků přehrát náhled (`Preview` funkčnost s `new Audio()`).
- [ ] **Změna a uložení zvuků:** Při výběru jiného hluku oceánu nebo tibetské mísy se po návratu do dýchání projeví.
- [ ] **Žádný zvuk (Silence):** Možnost vypnout všechny zvuky (nebo pouze selektivní fázi, např. nechci zvuk na nádech) funguje.

### Pokračování po skončení
- [ ] Dýchací sekce správně ukončí a přepne se do stavu zobrazení aktivity např. možnost "Pokračovat po skončení".

## 3️⃣ Modul: Meditace / Hudba (AudioPlayer)
*Hlavní audio přehrávač založený standardně na `<audio>` tagu s podporou pozadí a hlasů.*

### Základní přehrávání
- [ ] **Start/Pause:** Funguje plynule.
- [ ] **Zamykací obrazovka (Media Session API):** Lze ovládat hudbu i při zamknutém telefonu (zobrazuje se název, autor).
- [ ] **Přehrávání na pozadí:** Po minimalizaci aplikace na Androidu/iOS zvuk hraje dál.

### Funkce Audio Přehrávače
- [ ] **Hlasy (Voice Switcher):** Přepínání mezi různými učiteli/jazyky (pokud je podporováno skladbou).
- [ ] **Ambientní zvuky (Background):** Přidávání zvuků přírody na pozadí hlavní meditace, mixování hlasitosti.
- [ ] **Track Switcher / Playlisty:** Přepínání na další skladbu funguje.
- [ ] **Offline stahování:** Stažení meditace pro offline poslech projde úspěšně (označení ikonkou). Po vypnutí Wi-Fi a mobilních dat lze stáhlou meditaci pustit.

## 4️⃣ Uživatelský profil a Aktivita (Activity Tracking)
- [ ] **Ukládání do historie:** Po dokončení meditace nebo dýchání se časič připíše k dennímu součtu.
- [ ] **Dashboard:** Zobrazí se správně aktuální "Streak" (šňůra dnů) a celkový obětovaný čas (Total Time).
- [ ] **Historie napříč dny:** Změny a kalendářové dny se obnovují a uchovávají v LocalStorage / Firebase (dle backendu).

## 5️⃣ Specifické platformní testy (Nativní chování)
- [ ] **Android Chrome:**
  - Audio Context se správně probudí při prvním spuštění dýchání (nesmí zvuky chybět).
  - CORS (firebase storage mp3/ogg soubory) nezpůsobují potlačení při Web Audio API manipulaci.
- [ ] **iOS Safari:**
  - Přehrávání se nezastavuje při "Silent přepínači" zapnutém pro Audio elementy nebo po uzamčení (musí se otestovat reálné chování WebView).
- [ ] **Desktop Firem / Chrome / Safari:**
  - Standardní běh bez odchylek.

## 6️⃣ Krizové a hraniční situace (Edge Cases)
- [ ] **Ztráta signálu během načítání:** Appka by se neměla zablokovat do nekonečného načítacího stavu.
- [ ] **Zrušení/přerušení dýchání po pár sekundách:** Zvuky musí bezpečně ztišit nebo stopnout a nenavyšovat trackovací statistiky víc než odpovídá (či je nezapsat vůbec dle logiky).
- [ ] **Zamknutí obrazovky v 10s odpočtu (Preparation):** Odpočet na pozadí nebo pro pokračování musí běžet/pozastavit se korektně a nede-synchronizovat animaci.

---

### Jak provést QA (Quality Assurance) krok za krokem:
1. Vymazat celou cache prohlížeče a `PWA` paměť stroje.
2. Načíst `https://meditations-audio.web.app/`
3. Otevřít konzoli (DevTools) a zkontrolovat na případné výjimky.
4. Postupovat od bodu 1 do 6 a odškrtávat.

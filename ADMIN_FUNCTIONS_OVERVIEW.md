# 🛠️ PŘEHLED FUNKCÍ ADMIN PANELU

## 🎯 HLAVNÍ FUNKCE ADMIN PANELU

### **1. 📊 NAČÍTÁNÍ A STATISTIKY**

#### **`loadAudioStats()`**
- **Účel:** Načte všechny audio soubory z Firebase Storage
- **Co dělá:**
  - Rekurzivně projde složky `hudba` a `slova`
  - Získá metadata každého souboru (název, velikost, download URL)
  - Spočítá celkové statistiky (počet souborů, celková velikost)
  - Rozdělí na hudba vs slova kategorie
- **Výstup:** Aktualizuje `audioStats` a `fileData` state

#### **`getAllFilesRecursively(folderRef, folderName)`**
- **Účel:** Rekurzivně načte všechny soubory ze složky včetně podsložek
- **Co dělá:**
  - Projde všechny soubory v aktuální složce
  - Získá metadata a download URL pro každý soubor
  - Rekurzivně zpracuje všechny podsložky
  - Vrátí kompletní seznam všech souborů
- **Výstup:** Array všech souborů s metadaty

---

### **2. 🔍 KONTROLA AKTUALIZACÍ**

#### **`checkForUpdates()`**
- **Účel:** Zkontroluje, jestli jsou data v Realtime Database aktuální
- **Co dělá:**
  - Načte aktuální soubory z Firebase Storage
  - Načte data z Realtime Database
  - Porovná obě sady dat pomocí `compareData()`
  - Nastaví status: `checking`, `needs-update`, `up-to-date`, `error`
- **Výstup:** Aktualizuje `updateStatus` a `needsUpdate` state

#### **`compareData(storageFiles, dbData)`**
- **Účel:** Porovná data mezi Storage a Realtime Database
- **Co dělá:**
  - Porovná počet souborů
  - Porovná názvy souborů (nové/odebráné)
  - Porovná celkovou velikost
  - Identifikuje změny
- **Výstup:** `{ needsUpdate: boolean, changes: string[] }`

---

### **3. 📝 PŘÍPRAVA DAT**

#### **`prepareDataForRealtimeDB()`**
- **Účel:** Připraví data pro uložení do Realtime Database
- **Co dělá:**
  - Vytvoří strukturu s metadaty a soubory
  - Pro hudba soubory: jednoduché metadata
  - Pro slova soubory: pokročilé metadata (gender, topic, mediaType, parsed)
  - Odhadne délku audio na základě velikosti
  - Formátuje velikosti a časy
- **Výstup:** Nastaví `preparedData` state

#### **`extractTopicFromFileName(fileName)`**
- **Účel:** Extrahuje téma z názvu souboru
- **Co dělá:**
  - Mapuje klíčová slova na slovenské názvy
  - `'uzkost'` → `'Úzkosť'`
  - `'osamelost'` → `'Osamelosť'`
  - `'stres'` → `'Stres'`
  - atd.
- **Výstup:** Slovenský název tématu

#### **`extractTitleFromFileName(fileName)`**
- **Účel:** Vytvoří uživatelsky přívětivý název z názvu souboru
- **Co dělá:**
  - Odstraní technické prefixy (`muzsky4FSK-`, `zensky4MSK-`, atd.)
  - Nahradí pomlčky mezerami
  - Nastaví velká písmena
- **Příklad:** `muzsky4FSK-uzkost-osamelost.mp3` → `"Uzkost Osamelost"`

---

### **4. 💾 ULOŽENÍ DAT**

#### **`saveToRealtimeDB()`**
- **Účel:** Uloží připravená data do Firebase Realtime Database
- **Co dělá:**
  - Uloží data do `audio-metadata` nodu
  - Při chybě zkusí fallback do localStorage
  - Zobrazí uživateli výsledek operace
- **Výstup:** Uloží data do databáze nebo localStorage

#### **`saveToFirestore()`**
- **Účel:** Uloží data do Firestore (pro admin s oprávněními)
- **Co dělá:**
  - Uloží data do `audio-metadata` kolekce
  - Zpracuje chyby oprávnění
  - Zobrazí výsledek operace
- **Výstup:** Uloží data do Firestore

---

### **5. 🔧 POMOCNÉ FUNKCE**

#### **`estimateDuration(sizeInBytes)`**
- **Účel:** Odhadne délku audio souboru
- **Logika:** 1MB ≈ 1 minuta (60 sekund)
- **Výstup:** Délka v sekundách

#### **`formatFileSize(bytes)`**
- **Účel:** Formátuje velikost souboru do čitelného formátu
- **Příklad:** `1048576` → `"1 MB"`
- **Jednotky:** Bytes, KB, MB, GB

#### **`formatDuration(seconds)`**
- **Účel:** Formátuje délku do čitelného formátu
- **Příklad:** `125` → `"2:05"`
- **Formát:** `HH:MM:SS` nebo `MM:SS`

---

## 🎛️ UŽIVATELSKÉ ROZHRANÍ

### **📊 STATISTIKY**
- **Celkový počet souborů:** `audioStats.totalFiles`
- **Celková velikost:** `audioStats.totalSize`
- **Hudba soubory:** `audioStats.hudbaFiles` + `audioStats.hudbaSize`
- **Slova soubory:** `audioStats.slovaFiles` + `audioStats.slovaSize`

### **🔄 KONTROLY**
- **"Kontrola aktualizací"** - Spustí `checkForUpdates()`
- **"Připravit data"** - Spustí `prepareDataForRealtimeDB()`
- **"Uložit do Realtime DB"** - Spustí `saveToRealtimeDB()`
- **"Uložit do Firestore"** - Spustí `saveToFirestore()`
- **"Force Update"** - Vynutí aktualizaci i když data jsou aktuální

### **📈 STATUS INDIKÁTORY**
- **"Kontrola dat..."** - `updateStatus === 'checking'`
- **"Data jsou aktuální"** - `updateStatus === 'up-to-date'`
- **"Data potřebují aktualizaci"** - `updateStatus === 'needs-update'`
- **"Chyba při kontrole"** - `updateStatus === 'error'`

---

## 🔄 WORKFLOW ADMIN PANELU

### **1. AUTOMATICKÁ KONTROLA**
```
App start → checkForUpdates() → compareData() → updateStatus
```

### **2. MANUÁLNÍ AKTUALIZACE**
```
"Kontrola aktualizací" → checkForUpdates() →
"Připravit data" → prepareDataForRealtimeDB() →
"Uložit do Realtime DB" → saveToRealtimeDB()
```

### **3. FORCE UPDATE**
```
"Force Update" → prepareDataForRealtimeDB() →
"Uložit do Realtime DB" → saveToRealtimeDB()
```

---

## 🎯 CÍL ADMIN PANELU

**Hlavní účel:** Synchronizovat data mezi Firebase Storage (soubory) a Realtime Database (metadata) pro použití v aplikaci.

**Výsledek:** Aplikace může rychle načítat metadata z Realtime Database místo pomalého načítání z Firebase Storage.

**Datum analýzy:** ${new Date().toLocaleDateString('cs-CZ')}
**Analytik:** AI Assistant
**Verze:** 1.0.0

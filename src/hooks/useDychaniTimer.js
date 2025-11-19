import { useEffect, useRef } from 'react';

/**
 * Hook pro timer dýchání - odpočítávání času a čekání na dokončení cyklu
 *
 * @param {boolean} isBreathing - Zda probíhá dýchání
 * @param {number} breathTime - Aktuální zbývající čas v sekundách
 * @param {Function} setBreathTime - Funkce pro aktualizaci času
 * @param {string} breathPhase - Aktuální fáze dýchání ('in' nebo 'out')
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 * @param {string} breathFinalSound - Cesta k finálnímu zvuku
 * @param {Function} playFinalSound - Funkce pro přehrání finálního zvuku
 * @param {Function} setIsBreathing - Funkce pro zastavení dýchání
 */
export const useDychaniTimer = (
  isBreathing,
  breathTime,
  setBreathTime,
  breathPhase,
  breathInDuration,
  breathOutDuration,
  breathFinalSound,
  playFinalSound,
  setIsBreathing
) => {
  // Ref pro interval timeru
  const breathTimerIntervalRef = useRef(null);
  // Ref pro označení, že čekáme na dokončení dýchacího cyklu před finálním zvukem
  const waitingForCycleCompletionRef = useRef(false);
  // Ref pro timeout dokončení cyklu
  const completionTimeoutRef = useRef(null);
  // Ref pro uložení aktuální fáze při začátku čekání
  const waitingPhaseRef = useRef(null);
  // Ref pro uložení aktuální breathPhase (aby se useEffect nespouštěl při každé změně)
  const currentPhaseRef = useRef(breathPhase);
  // Refy pro uložení délek dýchání (aby se interval neresetoval při jejich změně)
  const breathInDurationRef = useRef(breathInDuration);
  const breathOutDurationRef = useRef(breathOutDuration);

  // Aktualizuj refy při změně hodnot
  useEffect(() => {
    currentPhaseRef.current = breathPhase;
  }, [breathPhase]);

  useEffect(() => {
    breathInDurationRef.current = breathInDuration;
  }, [breathInDuration]);

  useEffect(() => {
    breathOutDurationRef.current = breathOutDuration;
  }, [breathOutDuration]);

  // Timer logika pro dýchání - odpočítávání času
  useEffect(() => {
    // Pokud už interval běží, neruš ho - interval běží nezávisle a aktualizuje breathTime
    if (breathTimerIntervalRef.current) {
      return;
    }

    // Pokud dýchání neprobíhá nebo čekáme na dokončení cyklu, interval už neběží
    if (!isBreathing || waitingForCycleCompletionRef.current) {
      return;
    }

    // Spusť interval pro odpočítávání času
    breathTimerIntervalRef.current = setInterval(() => {
      // Zkontroluj na začátku každého ticku, zda už čekáme (ochrana proti duplicitnímu spuštění)
      if (waitingForCycleCompletionRef.current) {
        // Pokud už čekáme, zastav interval a ukonči
        if (breathTimerIntervalRef.current) {
          clearInterval(breathTimerIntervalRef.current);
          breathTimerIntervalRef.current = null;
        }
        return;
      }

      setBreathTime(prev => {
        // Pokud je čas 0 nebo méně, začni čekat na dokončení cyklu
        if (prev <= 0) {
          // Zkontroluj znovu, zda už čekáme (dvojitá ochrana)
          if (waitingForCycleCompletionRef.current) {
            return 0;
          }

          // Zastav interval OKAMŽITĚ
          if (breathTimerIntervalRef.current) {
            clearInterval(breathTimerIntervalRef.current);
            breathTimerIntervalRef.current = null;
          }

          // Označ, že čekáme na dokončení cyklu (PŘED nastavením timeoutu)
          waitingForCycleCompletionRef.current = true;

          // Použij aktuální fázi z refu (ne z props, aby se to neměnilo při re-renderu)
          const currentPhase = currentPhaseRef.current;

          // Ulož aktuální fázi pro výpočet čekacího času
          waitingPhaseRef.current = currentPhase;

          // Vypočti, kolik času zbývá do dokončení aktuální fáze (použij uloženou fázi a refy pro délky)
          const currentPhaseDuration = currentPhase === 'in' ? breathInDurationRef.current : breathOutDurationRef.current;
          const fadeOutDuration = 1.5; // Délka fade out
          const silenceDuration = 1.0; // 1 sekunda ticha před finálním zvukem
          const totalWaitTime = (currentPhaseDuration * 1000) + (fadeOutDuration * 1000) + (silenceDuration * 1000);

          // Vyčisti předchozí timeout, pokud existuje (ochrana proti duplicitnímu timeoutu)
          if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
          }

          // Počkej na dokončení aktuální fáze + fade out + 1 sekunda ticha, pak přehraj finální zvuk
          completionTimeoutRef.current = setTimeout(() => {
            if (breathFinalSound && breathFinalSound !== 'none') {
              playFinalSound();
            }
            setIsBreathing(false);
            waitingForCycleCompletionRef.current = false;
            waitingPhaseRef.current = null;
            completionTimeoutRef.current = null;
          }, totalWaitTime);

          return 0;
        }
        // Jinak sniž čas o 1 sekundu
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (breathTimerIntervalRef.current) {
        clearInterval(breathTimerIntervalRef.current);
        breathTimerIntervalRef.current = null;
      }
      // NEDELAJ cleanup timeoutu tady - to by mohlo zrušit timeout předčasně
      // Timeout se vyčistí buď když se dýchání zastaví, nebo po dokončení
    };
  }, [isBreathing, setBreathTime, setIsBreathing, breathFinalSound, playFinalSound]);

  // Vracíme refy pro případnou externí kontrolu (např. při zastavení)
  return {
    waitingForCycleCompletionRef,
    completionTimeoutRef
  };
};


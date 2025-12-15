import { useEffect, useRef, useState } from 'react';

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
 * @param {boolean} continueAfterEnd - Zda pokračovat v počítání po skončení
 */
export const useBreathTimer = (
  isBreathing,
  breathTime,
  setBreathTime,
  breathPhase,
  breathInDuration,
  breathOutDuration,
  breathFinalSound,
  playFinalSound,
  setIsBreathing,
  continueAfterEnd = false
) => {
  // Ref pro interval timeru
  const breathTimerIntervalRef = useRef(null);
  // Ref pro označení, že čekáme na dokončení dýchacího cyklu před finálním zvukem
  const waitingForCycleCompletionRef = useRef(false);
  // Ref pro timeout dokončení cyklu
  const completionTimeoutRef = useRef(null);
  // Ref pro uložení aktuální fáze (abychom ji měli stabilní v timeoutu)
  const currentPhaseRef = useRef(breathPhase);

  // Extra čas po doběhnutí nastaveného času (od 0 nahoru)
  const [extraTime, setExtraTime] = useState(0);
  const extraTimeRef = useRef(0);

  // Indikace, že nastavený čas už doběhl (breathTime <= 0) a jedeme extraTime
  const reachedEndRef = useRef(false);
  const endSoundScheduledRef = useRef(false);
  
  // Refy pro aktuální hodnoty finálního zvuku (pro použití v intervalu)
  const breathFinalSoundRef = useRef(breathFinalSound);
  const playFinalSoundRef = useRef(playFinalSound);
  
  // Aktualizuj refy při změně
  useEffect(() => {
    breathFinalSoundRef.current = breathFinalSound;
    playFinalSoundRef.current = playFinalSound;
  }, [breathFinalSound, playFinalSound]);

  // Aktualizuj ref při změně fáze
  useEffect(() => {
    currentPhaseRef.current = breathPhase;
  }, [breathPhase]);

  // Hlavní interval: buď odpočítává breathTime, nebo (po doběhnutí) počítá extraTime
  useEffect(() => {
    // Cleanup předchozího intervalu
    if (breathTimerIntervalRef.current) {
      clearInterval(breathTimerIntervalRef.current);
      breathTimerIntervalRef.current = null;
    }

    if (!isBreathing) {
      // Reset při stopu
      reachedEndRef.current = false;
      endSoundScheduledRef.current = false;
      waitingForCycleCompletionRef.current = false;
      extraTimeRef.current = 0;
      setExtraTime(0);
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      return;
    }

    breathTimerIntervalRef.current = setInterval(() => {
      // Pokud už jedeme extra režim, zvyšuj extraTime každou sekundu
      if (continueAfterEnd && reachedEndRef.current) {
        extraTimeRef.current += 1;
        setExtraTime(extraTimeRef.current);
        return;
      }

      // Standardní odpočet s detekcí přesného okamžiku dosažení 0
      setBreathTime(prev => {
        if (prev <= 0) return 0;
        const newTime = prev - 1;
        
        // Detekuj přesný okamžik, kdy breathTime dosáhne 0 (přechod z 1 na 0)
        // Toto zajistí, že finální zvuk se spustí přesně v momentě, kdy nastavená délka doběhne
        if (continueAfterEnd && newTime === 0 && !reachedEndRef.current) {
          reachedEndRef.current = true;
          extraTimeRef.current = 0;
          setExtraTime(0);
          
          // Spusť finální zvuk okamžitě při dosažení 0
          // Použijeme setTimeout(0) pro okamžité spuštění, ale stále zrušitelné
          if (!endSoundScheduledRef.current && breathFinalSoundRef.current && breathFinalSoundRef.current !== 'none') {
            endSoundScheduledRef.current = true;
            
            // Vyčisti předchozí timeout, pokud existuje
            if (completionTimeoutRef.current) {
              clearTimeout(completionTimeoutRef.current);
            }
            
            // setTimeout(0) spustí zvuk prakticky okamžitě, ale je zrušitelný
            completionTimeoutRef.current = setTimeout(() => {
              playFinalSoundRef.current();
              completionTimeoutRef.current = null;
            }, 0);
          }
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (breathTimerIntervalRef.current) {
        clearInterval(breathTimerIntervalRef.current);
        breathTimerIntervalRef.current = null;
      }
    };
  }, [isBreathing, continueAfterEnd, setBreathTime]);

  // Reakce na doběhnutí nastaveného času
  useEffect(() => {
    if (!isBreathing) return;

    // Režim "pokračovat po skončení": finální zvuk se spouští přímo v intervalu při přechodu z 1 na 0
    // Tento useEffect slouží jen jako fallback pro případ, že by se breathTime nastavil na 0 jinak
    if (continueAfterEnd) {
      if (!reachedEndRef.current && breathTime <= 0) {
        reachedEndRef.current = true;
        extraTimeRef.current = 0;
        setExtraTime(0);

        // Fallback: pokud se breathTime nastavil na 0 jinak než přes interval
        if (!endSoundScheduledRef.current && breathFinalSound && breathFinalSound !== 'none') {
          endSoundScheduledRef.current = true;
          playFinalSound();
        }
      }

      return;
    }

    // Režim bez pokračování: při breathTime <= 0 čekej na dokončení fáze a pak zastav
    if (!continueAfterEnd && breathTime <= 0 && !waitingForCycleCompletionRef.current) {
      waitingForCycleCompletionRef.current = true;

      const currentPhase = currentPhaseRef.current;
      const currentPhaseDuration = currentPhase === 'in' ? breathInDuration : breathOutDuration;
      const fadeOutDuration = 1.5;
      const silenceDuration = 1.0;
      const totalWaitTime = (currentPhaseDuration + fadeOutDuration + silenceDuration) * 1000;

      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }

      completionTimeoutRef.current = setTimeout(() => {
        if (breathFinalSound && breathFinalSound !== 'none') {
          playFinalSound();
        }
        setIsBreathing(false);
        waitingForCycleCompletionRef.current = false;
        completionTimeoutRef.current = null;
      }, totalWaitTime);
    }
  }, [
    isBreathing,
    breathTime,
    continueAfterEnd,
    breathInDuration,
    breathOutDuration,
    breathFinalSound,
    playFinalSound,
    setIsBreathing
  ]);


  // Vracíme refy pro případnou externí kontrolu (např. při zastavení) a čas navíc
  return {
    waitingForCycleCompletionRef,
    completionTimeoutRef,
    extraTime
  };
};


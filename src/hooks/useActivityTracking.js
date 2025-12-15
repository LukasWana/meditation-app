import { useEffect, useRef } from 'react';
import activityHistoryService from '@services/activityHistoryService';
import { useAuth } from '@contexts/AuthContext';
import log from '@services/logger';

/**
 * Hook pro automatické sledování a ukládání historie aktivity
 *
 * @param {Object} options
 * @param {string} options.section - Sekce aktivity ('meditation' | 'music' | 'breathing')
 * @param {boolean} options.isActive - Zda je aktivita aktivní (běží)
 * @param {Object} options.metadata - Metadata aktivity (specifické pro každou sekci)
 * @param {Function} options.getDescription - Funkce pro generování popisu aktivity
 */
export const useActivityTracking = ({
  section,
  isActive,
  metadata = {},
  getDescription = null
}) => {
  const { user } = useAuth();
  const userId = user?.uid || 'anonymous';
  const isDev = import.meta?.env?.MODE === 'development';

  const startTimeRef = useRef(null);
  const previousActiveRef = useRef(isActive); // Inicializuj s aktuální hodnotou
  const activityIdRef = useRef(null);
  const sectionRef = useRef(section);
  const metadataRef = useRef(metadata);
  const getDescriptionRef = useRef(getDescription);
  const extraTimeRef = useRef(0); // Ref pro uchování extraTime při ukončení aktivity

  // Aktualizuj refy při změně
  useEffect(() => {
    sectionRef.current = section;
    metadataRef.current = metadata;
    getDescriptionRef.current = getDescription;
    // Aktualizuj extraTime ref při změně metadat
    if (metadata?.extraTime !== undefined) {
      extraTimeRef.current = metadata.extraTime || 0;
    }
  }, [section, metadata, getDescription]);

  // Sleduj změny isActive
  useEffect(() => {
    const wasActive = previousActiveRef.current;
    const isNowActive = isActive;
    const currentSection = sectionRef.current;
    const currentMetadata = metadataRef.current;
    const currentGetDescription = getDescriptionRef.current;

    // Vždy loguj pro meditaci (pro diagnostiku)
    if (currentSection === 'meditation') {
      console.log('🕯️ Meditation tracking:', {
        section: currentSection,
        wasActive,
        isNowActive,
        hasStartTime: startTimeRef.current !== null,
        userId
      });
    }

    // Debug logování pro diagnostiku (jen v dev)
    if (wasActive !== isNowActive) {
      if (isDev) {
        console.log('Activity state changed:', {
          section: currentSection,
          wasActive,
          isNowActive,
          hasStartTime: startTimeRef.current !== null
        });
      }
      log.debug('Activity state changed:', {
        section: currentSection,
        wasActive,
        isNowActive,
        hasStartTime: startTimeRef.current !== null
      });
    }

    // Aktivita začala
    if (!wasActive && isNowActive) {
      startTimeRef.current = Date.now();
      activityIdRef.current = activityHistoryService.generateActivityId();
      if (isDev || currentSection === 'meditation') {
        console.log('▶️ Activity started:', {
          section: currentSection,
          activityId: activityIdRef.current,
          metadata: currentMetadata,
          userId
        });
      }
      log.debug('Activity started:', {
        section: currentSection,
        activityId: activityIdRef.current,
        metadata: currentMetadata
      });
    }

    // Aktivita skončila
    if (wasActive && !isNowActive && startTimeRef.current !== null) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000); // v sekundách
      // extraTime ukládáme jako samostatnou proměnnou (NEpřičítat k duration, duration už je reálný čas aktivity)
      // Použij aktuální extraTime z metadat (může být aktuálnější než ref)
      const extraTime = currentMetadata?.extraTime !== undefined ? currentMetadata.extraTime : (extraTimeRef.current || 0);

      // Ulož aktivitu pouze pokud trvala alespoň 1 sekundu (aby se neukládaly velmi krátké aktivity)
      if (duration >= 1) {
        // Generuj popis aktivity
        let description = '';
        if (currentGetDescription && typeof currentGetDescription === 'function') {
          description = currentGetDescription(currentMetadata, duration);
        } else {
          description = generateDefaultDescription(currentSection, currentMetadata, duration);
        }

      if (isDev || currentSection === 'meditation') {
        console.log('💾 Saving activity:', {
          section: currentSection,
          duration,
          description,
          activityId: activityIdRef.current,
          userId
        });
      }
      log.debug('Saving activity:', {
        section: currentSection,
        duration,
        description,
        activityId: activityIdRef.current
      });

      // Ulož aktivitu
      activityHistoryService.saveActivity(userId, {
        id: activityIdRef.current,
        section: currentSection,
        description,
        duration,
        extraTime: extraTime > 0 ? extraTime : 0, // Čas navíc jako top-level proměnná
        metadata: {
          ...currentMetadata,
          durationSeconds: duration,
          extraTime: extraTime > 0 ? extraTime : undefined // Ulož extraTime také v metadatech, pokud je větší než 0
        }
      }).then(() => {
        if (isDev || currentSection === 'meditation') {
          console.log('✅ Activity saved successfully:', { section: currentSection, duration, userId });
        }
        log.debug('Activity saved successfully:', { section: currentSection, duration });
      }).catch(error => {
        if (isDev || currentSection === 'meditation') {
          console.error('❌ Failed to save activity:', error, { section: currentSection, userId });
        }
        log.error('Failed to save activity:', error);
      });
      } else {
        log.debug('Activity too short, not saving:', { section: currentSection, duration });
      }

      // Reset
      startTimeRef.current = null;
      activityIdRef.current = null;
      log.debug('Activity ended:', { section: currentSection, duration });
    }

    previousActiveRef.current = isNowActive;
  }, [isActive, userId]);

  // Cleanup při unmount - ulož aktivitu pokud ještě běží
  useEffect(() => {
    return () => {
      if (startTimeRef.current !== null && previousActiveRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const currentSection = sectionRef.current;
        const currentMetadata = metadataRef.current;
        const currentGetDescription = getDescriptionRef.current;

        // Použij extraTime z refu (duration už extra zahrnuje)
        const extraTime = extraTimeRef.current || 0;

        let description = '';
        if (currentGetDescription && typeof currentGetDescription === 'function') {
          description = currentGetDescription(currentMetadata, duration);
        } else {
          description = generateDefaultDescription(currentSection, currentMetadata, duration);
        }

        activityHistoryService.saveActivity(userId, {
          id: activityIdRef.current || activityHistoryService.generateActivityId(),
          section: currentSection,
          description,
          duration,
          extraTime: extraTime > 0 ? extraTime : 0, // Čas navíc jako top-level proměnná
          metadata: {
            ...currentMetadata,
            durationSeconds: duration,
            extraTime: extraTime > 0 ? extraTime : undefined // Ulož extraTime také v metadatech, pokud je větší než 0
          }
        }).catch(error => {
          log.error('Failed to save activity on unmount:', error);
        });
      }
    };
  }, [userId]);
};

/**
 * Generuje výchozí popis aktivity podle sekce
 */
function generateDefaultDescription(section, metadata, duration) {
  const durationMinutes = Math.floor(duration / 60);
  const durationSeconds = duration % 60;
  const durationStr = durationMinutes > 0
    ? `${durationMinutes} min${durationSeconds > 0 ? ` ${durationSeconds}s` : ''}`
    : `${durationSeconds}s`;

  switch (section) {
    case 'meditation': {
      const selectedDuration = metadata.selectedDuration || metadata.duration || '?';
      const breathIn = metadata.breathInDuration || '?';
      const breathOut = metadata.breathOutDuration || '?';
      return `Meditace ${selectedDuration} min, rytmus ${breathIn}:${breathOut}`;
    }

    case 'music': {
      const title = metadata.title || metadata.trackName || 'Neznámá skladba';
      const albumName = metadata.albumName || metadata.album;
      if (albumName) {
        return `${title} - ${albumName}`;
      }
      return title;
    }

    case 'breathing': {
      const breathDuration = metadata.breathDuration || '?';
      const breathIn = metadata.breathInDuration || '?';
      const breathOut = metadata.breathOutDuration || '?';
      const prepTime = metadata.preparationTime || 0;
      let desc = `Dýchání ${breathDuration} min, rytmus ${breathIn}:${breathOut}`;
      if (prepTime > 0) {
        desc += `, příprava ${prepTime}s`;
      }
      return desc;
    }

    default:
      return `Aktivita v sekci ${section} (${durationStr})`;
  }
}

export default useActivityTracking;


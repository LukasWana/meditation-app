import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import ShaderPreview from './ShaderPreview';
import { getShaderList } from '@utils/shaderLoader';
import { generateShaderPreviews } from '@utils/previewGenerator';

// Cache klíč pro localStorage
const SHADER_PREVIEWS_CACHE_KEY = 'shader_previews_cache';

// Pomocná funkce pro vytvoření hash z řetězce
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Převeď na 32bit integer
  }
  return hash.toString();
};

/**
 * Galerie shaderů - zobrazuje shadery z vybrané kategorie
 * Používá statické náhledy místo živých canvasů pro lepší výkon
 */
const ShaderGallery = ({ selectedVariant, onSelect, category }) => {
  const [shaders, setShaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shaderPreviews, setShaderPreviews] = useState({});
  const [remotePreviews, setRemotePreviews] = useState({});
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const shadersRef = useRef([]); // Ref pro aktuální seznam shaderů
  const remoteServiceRef = useRef(null);

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const init = async () => {
      try {
        const { realtimeShaderPreviewService } = await import('@services/realtimeShaderPreviewService');
        if (!isMounted) return;

        remoteServiceRef.current = realtimeShaderPreviewService;

        const initial = await realtimeShaderPreviewService.fetchAll();
        if (!isMounted) return;
        setRemotePreviews(initial || {});

        unsubscribe = realtimeShaderPreviewService.subscribeAll((data) => {
          if (!isMounted) return;
          setRemotePreviews(data || {});
        });
      } catch (err) {
        console.error('Failed to initialise realtime shader preview service', err);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);
  // Načti cache z localStorage
  const loadCache = useCallback(() => {
    try {
      const cachedData = JSON.parse(localStorage.getItem(SHADER_PREVIEWS_CACHE_KEY) || '{}');
      return cachedData.previews || {};
    } catch (e) {
      console.error('Failed to load preview cache:', e);
      return {};
    }
  }, []);

  // Ulož náhled do cache
  const savePreviewToCache = useCallback((id, payload = {}, shaderInfo = null) => {
    try {
      const cachedData = JSON.parse(localStorage.getItem(SHADER_PREVIEWS_CACHE_KEY) || '{}');
      if (!cachedData.previews) {
        cachedData.previews = {};
      }

      let hash = payload.hash || null;
      if (!hash && shaderInfo) {
        if (shaderInfo.path) {
          hash = simpleHash(shaderInfo.path);
        } else if (shaderInfo.variant) {
          hash = simpleHash(shaderInfo.variant);
        } else {
          hash = simpleHash(shaderInfo.id || id);
        }
      }

      cachedData.previews[id] = {
        ...(cachedData.previews[id] || {}),
        ...payload,
        hash,
        timestamp: Date.now()
      };

      localStorage.setItem(SHADER_PREVIEWS_CACHE_KEY, JSON.stringify(cachedData));
    } catch (e) {
      console.error('Failed to save preview to cache:', e);
    }
  }, []);

  // Callback pro vygenerovaný náhled
  const handlePreviewGenerated = useCallback((id, dataUrl) => {
    setShaderPreviews(prev => {
      // Zkontroluj, zda už náhled není v state (aby se předešlo zbytečným re-renderům)
      if (prev[id] === dataUrl) {
        return prev;
      }
      return { ...prev, [id]: dataUrl };
    });

    // Najdi shader info pro uložení do cache - použij ref místo state
    const shaderInfo = shadersRef.current.find(s => s.id === id);
    if (shaderInfo) {
      savePreviewToCache(id, { dataUrl, source: 'local' }, shaderInfo);
    }
  }, [savePreviewToCache]);

  // Generuj náhledy pro shadery, které je ještě nemají
  const generateMissingPreviews = useCallback(async (shaderList) => {
    const cachedPreviews = loadCache();
    const previewsToSet = {};
    const shadersToGenerate = [];

    for (const shader of shaderList) {
      const remoteMeta = remotePreviews?.[shader.id];

      if (remoteMeta && remoteMeta.previewUrl) {
        const remoteUrl = remoteMeta.etag
          ? `${remoteMeta.previewUrl}?v=${remoteMeta.etag}`
          : remoteMeta.previewUrl;
        previewsToSet[shader.id] = remoteUrl;
        savePreviewToCache(
          shader.id,
          {
            previewUrl: remoteUrl,
            etag: remoteMeta.etag || null,
            source: 'remote',
            hash: remoteMeta.etag ? simpleHash(remoteMeta.etag) : simpleHash(remoteMeta.previewUrl || shader.id)
          },
          shader
        );
        continue;
      }

      const cached = cachedPreviews[shader.id];
      if (cached) {
        if (cached.source === 'remote' && cached.previewUrl) {
          previewsToSet[shader.id] = cached.previewUrl;
          continue;
        }
        if (cached.dataUrl) {
          const reference = shader.path
            ? simpleHash(shader.path)
            : simpleHash(shader.variant || shader.id);
          if (cached.hash === reference) {
            previewsToSet[shader.id] = cached.dataUrl;
            continue;
          }
        }
      }

      shadersToGenerate.push(shader);
    }

    if (Object.keys(previewsToSet).length > 0) {
      setShaderPreviews(prev => {
        let hasChanges = false;
        const next = { ...prev };
        Object.entries(previewsToSet).forEach(([id, value]) => {
          if (next[id] !== value) {
            next[id] = value;
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }

    if (shadersToGenerate.length > 0) {
      setIsGeneratingPreviews(true);
      await generateShaderPreviews(
        shadersToGenerate,
        handlePreviewGenerated,
        (id, current, total) => {
          if (current === total) {
            setIsGeneratingPreviews(false);
          }
        }
      );
    }
  }, [loadCache, remotePreviews, savePreviewToCache, handlePreviewGenerated]);

  useEffect(() => {
    if (!shadersRef.current.length) {
      return;
    }
    generateMissingPreviews(shadersRef.current);
  }, [remotePreviews, generateMissingPreviews]);

  useEffect(() => {
    setIsLoading(true);
    let shaderList = [];

    if (category === 'shaders') {
      shaderList = getShaderList();
    } else {
      // Výchozí vestavěné shadery
      shaderList = [
        { id: 'default', name: 'Default', variant: 'default' },
        { id: 'meditace', name: 'Meditace', variant: 'meditace' },
        { id: 'dychani', name: 'Dýchání', variant: 'dychani' },
        { id: 'hudba', name: 'Hudba', variant: 'hudba' },
        { id: 'settings', name: 'Settings', variant: 'settings' }
      ];
    }

    setShaders(shaderList);
    shadersRef.current = shaderList; // Aktualizuj ref

    // Načti cache a generuj chybějící náhledy
    generateMissingPreviews(shaderList).then(() => {
      setIsLoading(false);
    });
  }, [category, generateMissingPreviews]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        Načítání shaderů...
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {isGeneratingPreviews && (
        <div style={{
          textAlign: 'center',
          padding: '8px',
          color: '#666',
          fontSize: '12px',
          fontStyle: 'italic'
        }}>
          Generování náhledů...
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '12px',
          padding: '8px 0'
        }}
      >
        {shaders.map((shader) => {
          const isSelected = selectedVariant === shader.id || selectedVariant === shader.variant;
          const previewSrc = shaderPreviews[shader.id];

          return (
            <motion.div
              key={shader.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {previewSrc ? (
                // Zobraz statický náhled jako obrázek
                <div
                  onClick={() => onSelect && onSelect(shader.id)}
                  style={{
                    width: '100%',
                    paddingTop: '100%',
                    position: 'relative',
                    cursor: onSelect ? 'pointer' : 'default',
                    border: isSelected ? '3px solid #000' : '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: '#f4ddc4',
                    transition: 'border-color 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <img
                    key={shader.id} // Přidáno key pro stabilitu
                    src={previewSrc}
                    alt={`${shader.name} preview`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      pointerEvents: 'none' // Zabraňuje interakci s obrázkem
                    }}
                    loading="lazy"
                    onError={(e) => {
                      // Pokud se obrázek nenačte, zobraz fallback
                      console.warn(`Preview image failed to load for ${shader.id}`);
                      e.target.style.display = 'none';
                    }}
                  />
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        border: '2px solid #000',
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                </div>
              ) : (
                // Fallback na živý canvas, pokud náhled ještě není vygenerován
                <ShaderPreview
                  key={`fallback-${shader.id}`} // Přidáno key pro stabilitu
                  variant={shader.variant}
                  shaderPath={shader.path}
                  size={100}
                  isSelected={isSelected}
                  onClick={() => onSelect && onSelect(shader.id)}
                  intensity={0.8}
                />
              )}
              <span
                style={{
                  fontSize: '12px',
                  textAlign: 'center',
                  color: isSelected ? '#000' : '#666',
                  fontWeight: isSelected ? '600' : '400',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={shader.name}
              >
                {shader.name}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ShaderGallery;

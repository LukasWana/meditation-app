import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import ShaderPreview from './ShaderPreview';
import { useLanguage } from '@contexts/LanguageContext';
import { getMiniShaderList, getShaderList } from '@utils/shaderLoader';
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
const ShaderGallery = ({ selectedVariant, onSelect, section, category }) => {
  const { t } = useLanguage();
  const [shaders, setShaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shaderPreviews, setShaderPreviews] = useState({});
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const shadersRef = useRef([]); // Ref pro aktuální seznam shaderů

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
  const savePreviewToCache = useCallback((id, dataUrl, shaderInfo) => {
    try {
      const cachedData = JSON.parse(localStorage.getItem(SHADER_PREVIEWS_CACHE_KEY) || '{}');
      if (!cachedData.previews) {
        cachedData.previews = {};
      }

      // Vytvoř hash pro detekci změn
      let hash = null;
      if (shaderInfo.path) {
        // Pro shadery ze souborů použij cestu jako hash
        hash = simpleHash(shaderInfo.path);
      } else if (shaderInfo.variant) {
        // Pro vestavěné shadery použij variant jako hash
        hash = simpleHash(shaderInfo.variant);
      }

      cachedData.previews[id] = {
        dataUrl,
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
      savePreviewToCache(id, dataUrl, shaderInfo);
    }
  }, [savePreviewToCache]);

  // Generuj náhledy pro shadery, které je ještě nemají
  const generateMissingPreviews = useCallback(async (shaderList) => {
    const cachedPreviews = loadCache();
    const shadersToGenerate = [];
    const previewsToSet = {};

    for (const shader of shaderList) {
      const cached = cachedPreviews[shader.id];
      let needsGeneration = true;

      if (cached && cached.dataUrl) {
        // Zkontroluj, zda je cache stále platná
        if (shader.path) {
          const currentHash = simpleHash(shader.path);
          if (cached.hash === currentHash) {
            // Cache je platná, použij ji
            previewsToSet[shader.id] = cached.dataUrl;
            needsGeneration = false;
          }
        } else if (shader.variant) {
          const currentHash = simpleHash(shader.variant);
          if (cached.hash === currentHash) {
            // Cache je platná, použij ji
            previewsToSet[shader.id] = cached.dataUrl;
            needsGeneration = false;
          }
        }
      }

      if (needsGeneration) {
        shadersToGenerate.push(shader);
      }
    }

    // Nastav všechny cached náhledy najednou (aby se předešlo zbytečným re-renderům)
    if (Object.keys(previewsToSet).length > 0) {
      setShaderPreviews(prev => {
        // Zkontroluj, zda se něco změnilo
        const hasChanges = Object.keys(previewsToSet).some(id => prev[id] !== previewsToSet[id]);
        if (!hasChanges) {
          return prev;
        }
        return { ...prev, ...previewsToSet };
      });
    }

    // Generuj náhledy pro shadery, které je potřebují
    if (shadersToGenerate.length > 0) {
      setIsGeneratingPreviews(true);
      await generateShaderPreviews(
        shadersToGenerate,
        handlePreviewGenerated,
        (id, current, total) => {
          // Progress callback - můžeme použít pro zobrazení progress baru
          if (current === total) {
            setIsGeneratingPreviews(false);
          }
        }
      );
    }
  }, [loadCache, handlePreviewGenerated]);

  useEffect(() => {
    setIsLoading(true);
    let shaderList = [];

    if (category === 'mini-shaders') {
      shaderList = getMiniShaderList();
    } else if (category === 'shaders') {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]); // Pouze category jako dependency - generateMissingPreviews se nemění

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
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '16px',
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
                    width: 120,
                    height: 120,
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
                  size={120}
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

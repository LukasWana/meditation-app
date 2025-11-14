import { useState, useEffect, useMemo } from 'react';
import { loadShader, convertShaderToWebGL } from '@utils/shaderLoader';

/**
 * Hook pro načítání shaderů ze souborů
 * Spravuje načítání shader kódu a konverzi na WebGL
 */
export const useShaderLoader = (variant, isFileShader) => {
  const [loadedShaderCode, setLoadedShaderCode] = useState(null);
  const [shaderError, setShaderError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Urči, zda je variant file shader
  const effectiveIsFileShader = useMemo(() => {
    return isFileShader || (variant && (variant.startsWith('shader-') || variant.startsWith('mini-')));
  }, [variant, isFileShader]);

  // Načti shader ze souboru
  useEffect(() => {
    if (!effectiveIsFileShader || !variant) {
      setLoadedShaderCode(null);
      setShaderError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setShaderError(null);

    const loadShaderFile = async () => {
      try {
        // Urči cestu k shaderu
        let shaderPath;
        if (variant.startsWith('shader-')) {
          const shaderName = variant.replace('shader-', '');
          shaderPath = `/src/assets/shaders/${shaderName}.ts`;
        } else if (variant.startsWith('mini-')) {
          const miniName = variant.replace('mini-', '');
          shaderPath = `/src/assets/mini-shaders/${miniName}.glsl`;
        } else {
          throw new Error(`Invalid shader variant: ${variant}`);
        }

        // Načti shader
        const shaderCode = await loadShader(shaderPath);
        if (!shaderCode) {
          throw new Error(`Failed to load shader from: ${shaderPath}`);
        }

        // Konvertuj na WebGL (bez WebGL verze, bude určeno později)
        const convertedCode = convertShaderToWebGL(shaderCode, shaderPath, false);
        setLoadedShaderCode(convertedCode);
        setShaderError(null);
      } catch (error) {
        console.error('Error loading shader:', error);
        setShaderError(error.message || 'Failed to load shader');
        setLoadedShaderCode(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadShaderFile();
  }, [variant, effectiveIsFileShader]);

  return {
    loadedShaderCode,
    shaderError,
    isLoading,
    isFileShader: effectiveIsFileShader
  };
};


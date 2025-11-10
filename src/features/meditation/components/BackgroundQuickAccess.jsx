import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import BackgroundShader from '@components/BackgroundShader';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import BackgroundSettingsControls from './BackgroundSettingsControls';

const FALLBACK_COLOR = '#f4ddc4';

const BackgroundQuickAccess = ({ section, className = '' }) => {
  const {
    getShaderForSection,
    getColorForSection,
    getOverlaySettings
  } = useShaderSettings();

  const colorValue = useMemo(
    () => getColorForSection(section) || FALLBACK_COLOR,
    [getColorForSection, section]
  );

  const selectedShader = useMemo(
    () => getShaderForSection(section) || section,
    [getShaderForSection, section]
  );

  const overlaySettings = getOverlaySettings(section) || {};

  const renderShaderPreview = useCallback(
    () => {
      const isColorOnly =
        !selectedShader ||
        selectedShader === 'default' ||
        selectedShader.startsWith('__COLOR__');

      if (isColorOnly) {
        const shaderColor = selectedShader?.startsWith('__COLOR__')
          ? selectedShader.replace('__COLOR__', '')
          : colorValue;

        return (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${shaderColor}, ${shaderColor}80)`
            }}
          />
        );
      }

      return (
        <div className="absolute inset-0 pointer-events-none">
          <BackgroundShader
            variant={selectedShader}
            intensity={overlaySettings.intensity ?? 0.8}
            opacity={overlaySettings.opacity ?? 0.9}
            enabled={true}
            forceSquare={true}
            zIndex={0}
          />
        </div>
      );
    },
    [selectedShader, overlaySettings.intensity, overlaySettings.opacity, colorValue]
  );

  const triggerRenderer = useCallback(
    ({ toggleOpen, isOpen }) => (
      <motion.button
        onClick={toggleOpen}
        type="button"
        aria-label="Změnit pozadí"
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center transition-shadow duration-200 ${
          isOpen ? 'shadow-lg ring-2 ring-gray-300' : 'hover:shadow-md'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-1 sm:inset-1.5 rounded-full overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background: colorValue,
              clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'
            }}
          >
            {renderShaderPreview()}
          </div>
          <div className="absolute inset-y-1.5 sm:inset-y-2 left-1/2 w-[2px] bg-white/80 backdrop-blur" />
        </div>
      </motion.button>
    ),
    [colorValue, renderShaderPreview]
  );

  return (
    <BackgroundSettingsControls
      section={section}
      wrapperClassName={`w-auto ${className}`}
      buttonClassName="hidden"
      triggerRenderer={triggerRenderer}
    />
  );
};

export default BackgroundQuickAccess;


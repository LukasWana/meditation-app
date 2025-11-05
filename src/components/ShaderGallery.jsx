import React from 'react';
import { motion } from 'framer-motion';
import ShaderPreview from './ShaderPreview';
import { useLanguage } from '@contexts/LanguageContext';

/**
 * Galerie shaderů - zobrazuje všechny dostupné shadery jako čtvercové náhledy
 */
const ShaderGallery = ({ selectedVariant, onSelect, section }) => {
  const { t } = useLanguage();

  // Všechny dostupné shadery
  const shaders = [
    { variant: 'default', name: 'Default' },
    { variant: 'meditation', name: 'Meditation' },
    { variant: 'breath', name: 'Breath' },
    { variant: 'hudba', name: 'Hudba' },
    { variant: 'settings', name: 'Settings' }
  ];

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '16px',
          padding: '8px 0'
        }}
      >
        {shaders.map((shader) => (
          <motion.div
            key={shader.variant}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShaderPreview
              variant={shader.variant}
              size={120}
              isSelected={selectedVariant === shader.variant}
              onClick={() => onSelect && onSelect(shader.variant)}
              intensity={0.8}
            />
            <span
              style={{
                fontSize: '14px',
                textAlign: 'center',
                color: selectedVariant === shader.variant ? '#000' : '#666',
                fontWeight: selectedVariant === shader.variant ? '600' : '400'
              }}
            >
              {shader.name}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ShaderGallery;


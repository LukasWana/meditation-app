import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@contexts/LanguageContext';

/**
 * Komponenta pro výběr kategorie shaderů
 */
const ShaderCategorySelector = ({ selectedCategory, onSelect }) => {
  const { t } = useLanguage();

  const categories = [
    { id: 'mini-shaders', name: 'Mini Shaders', count: 63 },
    { id: 'shaders', name: 'Shaders', count: 30 }
  ];

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '8px 0'
        }}
      >
        {categories.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect && onSelect(category.id)}
            style={{
              padding: '24px',
              backgroundColor: selectedCategory === category.id ? '#000' : 'rgba(255, 255, 255, 0.5)',
              border: '2px solid',
              borderColor: selectedCategory === category.id ? '#000' : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: selectedCategory === category.id ? '#fff' : '#000',
                marginBottom: '8px'
              }}
            >
              {category.name}
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: selectedCategory === category.id ? 'rgba(255, 255, 255, 0.7)' : '#666',
                margin: 0
              }}
            >
              {category.count} shaderů
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ShaderCategorySelector;


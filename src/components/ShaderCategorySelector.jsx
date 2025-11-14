import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@hooks/useTheme';

/**
 * Komponenta pro výběr kategorie shaderů
 */
const ShaderCategorySelector = ({ selectedCategory, onSelect }) => {
  const theme = useTheme();

  const categories = [
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
              padding: theme.spacing.lg,
              backgroundColor: selectedCategory === category.id ? theme.colors.black : theme.colors.overlay.white50,
              border: '2px solid',
              borderColor: selectedCategory === category.id ? theme.colors.black : theme.colors.overlay.black20,
              borderRadius: theme.borderRadius.lg,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <h3
              style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.semibold,
                color: selectedCategory === category.id ? theme.colors.white : theme.colors.black,
                marginBottom: theme.spacing.sm
              }}
            >
              {category.name}
            </h3>
            <p
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: selectedCategory === category.id ? theme.colors.overlay.white70 : theme.colors.gray[600],
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


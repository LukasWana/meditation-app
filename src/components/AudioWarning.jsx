import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@hooks/useTheme';

const AudioWarning = ({ isVisible, onClose, onActivateAudio }) => {
  const theme = useTheme();

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 right-4 rounded-lg p-4 shadow-lg max-w-md mx-auto border"
        style={{
          backgroundColor: theme.colors.blue[100],
          borderColor: theme.colors.blue[400],
          zIndex: theme.zIndex.fixed
        }}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6"
              style={{ color: theme.colors.blue[600] }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3
              className="text-sm font-medium mb-1"
              style={{ color: theme.colors.blue[800] }}
            >
              Aktivace zvuku
            </h3>
            <p
              className="text-sm mb-3"
              style={{ color: theme.colors.blue[700] }}
            >
              Pro spuštění zvuku je potřeba nejprve aktivovat audio systém.
              Klikněte na tlačítko níže.
            </p>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onActivateAudio(e);
                }}
                className="text-sm text-white px-4 py-2 rounded transition-colors font-medium"
                style={{ backgroundColor: theme.colors.blue[500] }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.blue[600];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.blue[500];
                }}
              >
                🎵 Aktivovat zvuk
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{
                  backgroundColor: theme.colors.blue[200],
                  color: theme.colors.blue[800]
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.blue[300];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.blue[200];
                }}
              >
                Později
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="flex-shrink-0"
            style={{ color: theme.colors.blue[600] }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.colors.blue[800];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.colors.blue[600];
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AudioWarning;

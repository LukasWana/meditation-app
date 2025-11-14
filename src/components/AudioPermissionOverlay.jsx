import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, getOverlayColor, getCardClasses } from '@hooks/useTheme';

const AudioPermissionOverlay = ({
  isVisible,
  onRequestPermission,
  onClose,
  isRequesting = false
}) => {
  const theme = useTheme();
  const cardClasses = getCardClasses('default');
  const [isHovered, setIsHovered] = useState(false);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 backdrop-blur-sm flex items-center justify-center"
        style={{
          zIndex: theme.zIndex.modal,
          backgroundColor: getOverlayColor('black', 80)
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`rounded-2xl p-8 mx-4 max-w-md w-full text-center shadow-2xl border ${cardClasses}`}
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.overlay.black10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="mb-6">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center border"
              style={{
                backgroundColor: theme.colors.overlay.white50,
                borderColor: theme.colors.overlay.black10,
              }}
            >
              <svg
                className="w-10 h-10"
                style={{ color: theme.colors.black }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.light,
              color: theme.colors.black,
              marginBottom: theme.spacing.md
            }}
          >
            Povolení zvuku
          </h2>

          {/* Description */}
          <p
            className="mb-8 leading-relaxed"
            style={{
              color: theme.colors.gray[700],
              fontSize: theme.typography.fontSize.lg
            }}
          >
            Pro přehrávání meditačních nahrávek potřebujeme povolení zvuku.
            <br />
            Klikněte na tlačítko níže pro povolení.
          </p>

          {/* Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={onRequestPermission}
            disabled={isRequesting}
            className="w-full font-medium py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3"
            style={{
              backgroundColor: isRequesting ? theme.colors.gray[400] : theme.colors.black,
              color: theme.colors.white,
              fontSize: theme.typography.fontSize.lg
            }}
            onMouseEnter={(e) => {
              if (!isRequesting) {
                e.currentTarget.style.backgroundColor = theme.colors.gray[800];
              }
            }}
            onMouseLeave={(e) => {
              if (!isRequesting) {
                e.currentTarget.style.backgroundColor = theme.colors.black;
              }
            }}
          >
            {isRequesting ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Povoluji...</span>
              </>
            ) : (
              <>
                <motion.svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </motion.svg>
                <span>Povolit zvuk</span>
              </>
            )}
          </motion.button>

          {/* Note */}
          <p
            className="mt-6 leading-relaxed"
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.gray[600]
            }}
          >
            Toto povolení je nutné kvůli bezpečnostním politikám prohlížeče.
            <br />
            Po povolení bude zvuk fungovat okamžitě.
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            className="mt-4 underline"
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.gray[500]
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.colors.gray[700];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.colors.gray[500];
            }}
          >
            Zavřít (bez povolení zvuku)
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AudioPermissionOverlay;

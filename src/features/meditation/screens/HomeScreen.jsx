import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FramerPageTransition } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
// useTouchPreloader odstraněn - nepoužívaný

const HomeScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  audioPermission
}) => {
  const { t } = useLanguage();

  // Touch preloading odstraněn - nepoužívaný

  // Aktivuj audio permission při prvním renderu HomeScreen
  useEffect(() => {
    if (audioPermission?.handleUserInteraction) {
      // Simuluj user interaction pro aktivaci audio permission
      audioPermission.handleUserInteraction();
    }
  }, [audioPermission]);

  return (
    <FramerPageTransition screenKey="home">
      <motion.div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col overflow-x-hidden overflow-y-auto"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ minHeight: '100vh' }}
      >
        <motion.div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer relative"
          onClick={() => onNavigateToScreen('meditace')}
          onTouchStart={onTouchStart}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
            >
              {t('meditace') || 'meditace'}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer"
          onClick={() => onNavigateToScreen('hudba')}
          onTouchStart={onTouchStart}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
            >
              {t('hudba')}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer"
          onClick={() => onNavigateToScreen('dychani')}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
            >
              {t('dychani') || t('dychanie') || 'dýchání'}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer"
          onClick={() => onNavigateToScreen('settings')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
            >
              {t('nastavenie')}
            </div>
          </motion.div>
        </motion.div>

      </motion.div>
    </FramerPageTransition>
  );
};

export default HomeScreen;

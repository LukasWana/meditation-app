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
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col overflow-x-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ height: '100vh' }}
      >
        <motion.div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer relative"
          onClick={() => onNavigateToScreen('slova')}
          onTouchStart={onTouchStart}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.15, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              {t('slova')}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer"
          onClick={() => onNavigateToScreen('hudba')}
          onTouchStart={onTouchStart}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.15, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              {t('hudba')}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer"
          onClick={() => onNavigateToScreen('meditation')}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.15, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide mb-4 py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              {t('meditacia')}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer"
          onClick={() => onNavigateToScreen('settings')}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.15, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
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

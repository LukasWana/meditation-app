import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@contexts/LanguageContext';
import SlovakiaFlagUrl from '@assets/flags/003-slovakia.svg';
import CzechFlagUrl from '@assets/flags/002-czech-republic.svg';
import UKFlagUrl from '@assets/flags/001-united-kingdom.svg';
import { BackgroundQuickAccess } from '@features/meditation/components';

const Layout = ({
  children,
  gender,
  onGenderChange,
  isPlayerActive = false,
  currentScreen = "",
  className = ""
}) => {
  const { language, changeLanguage, t } = useLanguage();

  const handleGenderSelect = (selectedGender) => {
    onGenderChange(selectedGender);
  };

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
  };

  // Helpery pro mobilní režim
  const getFlagUrl = (lang) => {
    switch (lang) {
      case 'SK': return SlovakiaFlagUrl;
      case 'CZ': return CzechFlagUrl;
      case 'EN': return UKFlagUrl;
      default: return SlovakiaFlagUrl;
    }
  };

  const cycleLanguage = () => {
    const order = ['SK', 'CZ', 'EN'];
    const currentIndex = order.indexOf(language);
    const next = order[(currentIndex + 1) % order.length];
    changeLanguage(next);
  };

  const isHudbaSection = currentScreen === 'hudba' || currentScreen === 'audio-player-hudba';
  const showLanguageControls = !isPlayerActive && !isHudbaSection;
  const showGenderControls = !isPlayerActive && currentScreen === 'meditace';
  const sectionForBackground = React.useMemo(() => {
    if (['hudba', 'audio-player-hudba'].includes(currentScreen)) return 'hudba';
    if (['meditace', 'audio-player-meditace'].includes(currentScreen)) return 'meditace';
    if (currentScreen === 'dychani') return 'dychani';
    return null;
  }, [currentScreen]);

  const showBackgroundQuickAccess = !isPlayerActive && !!sectionForBackground;
  const shouldRenderTopControls = showLanguageControls || showGenderControls || showBackgroundQuickAccess;



  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Hlavní obsah */}
      {children}

      {/* Top Right Controls - hidden when player is active; language switcher se v sekci hudba nezobrazuje */}
      {shouldRenderTopControls && (
        <div className="fixed top-6 right-6 z-50 flex items-center space-x-3">
          {/* Language Switcher - desktop/tablet */}
          {showLanguageControls && (
            <motion.div
            className="hidden sm:flex bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <motion.button
              onClick={() => handleLanguageChange('SK')}
              className={`p-2 rounded-full transition-colors duration-200 flex items-center justify-center ${
                language === 'SK'
                  ? 'bg-gray-800'
                  : 'hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img src={SlovakiaFlagUrl} alt="Slovakia" className="w-6 h-6" />
            </motion.button>
            <motion.button
              onClick={() => handleLanguageChange('CZ')}
              className={`p-2 rounded-full transition-colors duration-200 flex items-center justify-center ${
                language === 'CZ'
                  ? 'bg-gray-800'
                  : 'hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img src={CzechFlagUrl} alt="Czech Republic" className="w-6 h-6" />
            </motion.button>
            <motion.button
              onClick={() => handleLanguageChange('EN')}
              className={`p-2 rounded-full transition-colors duration-200 flex items-center justify-center ${
                language === 'EN'
                  ? 'bg-gray-800'
                  : 'hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img src={UKFlagUrl} alt="United Kingdom" className="w-6 h-6" />
            </motion.button>
          </motion.div>
          )}

          {showBackgroundQuickAccess && (
            <BackgroundQuickAccess
              section={sectionForBackground}
              className="hidden sm:flex"
            />
          )}

          {/* Language Switcher - mobile (one flag, cycles on tap) */}
          {showLanguageControls && (
            <motion.button
            onClick={cycleLanguage}
            className="sm:hidden flex bg-gray-800 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
          >
            <img src={getFlagUrl(language)} alt={language} className="w-6 h-6" />
          </motion.button>
          )}

          {showBackgroundQuickAccess && (
            <BackgroundQuickAccess
              section={sectionForBackground}
              className="sm:hidden flex"
            />
          )}

          {/* Gender Switcher - desktop/tablet - zobraz pouze v sekci meditace */}
          {showGenderControls && (
            <motion.div
              className="hidden sm:flex bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <motion.button
                onClick={() => handleGenderSelect('male')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  gender === 'male'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {t('jsemMuz')}
              </motion.button>
              <motion.button
                onClick={() => handleGenderSelect('female')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  gender === 'female'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {t('jsemZena')}
              </motion.button>
            </motion.div>
          )}

          {/* Gender Switcher - mobile (show only current selection, tap toggles) - zobraz pouze v sekci meditace */}
          {showGenderControls && (
            <motion.button
              onClick={() => handleGenderSelect(gender === 'male' ? 'female' : 'male')}
              className="sm:hidden px-3 py-2 bg-gray-800 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm text-sm font-medium text-white"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              {gender === 'female' ? t('jsemZena') : t('jsemMuz')}
            </motion.button>
          )}
        </div>
      )}

      {/* Overlay pro zavření menu při kliknutí mimo - COMMENTED OUT */}
      {/* {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )} */}

      {/* Dropdown Menu - COMMENTED OUT */}
      {/* {isMenuOpen && (
        <div className="fixed top-16 right-16 w-80 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="py-4">
            <div className="px-6 py-3">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Účet</h3>

              <button className="w-full text-left px-4 py-4 text-lg hover:bg-gray-100 rounded-lg transition-colors duration-200 mb-2 text-gray-700">
                Nastavení
              </button>

              <button className="w-full text-left px-4 py-4 text-lg hover:bg-gray-100 rounded-lg transition-colors duration-200 mb-2 text-gray-700">
                Statistiky
              </button>

              <button className="w-full text-left px-4 py-4 text-lg hover:bg-gray-100 rounded-lg transition-colors duration-200 text-gray-700">
                Odhlásit se
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Layout;

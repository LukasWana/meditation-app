import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@contexts/LanguageContext';
import UserProfile from '@components/UserProfile';
import SlovakiaFlagUrl from '@assets/flags/003-slovakia.svg';
import CzechFlagUrl from '@assets/flags/002-czech-republic.svg';
import UKFlagUrl from '@assets/flags/001-united-kingdom.svg';
import { useUserPrefsStore } from '@stores/userPrefsStore';
import { useAudioPlayerStore } from '@stores/audioPlayerStore';

const Layout = ({
  children,
  currentScreen = "",
  className = ""
}) => {
  const { gender, setGender: onGenderChange } = useUserPrefsStore();
  const { isPlayerActive } = useAudioPlayerStore();
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



  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Hlavní obsah */}
      {children}

      {/* Top Right Controls - Hidden when player is active, show on all pages */}
      {/* Pozicování: na mobilech right-6, na větších obrazovkách relativní k max-width kontejneru */}
      {!isPlayerActive && (
        <div className="fixed top-6 right-6 z-50 flex items-center space-x-3 app-content-controls">
          {/* User Profile */}
          <UserProfile />

          {/* Language Switcher - desktop/tablet */}
          <motion.div
            className="hidden sm:flex bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <motion.button
              onClick={() => handleLanguageChange('SK')}
              className={`p-2 rounded-full transition-colors duration-200 flex items-center justify-center ${language === 'SK'
                ? 'bg-gray-800'
                : 'hover:bg-gray-100'
                }`}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img src={SlovakiaFlagUrl} alt="Slovakia" className="w-6 h-6" />
            </motion.button>
            <motion.button
              onClick={() => handleLanguageChange('CZ')}
              className={`p-2 rounded-full transition-colors duration-200 flex items-center justify-center ${language === 'CZ'
                ? 'bg-gray-800'
                : 'hover:bg-gray-100'
                }`}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img src={CzechFlagUrl} alt="Czech Republic" className="w-6 h-6" />
            </motion.button>
            <motion.button
              onClick={() => handleLanguageChange('EN')}
              className={`p-2 rounded-full transition-colors duration-200 flex items-center justify-center ${language === 'EN'
                ? 'bg-gray-800'
                : 'hover:bg-gray-100'
                }`}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img src={UKFlagUrl} alt="United Kingdom" className="w-6 h-6" />
            </motion.button>
          </motion.div>

          {/* Language Switcher - mobile (one flag, cycles on tap) */}
          <motion.button
            onClick={cycleLanguage}
            className="sm:hidden flex bg-gray-800 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <img src={getFlagUrl(language)} alt={language} className="w-6 h-6" />
          </motion.button>

          {/* Gender Switcher - desktop/tablet - zobraz pouze v sekci meditace */}
          {currentScreen === 'meditace' && (
            <motion.div
              className="hidden sm:flex bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <motion.button
                onClick={() => handleGenderSelect('male')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${gender === 'male'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {t('jsemMuz')}
              </motion.button>
              <motion.button
                onClick={() => handleGenderSelect('female')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${gender === 'female'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {t('jsemZena')}
              </motion.button>
            </motion.div>
          )}

          {/* Gender Switcher - mobile (show only current selection, tap toggles) - zobraz pouze v sekci meditace */}
          {currentScreen === 'meditace' && (
            <motion.button
              onClick={() => handleGenderSelect(gender === 'male' ? 'female' : 'male')}
              className="sm:hidden px-3 py-2 bg-gray-800 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm text-sm font-medium text-white"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
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

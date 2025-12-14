import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@contexts/LanguageContext';
import { ThemeContext } from '@contexts/ThemeContext';
import SlovakiaFlagUrl from '@assets/flags/003-slovakia.svg';
import CzechFlagUrl from '@assets/flags/002-czech-republic.svg';
import UKFlagUrl from '@assets/flags/001-united-kingdom.svg';

const LanguageSwitcher = ({ className = "" }) => {
  const { language, changeLanguage } = useLanguage();
  const themeContext = useContext(ThemeContext);
  const colorMode = themeContext?.colorMode || 'light';
  const isDarkMode = colorMode === 'dark';
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
  const bgColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)';
  const activeBgColor = isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
  const hoverBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)';

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <motion.div
        className="flex backdrop-blur-sm rounded-full p-1 shadow-sm border"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <motion.button
          onClick={() => handleLanguageChange('SK')}
          className="p-2 rounded-full transition-colors duration-200 flex items-center justify-center"
          style={{
            backgroundColor: language === 'SK' ? activeBgColor : 'transparent'
          }}
          whileHover={{ backgroundColor: language !== 'SK' ? hoverBgColor : activeBgColor }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <img src={SlovakiaFlagUrl} alt="Slovakia" className="w-6 h-6" />
        </motion.button>
        <motion.button
          onClick={() => handleLanguageChange('CZ')}
          className="p-2 rounded-full transition-colors duration-200 flex items-center justify-center"
          style={{
            backgroundColor: language === 'CZ' ? activeBgColor : 'transparent'
          }}
          whileHover={{ backgroundColor: language !== 'CZ' ? hoverBgColor : activeBgColor }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <img src={CzechFlagUrl} alt="Czech Republic" className="w-6 h-6" />
        </motion.button>
        <motion.button
          onClick={() => handleLanguageChange('EN')}
          className="p-2 rounded-full transition-colors duration-200 flex items-center justify-center"
          style={{
            backgroundColor: language === 'EN' ? activeBgColor : 'transparent'
          }}
          whileHover={{ backgroundColor: language !== 'EN' ? hoverBgColor : activeBgColor }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <img src={UKFlagUrl} alt="United Kingdom" className="w-6 h-6" />
        </motion.button>
      </motion.div>
    </div>
  );
};

export default LanguageSwitcher;

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@contexts/LanguageContext';
import SlovakiaFlagUrl from '@assets/flags/003-slovakia.svg';
import CzechFlagUrl from '@assets/flags/002-czech-republic.svg';
import UKFlagUrl from '@assets/flags/001-united-kingdom.svg';

const LanguageSwitcher = ({ className = "" }) => {
  const { language, changeLanguage } = useLanguage();

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <motion.div
        className="flex bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm"
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
    </div>
  );
};

export default LanguageSwitcher;

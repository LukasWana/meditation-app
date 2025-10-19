import React from 'react';
import { useLanguage } from '@contexts/LanguageContext';
import { flags } from '@assets/flags';

const LanguageSwitcher = ({ className = "" }) => {
  const { language, changeLanguage, getLanguageName, availableLanguages } = useLanguage();

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {availableLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
            language === lang
              ? 'bg-white/50 border-gray-400 text-gray-900'
              : 'bg-white/20 border-white/30 text-gray-700 hover:bg-white/30'
          }`}
        >
          {flags[lang] ? React.createElement(flags[lang], { className: "w-5 h-3" }) : <span>🏳️</span>}
          <span className="text-sm font-medium">
            {getLanguageName(lang)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;

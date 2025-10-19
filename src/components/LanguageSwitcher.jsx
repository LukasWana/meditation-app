import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@contexts/LanguageContext';
import { flags } from '@assets/flags';

const LanguageSwitcher = ({ className = "" }) => {
  const { language, changeLanguage, getLanguageFlag, getLanguageName, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
    setIsOpen(false);
  };

  const handleToggle = () => {
    console.log('Language switcher clicked, current state:', isOpen);
    console.log('Available flags:', flags);
    console.log('Current language:', language);
    console.log('Available languages:', availableLanguages);
    const newState = !isOpen;
    console.log('Setting isOpen to:', newState);
    setIsOpen(newState);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Language Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Button clicked!');
          setIsOpen(!isOpen);
        }}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/20 backdrop-blur border border-white/30 hover:bg-white/30 transition-colors"
      >
        {flags[language] ? React.createElement(flags[language], { className: "w-6 h-4" }) : <span>🏳️</span>}
        <span className="text-sm font-medium text-gray-700">
          {getLanguageName(language)}
        </span>
        <svg
          className="w-4 h-4 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Debug Info */}
      <div className="absolute top-full mt-1 left-0 text-xs text-red-500 bg-yellow-100 p-1 z-50">
        isOpen: {isOpen.toString()}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[140px]">
          <div className="px-2 py-1 text-xs text-gray-500 border-b border-gray-100">
            Debug: {availableLanguages.length} languages
          </div>
          {availableLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                language === lang ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              }`}
            >
              {flags[lang] ? React.createElement(flags[lang], { className: "w-5 h-3" }) : <span>🏳️</span>}
              <span className="text-sm font-medium">{getLanguageName(lang)}</span>
              {language === lang && (
                <svg
                  className="w-4 h-4 text-green-600 ml-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

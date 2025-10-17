import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Layout = ({
  children,
  gender,
  onGenderChange,
  voicePreference,
  onVoicePreferenceChange,
  isPlayerActive = false,
  className = ""
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleGenderSelect = (selectedGender) => {
    onGenderChange(selectedGender);
  };




  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Hlavní obsah */}
      {children}

      {/* Top Right Controls - Hidden when player is active */}
      {!isPlayerActive && (
        <div className="fixed top-6 right-6 z-50 flex items-center space-x-3">
          {/* Gender Switcher */}
          <div className="flex bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm">
            <button
              onClick={() => handleGenderSelect('male')}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                gender === 'male'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              jsem Muž
            </button>
            <button
              onClick={() => handleGenderSelect('female')}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                gender === 'female'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              jsem Žena
            </button>
          </div>

          {/* Hamburger Menu Button - COMMENTED OUT */}
          {/* <button
            onClick={toggleMenu}
            className="w-12 h-12 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors duration-200"
          >
            {isMenuOpen ? <X size={18} className="text-white" /> : <Menu size={18} className="text-white" />}
          </button> */}
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

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
    setIsMenuOpen(false);
  };

  const handleVoiceSelect = (selectedVoice) => {
    onVoicePreferenceChange(selectedVoice);
    setIsMenuOpen(false);
  };


  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Hlavní obsah */}
      {children}

      {/* Hamburger Menu Button - Hidden when player is active */}
      {!isPlayerActive && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={toggleMenu}
            className="w-12 h-12 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors duration-200"
          >
            {isMenuOpen ? <X size={18} className="text-white" /> : <Menu size={18} className="text-white" />}
          </button>
        </div>
      )}

      {/* Overlay pro zavření menu při kliknutí mimo */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="fixed top-16 right-4 w-80 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="py-4">
            {/* Profil sekce */}
            <div className="px-6 py-3">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Profil</h3>

              <button
                onClick={() => handleGenderSelect('female')}
                className={`w-full text-left px-4 py-4 text-lg hover:bg-gray-100 rounded-lg transition-colors duration-200 mb-2 ${
                  gender === 'female' ? 'bg-pink-50 text-pink-600 border-2 border-pink-200' : 'text-gray-700'
                }`}
              >
                Jsem žena
              </button>

              <button
                onClick={() => handleGenderSelect('male')}
                className={`w-full text-left px-4 py-4 text-lg hover:bg-gray-100 rounded-lg transition-colors duration-200 mb-2 ${
                  gender === 'male' ? 'bg-blue-50 text-blue-600 border-2 border-blue-200' : 'text-gray-700'
                }`}
              >
                Jsem muž
              </button>

              <button
                onClick={() => handleGenderSelect('none')}
                className={`w-full text-left px-4 py-4 text-lg hover:bg-gray-100 rounded-lg transition-colors duration-200 ${
                  gender === 'none' ? 'bg-gray-50 text-gray-600 border-2 border-gray-200' : 'text-gray-700'
                }`}
              >
                Nechci být osobní
              </button>
            </div>


            {/* Nastavení a účet */}
            <div className="px-6 py-3 border-t border-gray-200">
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
      )}
    </div>
  );
};

export default Layout;

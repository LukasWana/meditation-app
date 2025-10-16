import React, { useState } from 'react';
import { Menu, X, Home, Heart, Wind, Map, HelpCircle, User, Settings, BarChart3, LogOut } from 'lucide-react';

const Layout = ({
  children,
  currentScreen,
  onNavigateToScreen,
  gender,
  onGenderChange,
  voicePreference,
  onVoicePreferenceChange,
  className = ""
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigation = (screenName) => {
    onNavigateToScreen(screenName);
    setIsMenuOpen(false);
  };

  const handleGenderSelect = (selectedGender) => {
    onGenderChange(selectedGender);
    setIsMenuOpen(false);
  };

  const handleVoiceSelect = (selectedVoice) => {
    onVoicePreferenceChange(selectedVoice);
    setIsMenuOpen(false);
  };

  const menuItems = [
    { id: 'home', label: 'Domov', icon: Home, screen: 'home' },
    { id: 'meditation', label: 'Meditácia', icon: Heart, screen: 'meditation' },
    { id: 'breath', label: 'Dýchanie', icon: Wind, screen: 'breath' },
    { id: 'journey', label: 'Na cesty', icon: Map, screen: 'journey' },
    { id: 'trouble', label: 'Trouble', icon: HelpCircle, screen: 'trouble' },
  ];

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Hlavní obsah */}
      {children}

      {/* Hamburger Menu Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleMenu}
          className="w-12 h-12 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors duration-200"
        >
          {isMenuOpen ? <X size={18} className="text-white" /> : <Menu size={18} className="text-white" />}
        </button>
      </div>

      {/* Overlay pro zavření menu při kliknutí mimo */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="fixed top-16 right-4 w-72 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="py-2">
            {/* Navigační menu */}
            <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200">
              Navigace
            </div>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.screen;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.screen)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center transition-colors duration-200 ${
                    isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700'
                  }`}
                >
                  <Icon size={16} className="mr-3" />
                  {item.label}
                </button>
              );
            })}

            {/* Osobní nastavení */}
            <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200 mt-2">
              Osobní nastavení
            </div>

            <button
              onClick={() => handleGenderSelect('male')}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center transition-colors duration-200 ${
                gender === 'male' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              <span className="mr-3">👨</span>
              Jsem muž
            </button>

            <button
              onClick={() => handleGenderSelect('female')}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center transition-colors duration-200 ${
                gender === 'female' ? 'bg-pink-50 text-pink-600' : 'text-gray-700'
              }`}
            >
              <span className="mr-3">👩</span>
              Jsem žena
            </button>

            <button
              onClick={() => handleGenderSelect('none')}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center transition-colors duration-200 ${
                gender === 'none' ? 'bg-gray-50 text-gray-600' : 'text-gray-700'
              }`}
            >
              <span className="mr-3">🚫</span>
              Nechci být osobní
            </button>

            {/* Nastavení hlasu */}
            <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200 mt-2">
              Preferovaný hlas
            </div>

            <button
              onClick={() => handleVoiceSelect('female')}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center transition-colors duration-200 ${
                voicePreference === 'female' ? 'bg-purple-50 text-purple-600' : 'text-gray-700'
              }`}
            >
              <span className="mr-3">🎵👩</span>
              Ženský hlas
            </button>

            <button
              onClick={() => handleVoiceSelect('male')}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center transition-colors duration-200 ${
                voicePreference === 'male' ? 'bg-purple-50 text-purple-600' : 'text-gray-700'
              }`}
            >
              <span className="mr-3">🎵👨</span>
              Mužský hlas
            </button>

            <button
              onClick={() => handleVoiceSelect('auto')}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center transition-colors duration-200 ${
                voicePreference === 'auto' ? 'bg-purple-50 text-purple-600' : 'text-gray-700'
              }`}
            >
              <span className="mr-3">🎵🔄</span>
              Automaticky
            </button>

            {/* Účet */}
            <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200 mt-2">
              Účet
            </div>

            <button className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center text-gray-700 transition-colors duration-200">
              <User size={16} className="mr-3" />
              Profil
            </button>

            <button className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center text-gray-700 transition-colors duration-200">
              <Settings size={16} className="mr-3" />
              Nastavení
            </button>

            <button className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center text-gray-700 transition-colors duration-200">
              <BarChart3 size={16} className="mr-3" />
              Statistiky
            </button>

            <button className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center text-gray-700 transition-colors duration-200">
              <LogOut size={16} className="mr-3" />
              Odhlásit se
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

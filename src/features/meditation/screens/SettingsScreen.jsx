import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import LanguageSwitcher from '@components/LanguageSwitcher';
import { useLanguage } from '@contexts/LanguageContext';

const SettingsScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange
}) => {
  const { t } = useLanguage();

  return (
    <FramerPageTransition screenKey="settings">
      <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full mt-16">
          <FramerSection
            className="text-center mb-8"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-6xl font-light" style={{fontFamily: 'Playfair Display'}}>
              {t('nastavenie')}
            </h1>
          </FramerSection>

          <div className="space-y-4">
            {/* Language Settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.2}
            >
              <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4" style={{fontFamily: 'Playfair Display'}}>
                  {t('language')}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg text-gray-700">
                    {t('selectLanguage')}
                  </span>
                  <LanguageSwitcher />
                </div>
              </div>
            </FramerSection>

            {/* Placeholder for future settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.3}
            >
              <div className="w-full p-6 bg-white/30 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4" style={{fontFamily: 'Playfair Display'}}>
                  {t('dalsieNastavenie')}
                </h3>
                <p className="text-lg text-gray-600">
                  {t('dalsieFunkcie')}
                </p>
              </div>
            </FramerSection>

            {/* Placeholder for future settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.4}
            >
              <div className="w-full p-6 bg-white/30 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4" style={{fontFamily: 'Playfair Display'}}>
                  {t('informacie')}
                </h3>
                <p className="text-lg text-gray-600">
                  {t('verziaAplikacieDesc')}
                </p>
              </div>
            </FramerSection>
          </div>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default SettingsScreen;

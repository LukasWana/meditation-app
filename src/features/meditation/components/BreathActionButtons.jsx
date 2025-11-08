import React from 'react';
import { RotateCcw, Music2, Bookmark } from 'lucide-react';
import { FramerSection } from '@components';

/**
 * Komponenta pro tlačítka reset, galerie a profily
 *
 * @param {Function} onReset - Handler pro reset
 * @param {Function} onGalleryClick - Handler pro otevření galerie
 * @param {Function} onProfilesClick - Handler pro otevření profilů
 * @param {Function} t - Funkce pro překlad
 */
const BreathActionButtons = ({
  onReset,
  onGalleryClick,
  onProfilesClick,
  t
}) => {
  return (
    <FramerSection
      className="flex justify-center gap-5 md:gap-8"
      animationType="fadeIn"
      delay={0.35}
    >
      <button
        onClick={onReset}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer"
        title={t('reset') || 'Reset'}
      >
        <RotateCcw size={24} className="text-gray-800" />
      </button>

      <button
        onClick={onGalleryClick}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer"
        title={t('zvukovaGalerie') || 'Zvuková galerie'}
      >
        <Music2 size={24} className="text-gray-800" />
      </button>

      <button
        onClick={onProfilesClick}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer"
        title={t('profilyDychani') || 'Profily dýchání'}
      >
        <Bookmark size={24} className="text-gray-800" />
      </button>
    </FramerSection>
  );
};

export default BreathActionButtons;


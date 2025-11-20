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
const DychaniActionButtons = ({
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
      style={{ position: 'relative', zIndex: 100, pointerEvents: 'auto' }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onReset) {
            onReset();
          }
        }}
        onMouseDown={(e) => {
          // Záložní handler pro případ, že onClick nefunguje kvůli překrývání
          e.stopPropagation();
          e.preventDefault();
          if (onReset) {
            onReset();
          }
        }}
        onTouchStart={(e) => {
          // Handler pro touch zařízení
          e.stopPropagation();
          e.preventDefault();
          if (onReset) {
            onReset();
          }
        }}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
        title={t('reset') || 'Reset'}
        style={{ position: 'relative', zIndex: 101, pointerEvents: 'auto', touchAction: 'manipulation' }}
        type="button"
      >
        <RotateCcw size={24} className="text-gray-800" style={{ pointerEvents: 'none' }} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onGalleryClick) {
            onGalleryClick();
          }
        }}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer"
        title={t('zvukovaGalerie') || 'Zvuková galerie'}
        style={{ position: 'relative', zIndex: 101, pointerEvents: 'auto' }}
      >
        <Music2 size={24} className="text-gray-800" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onProfilesClick) {
            onProfilesClick();
          }
        }}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer"
        title={t('profilyDychani') || 'Profily dýchání'}
        style={{ position: 'relative', zIndex: 101, pointerEvents: 'auto' }}
      >
        <Bookmark size={24} className="text-gray-800" />
      </button>
    </FramerSection>
  );
};

export default DychaniActionButtons;


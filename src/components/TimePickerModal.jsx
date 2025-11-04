import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music2 } from 'lucide-react';
import { useLanguage } from '@contexts/LanguageContext';

// Lazy loading WheelPicker komponent pro lepší performance
const WheelPicker = lazy(() => import('@components/WheelPicker').then(m => ({ default: m.default })));
const DualWheelPicker = lazy(() => import('@components/WheelPicker').then(m => ({ default: m.DualWheelPicker })));

// Modal pro jeden WheelPicker
export const WheelPickerModal = ({ isOpen, onClose, value, onChange, min, max, step, label, title, onSoundButtonClick }) => {
  const { t } = useLanguage();
  const [tempValue, setTempValue] = React.useState(value);

  React.useEffect(() => {
    if (isOpen) {
      setTempValue(value);
    }
  }, [isOpen, value]);

  const handleConfirm = () => {
    onChange(tempValue);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000
          }}
        >
          <motion.div
            className="bg-[#f4ddc4] w-full max-w-sm min-h-screen p-6 relative mx-4 border border-black/10 rounded-none flex flex-col items-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 10001 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0 w-full">
              {title && (
                <h2 className="text-2xl font-light">
                  {typeof title === 'string' ? title : t(title)}
                </h2>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Picker - scrollovatelný kontejner - perfektně na středu */}
            {(() => {
              const isLargeModal = title === t('dlzka') || title === 'délka' || title === t('priprava') || title === 'příprava' || title === 'priprava';
              return (
                <div className={`flex flex-col items-center justify-center mb-4 flex-1 w-full ${isLargeModal ? 'min-h-[calc(100vh-280px)]' : 'min-h-[200px]'}`}>
                  <div className={isLargeModal ? 'transform scale-[1.6] origin-center' : ''}>
                    <Suspense fallback={
                      <div className="flex items-center justify-center w-32 h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                      </div>
                    }>
                      <WheelPicker
                        value={tempValue}
                        onChange={setTempValue}
                        min={min}
                        max={max}
                        step={step}
                        label={label ? (typeof label === 'string' ? label : t(label)) : ''}
                        className={isLargeModal ? 'w-48' : 'w-32'}
                      />
                    </Suspense>
                  </div>
                </div>
              );
            })()}

            {/* Footer - vždy viditelný dole - zarovnáno na střed */}
            {(() => {
              const isLargeModal = title === t('dlzka') || title === 'délka' || title === t('priprava') || title === 'příprava' || title === 'priprava';
              return (
                <div className={`grid grid-cols-2 md:flex ${isLargeModal ? 'md:flex-row md:justify-center' : 'md:flex-col'} gap-3 pt-4 pb-2 flex-shrink-0 border-t border-black/10 w-full ${isLargeModal ? 'md:items-center' : ''}`}>
                  {/* Tlačítko ZVUKY - zobraz pouze pokud je poskytnut callback */}
                  {onSoundButtonClick && (
                    <button
                      onClick={() => {
                        onSoundButtonClick();
                      }}
                      className="px-6 py-3 rounded bg-white/70 hover:bg-white text-gray-700 border border-black/10 transition-colors flex items-center justify-center gap-2 md:w-auto"
                    >
                      <Music2 size={18} />
                      <span>{t('zvuky') || 'zvuky'}</span>
                    </button>
                  )}
                  {/* Hlavní tlačítko */}
                  <button
                    onClick={handleConfirm}
                    className={`px-8 py-3 rounded bg-white/70 hover:bg-white text-gray-700 border border-black/10 transition-colors ${!onSoundButtonClick ? 'col-span-2 md:col-span-1' : ''} md:w-auto`}
                  >
                    {t('hotovo')}
                  </button>
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

// Modal pro DualWheelPicker
export const DualWheelPickerModal = ({
  isOpen,
  onClose,
  leftValue,
  rightValue,
  onLeftChange,
  onRightChange,
  onChange, // Nový prop pro změnu obou hodnot najednou (leftValue, rightValue) => void
  leftLabel,
  rightLabel,
  leftMin,
  leftMax,
  leftStep,
  rightMin,
  rightMax,
  rightStep,
  title,
  onSoundButtonClick // Callback pro otevření galerie zvuků
}) => {
  const { t } = useLanguage();
  const [tempLeftValue, setTempLeftValue] = React.useState(leftValue);
  const [tempRightValue, setTempRightValue] = React.useState(rightValue);

  React.useEffect(() => {
    if (isOpen) {
      setTempLeftValue(leftValue);
      setTempRightValue(rightValue);
    }
  }, [isOpen, leftValue, rightValue]);

  const handleConfirm = () => {
    // Pokud je poskytnut onChange callback, použij ho (předej obě hodnoty najednou)
    if (onChange) {
      onChange(tempLeftValue, tempRightValue);
    } else {
      // Jinak použij původní callbacky (kompatibilita se starým kódem)
      // Ale toto může mít problém s zastaralými hodnotami
      onLeftChange(tempLeftValue);
      onRightChange(tempRightValue);
    }
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000
          }}
        >
          <motion.div
            className="bg-[#f4ddc4] w-full max-w-md min-h-screen p-6 relative mx-4 border border-black/10 rounded-none flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 10001 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              {title && (
                <h2 className="text-2xl font-light">
                  {typeof title === 'string' ? title : t(title)}
                </h2>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Picker - scrollovatelný kontejner */}
            {(() => {
              const isLargeModal = title === t('rytmus') || title === 'rytmus';
              return (
                <div className={`flex flex-col items-center justify-center mb-4 flex-1 ${isLargeModal ? 'min-h-[calc(100vh-280px)]' : 'min-h-[300px]'}`}>
                  <div className={isLargeModal ? 'transform scale-[1.6] origin-center' : ''}>
                    <Suspense fallback={
                      <div className="flex items-center justify-center w-full max-w-md h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                      </div>
                    }>
                      <DualWheelPicker
                        leftValue={tempLeftValue}
                        rightValue={tempRightValue}
                        onLeftChange={setTempLeftValue}
                        onRightChange={setTempRightValue}
                        leftLabel={leftLabel ? (typeof leftLabel === 'string' ? leftLabel : t(leftLabel)) : ''}
                        rightLabel={rightLabel ? (typeof rightLabel === 'string' ? rightLabel : t(rightLabel)) : ''}
                        leftMin={leftMin}
                        leftMax={leftMax}
                        leftStep={leftStep}
                        rightMin={rightMin}
                        rightMax={rightMax}
                        rightStep={rightStep}
                        className={isLargeModal ? 'w-full max-w-md' : 'w-full max-w-md'}
                      />
                    </Suspense>
                  </div>
                </div>
              );
            })()}

            {/* Footer - vždy viditelný dole */}
            {(() => {
              const isLargeModal = title === t('rytmus') || title === 'rytmus';
              return (
                <div className={`flex flex-wrap sm:flex-nowrap ${isLargeModal ? 'sm:flex-row justify-center' : 'flex-col sm:flex-col'} gap-3 pt-4 pb-2 flex-shrink-0 border-t border-black/10 ${isLargeModal ? 'sm:items-center' : ''}`}>
                  {/* Tlačítko ZVUKY - zobraz pouze pokud je poskytnut callback */}
                  {onSoundButtonClick && (
                    <button
                      onClick={() => {
                        onSoundButtonClick();
                      }}
                      className="px-6 py-3 rounded bg-white/70 hover:bg-white text-gray-700 border border-black/10 transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                    >
                      <Music2 size={18} />
                      <span>{t('zvuky') || 'zvuky'}</span>
                    </button>
                  )}
                  {/* Hlavní tlačítko */}
                  <button
                    onClick={handleConfirm}
                    className="px-8 py-3 rounded bg-white/70 hover:bg-white text-gray-700 border border-black/10 transition-colors flex-1 sm:flex-initial"
                  >
                    {t('hotovo')}
                  </button>
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};


import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { WheelPicker, DualWheelPicker, FramerButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';

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
            <div className="flex flex-col items-center justify-center mb-4 flex-1 min-h-[200px] w-full">
              <WheelPicker
                value={tempValue}
                onChange={setTempValue}
                min={min}
                max={max}
                step={step}
                label={label ? (typeof label === 'string' ? label : t(label)) : ''}
                className="w-32"
              />
            </div>

            {/* Footer - vždy viditelný dole - zarovnáno na střed */}
            <div className="flex flex-col gap-3 pt-4 pb-2 flex-shrink-0 border-t border-black/10 w-full items-center">
              {/* Tlačítko ZVUKY - zobraz pouze pokud je poskytnut callback */}
              {onSoundButtonClick && (
                <FramerButton
                  onClick={() => {
                    onSoundButtonClick();
                  }}
                  variant="secondary"
                  className="px-6 py-3 flex items-center justify-center gap-2"
                >
                  <span>♫</span>
                  <span>{t('zvuky') || 'zvuky'}</span>
                </FramerButton>
              )}
              {/* Hlavní tlačítko */}
              <FramerButton
                onClick={handleConfirm}
                variant="secondary"
                className="px-8 py-3"
              >
                {t('hotovo')}
              </FramerButton>
            </div>
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
            <div className="flex flex-col items-center justify-center mb-4 flex-1 min-h-[300px]">
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
                className="w-full max-w-md"
              />
            </div>

            {/* Footer - vždy viditelný dole */}
            <div className="flex flex-col gap-3 pt-4 pb-2 flex-shrink-0 border-t border-black/10">
              {/* Tlačítko ZVUKY - zobraz pouze pokud je poskytnut callback */}
              {onSoundButtonClick && (
                <FramerButton
                  onClick={() => {
                    onSoundButtonClick();
                  }}
                  variant="secondary"
                  className="px-6 py-3 flex items-center justify-center gap-2"
                >
                  <span>♫</span>
                  <span>{t('zvuky') || 'zvuky'}</span>
                </FramerButton>
              )}
              {/* Hlavní tlačítko */}
              <FramerButton
                onClick={handleConfirm}
                variant="secondary"
                className="px-8 py-3"
              >
                {t('hotovo')}
              </FramerButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};


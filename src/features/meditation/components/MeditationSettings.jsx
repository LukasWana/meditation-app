import React, { Suspense, lazy } from 'react';
import { FramerSection } from '@components';
import { useLanguage } from '@contexts/LanguageContext';

const WheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.WheelPickerModal })));
const DualWheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.DualWheelPickerModal })));

function formatPreparationTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Komponenta pro nastavení meditace
 * Zobrazuje a umožňuje změnu délky, rytmu a přípravy
 */
const MeditationSettings = ({
  isPlaying,
  selectedDuration,
  breathInDuration,
  breathOutDuration,
  preparationTime,
  showDurationPicker,
  showPreparationPicker,
  showRhythmPicker,
  onShowDurationPicker,
  onShowPreparationPicker,
  onShowRhythmPicker,
  onHideDurationPicker,
  onHidePreparationPicker,
  onHideRhythmPicker,
  onDurationChange,
  onBreathRhythmChange,
  onPreparationTimeChange,
  textColors
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Info o délce dýchání a rytmu - zobraz při přehrávání */}
      {isPlaying && (
        <FramerSection
          className="mb-12"
          animationType="fadeIn"
          delay={0.3}
        >
          <div className="flex justify-center items-start gap-8 md:gap-12 mb-4">
            <div className="flex flex-col items-center">
              <div className={`text-4xl md:text-5xl font-sans font-medium ${textColors.secondary} mb-1`}>
                {selectedDuration}
              </div>
              <span className={`text-base md:text-lg font-serif ${textColors.secondary} font-light`}>
                {t('dlzkaDychania') || 'délka'}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className={`text-4xl md:text-5xl font-sans font-medium ${textColors.secondary} mb-1`}>
                {breathInDuration} : {breathOutDuration}
              </div>
              <span className={`text-base md:text-lg font-serif ${textColors.secondary} font-light`}>
                {t('rytmus') || 'rytmus'}
              </span>
            </div>
          </div>
        </FramerSection>
      )}

      {!isPlaying && (
        <FramerSection
          className="mb-12"
          animationType="fadeIn"
          delay={0.3}
        >
          <div className="flex justify-center items-start gap-8 md:gap-12 mb-4">
            <div className="flex flex-col items-center">
              <button
                onClick={onShowPreparationPicker}
                className={`text-4xl md:text-5xl font-sans font-medium ${textColors.secondary} ${textColors.isDark ? 'hover:text-white' : 'hover:text-black'} transition-colors cursor-pointer mb-1`}
              >
                {formatPreparationTime(preparationTime)}
              </button>
              <span className={`text-base md:text-lg font-serif ${textColors.secondary} font-light`}>
                {t('priprava') || 'příprava'}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <button
                onClick={onShowDurationPicker}
                className={`text-4xl md:text-5xl font-sans font-medium ${textColors.secondary} ${textColors.isDark ? 'hover:text-white' : 'hover:text-black'} transition-colors cursor-pointer mb-1`}
              >
                {selectedDuration}
              </button>
              <span className={`text-base md:text-lg font-serif ${textColors.secondary} font-light`}>
                {t('dlzkaDychania') || 'délka'}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <button
                onClick={onShowRhythmPicker}
                className={`text-4xl md:text-5xl font-sans font-medium ${textColors.secondary} ${textColors.isDark ? 'hover:text-white' : 'hover:text-black'} transition-colors cursor-pointer mb-1`}
              >
                {breathInDuration} : {breathOutDuration}
              </button>
              <span className={`text-base md:text-lg font-serif ${textColors.secondary} font-light`}>
                {t('rytmus') || 'rytmus'}
              </span>
            </div>
          </div>

          {(showDurationPicker || showPreparationPicker || showRhythmPicker) && (
            <Suspense fallback={null}>
              {showPreparationPicker && (
                <WheelPickerModal
                  isOpen={showPreparationPicker}
                  onClose={onHidePreparationPicker}
                  value={preparationTime}
                  onChange={(value) => {
                    onPreparationTimeChange?.(value);
                  }}
                  min={0}
                  max={60}
                  step={1}
                  label={t('sekund')}
                  title={t('priprava') || 'příprava'}
                />
              )}

              {showDurationPicker && (
                <WheelPickerModal
                  isOpen={showDurationPicker}
                  onClose={onHideDurationPicker}
                  value={selectedDuration}
                  onChange={onDurationChange}
                  min={1}
                  max={60}
                  step={1}
                  label={t('dlzkaDychania')}
                  title={t('dlzkaDychania')}
                />
              )}

              {showRhythmPicker && (
                <DualWheelPickerModal
                  isOpen={showRhythmPicker}
                  onClose={onHideRhythmPicker}
                  leftValue={breathInDuration}
                  rightValue={breathOutDuration}
                  onChange={(inValue, outValue) => {
                    onBreathRhythmChange?.(inValue, outValue);
                  }}
                  leftLabel={t('nadech') || 'nádech'}
                  rightLabel={t('vydech') || 'výdech'}
                  leftMin={1}
                  leftMax={20}
                  leftStep={1}
                  rightMin={1}
                  rightMax={20}
                  rightStep={1}
                  title={t('rytmusDychania') || 'rytmus dýchání'}
                />
              )}
            </Suspense>
          )}
        </FramerSection>
      )}
    </>
  );
};

export default MeditationSettings;


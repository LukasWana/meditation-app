import React, { Suspense, lazy } from 'react';

// Lazy loading modálů pro lepší performance
const WheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.WheelPickerModal })));
const DualWheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.DualWheelPickerModal })));

/**
 * Komponenta pro všechny modaly pro výběr parametrů dýchání
 *
 * @param {boolean} showPreparationPicker - Zda zobrazit picker přípravy
 * @param {boolean} showDurationPicker - Zda zobrazit picker délky
 * @param {boolean} showRhythmPicker - Zda zobrazit picker rytmu
 * @param {number} preparationTime - Čas přípravy v sekundách
 * @param {number} breathDuration - Délka dýchání v minutách
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 * @param {Function} onClosePreparation - Handler pro zavření pickeru přípravy
 * @param {Function} onCloseDuration - Handler pro zavření pickeru délky
 * @param {Function} onCloseRhythm - Handler pro zavření pickeru rytmu
 * @param {Function} onPreparationChange - Handler pro změnu času přípravy
 * @param {Function} onDurationChange - Handler pro změnu délky dýchání
 * @param {Function} onRhythmChange - Handler pro změnu rytmu
 * @param {Function} onSoundButtonClick - Handler pro kliknutí na tlačítko zvuku
 * @param {Function} t - Funkce pro překlad
 */
const DychaniModals = ({
  showPreparationPicker,
  showDurationPicker,
  showRhythmPicker,
  preparationTime,
  breathDuration,
  breathInDuration,
  breathOutDuration,
  onClosePreparation,
  onCloseDuration,
  onCloseRhythm,
  onPreparationChange,
  onDurationChange,
  onRhythmChange,
  onSoundButtonClick,
  t
}) => {
  if (!showPreparationPicker && !showDurationPicker && !showRhythmPicker) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      {showPreparationPicker && (
        <WheelPickerModal
          isOpen={showPreparationPicker}
          onClose={onClosePreparation}
          value={preparationTime}
          onChange={onPreparationChange}
          min={0}
          max={60}
          step={1}
          label={t('sekund')}
          title={t('priprava') || 'příprava'}
          onSoundButtonClick={onSoundButtonClick}
        />
      )}

      {showDurationPicker && (
        <WheelPickerModal
          isOpen={showDurationPicker}
          onClose={onCloseDuration}
          value={breathDuration}
          onChange={onDurationChange}
          min={1}
          max={60}
          step={1}
          label={t('minut')}
          title={t('dlzka') || 'délka'}
          onSoundButtonClick={onSoundButtonClick}
        />
      )}

      {showRhythmPicker && (
        <DualWheelPickerModal
          isOpen={showRhythmPicker}
          onClose={onCloseRhythm}
          leftValue={breathInDuration}
          rightValue={breathOutDuration}
          onChange={onRhythmChange}
          leftLabel={t('nadech') || 'nádech'}
          rightLabel={t('vydech') || 'výdech'}
          leftMin={1}
          leftMax={20}
          leftStep={1}
          rightMin={1}
          rightMax={20}
          rightStep={1}
          title={t('rytmus') || 'rytmus'}
          onSoundButtonClick={onSoundButtonClick}
        />
      )}
    </Suspense>
  );
};

export default DychaniModals;


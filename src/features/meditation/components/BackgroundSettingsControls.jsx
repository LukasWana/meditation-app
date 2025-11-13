import React, { useState, useMemo, lazy, Suspense } from 'react';
import { FramerButton } from '@components';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { AnimatePresence, motion } from 'framer-motion';

const ShaderGallery = lazy(() => import('@components/ShaderGallery'));

const BLEND_MODE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'shines', label: 'Shines' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

const DEFAULT_CATEGORIES = [
  { key: 'built-in', label: 'Vestavěné' },
  { key: 'shaders', label: 'Shadery' }
];

const BackgroundSettingsControls = ({
  section,
  defaultColor = '#f4ddc4',
  // eslint-disable-next-line no-unused-vars
  buttonLabel: _buttonLabel = 'Změnit pozadí',
  // eslint-disable-next-line no-unused-vars
  closeLabel: _closeLabel = 'Zavřít nastavení pozadí',
  wrapperClassName = 'w-full',
  // eslint-disable-next-line no-unused-vars
  buttonClassName: _buttonClassName = 'rounded-full border border-black/15 bg-white/70 px-6 py-3 text-xs uppercase tracking-[0.25em]',
  panelWrapperClassName = 'mx-auto max-w-xl space-y-5 rounded-3xl border border-black/10 bg-white/80 p-6 shadow-lg backdrop-blur',
  categories = DEFAULT_CATEGORIES,
  triggerRenderer = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [shaderCategory, setShaderCategory] = useState(categories[0]?.key ?? 'built-in');

  const {
    getShaderForSection,
    getColorForSection,
    setColorForSection,
    clearColorForSection,
    setShaderForSection,
    getOverlaySettings,
    setOverlaySettingsForSection
  } = useShaderSettings();
  const { transitionState, startTransition } = usePlayback();

  const colorOverride = getColorForSection(section);
  const overlaySettings = getOverlaySettings(section) || {};
  const shaderOpacityPercent = Math.round((overlaySettings.opacity ?? 0.75) * 100);
  const shaderIntensityPercent = Math.round((overlaySettings.intensity ?? 0.8) * 100);
  const blendMode = overlaySettings.blendMode || 'normal';

  const selectedShader = useMemo(
    () => getShaderForSection(section) || section,
    [getShaderForSection, section]
  );

  const colorValue = colorOverride || defaultColor;

  const toggleOpen = () => {
    setIsOpen(prev => {
      if (prev) {
        setIsGalleryVisible(false);
      }
      return !prev;
    });
  };

  const handleColorChange = (value) => {
    if (!value) {
      clearColorForSection(section);
      return;
    }
    setColorForSection(section, value);
  };

  const handleShaderOpacityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection(section, { opacity: Number(numeric.toFixed(2)) });
  };

  const handleShaderIntensityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection(section, { intensity: Number(numeric.toFixed(2)) });
  };

  const handleBlendModeChange = (event) => {
    setOverlaySettingsForSection(section, { blendMode: event.target.value });
  };

  const handleShaderSelect = (shaderId) => {
    const fromKey = transitionState?.toShaderKey || selectedShader || '__BLACK__';
    setShaderForSection(section, shaderId);
    startTransition?.({ shaderKey: fromKey }, { shaderKey: shaderId || '__BLACK__' });
    setIsGalleryVisible(false);
  };

  return (
    <div className={wrapperClassName}>
      {typeof triggerRenderer === 'function' ? (
        triggerRenderer({
          toggleOpen,
          isOpen,
          colorValue,
          selectedShader,
          overlaySettings
        })
      ) : (
        // <FramerButton
        //   onClick={toggleOpen}
        //   variant="ghost"
        //   className={buttonClassName}
        // >
        //   {isOpen ? closeLabel : buttonLabel}
        // </FramerButton>
        null
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <div className={panelWrapperClassName}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Barva</span>
                <input
                  type="color"
                  value={colorValue}
                  onChange={(event) => handleColorChange(event.target.value)}
                  onInput={(event) => handleColorChange(event.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-black/10 bg-white shadow-sm focus:outline-none"
                />
                <FramerButton
                  onClick={() => clearColorForSection(section)}
                  variant="ghost"
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs uppercase tracking-[0.2em]"
                >
                  Reset
                </FramerButton>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Shader</span>
                <FramerButton
                  onClick={() => setIsGalleryVisible(prev => !prev)}
                  variant="ghost"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs uppercase tracking-[0.2em]"
                >
                  {isGalleryVisible ? 'Skrýt shadery' : 'Vybrat shader'}
                </FramerButton>
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  {selectedShader}
                </span>
              </div>

              <div>
                <label className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-500">
                  <span>Průhlednost shaderu</span>
                  <span>{shaderOpacityPercent}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={shaderOpacityPercent}
                  onChange={handleShaderOpacityChange}
                  className="mt-2 w-full accent-black"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-500">
                  <span>Intenzita shaderu</span>
                  <span>{shaderIntensityPercent}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={shaderIntensityPercent}
                  onChange={handleShaderIntensityChange}
                  className="mt-2 w-full accent-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-gray-500">
                  Efekt
                </label>
                <select
                  value={blendMode}
                  onChange={handleBlendModeChange}
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  {BLEND_MODE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <AnimatePresence>
                {isGalleryVisible && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 p-4"
                  >
                    <div className="mb-3 flex gap-2">
                      {categories.map(({ key, label }) => (
                        <FramerButton
                          key={key}
                          onClick={() => setShaderCategory(key)}
                          variant={shaderCategory === key ? 'primary' : 'ghost'}
                          className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]"
                        >
                          {label}
                        </FramerButton>
                      ))}
                    </div>
                    <Suspense fallback={null}>
                      <ShaderGallery
                        selectedVariant={selectedShader}
                        onSelect={handleShaderSelect}
                        section={section}
                        category={shaderCategory}
                      />
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BackgroundSettingsControls;


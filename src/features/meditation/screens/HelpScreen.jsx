import React from 'react';
import FramerButton from '@components/FramerButton';
import FramerSection from '@components/FramerSection';
import FramerPageTransition from '@components/FramerPageTransition';
import BackButton from '@components/BackButton';
import { useTheme } from '@contexts/ThemeContext';

const HelpScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const { getScreenBackgroundColor } = useTheme();

  return (
    <FramerPageTransition screenKey="help">
      <div
        className="min-h-screen w-full max-w-full flex flex-col overflow-x-hidden relative pb-20"
        style={{ backgroundColor: getScreenBackgroundColor() }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="flex-1 flex items-center justify-center p-2 sm:p-8">
          <div className="max-w-md w-full mt-16">
            <FramerSection
              className="mb-16"
              animationType="fadeIn"
              delay={0.1}
            >
              <h1 className="text-6xl font-light text-center">
                první pomoc
              </h1>
            </FramerSection>

            <div className="space-y-6">
              <FramerSection
                animationType="slideInUp"
                delay={0.2}
              >
                <FramerButton
                  onClick={() => onNavigateToScreen('breath')}
                  variant="ghost"
                  className="w-full p-2 sm:p-8 text-left"
                >
                  <div>
                    <h3 className="text-3xl font-light mb-2">
                      dýchanie
                    </h3>
                    <p className="text-gray-500">
                      upokojujúce dýchacie cvičenie
                    </p>
                  </div>
                </FramerButton>
              </FramerSection>

              <FramerSection
                animationType="slideInUp"
                delay={0.3}
              >
                <FramerButton
                  variant="ghost"
                  className="w-full p-2 sm:p-8 text-left"
                >
                  <div>
                    <h3 className="text-3xl font-light mb-2">
                      ukotvenie
                    </h3>
                    <p className="text-gray-500">
                      5-4-3-2-1 technika
                    </p>
                  </div>
                </FramerButton>
              </FramerSection>

              <FramerSection
                animationType="slideInUp"
                delay={0.4}
              >
                <FramerButton
                  variant="ghost"
                  className="w-full p-2 sm:p-8 text-left"
                >
                  <div>
                    <h3 className="text-3xl font-light mb-2">
                      ticho
                    </h3>
                    <p className="text-gray-500">
                      5 minút kľudu
                    </p>
                  </div>
                </FramerButton>
              </FramerSection>
            </div>

          </div>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default HelpScreen;

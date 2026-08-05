import React from 'react';
import FramerButton from '@components/FramerButton';
import FramerSection from '@components/FramerSection';
import FramerPageTransition from '@components/FramerPageTransition';
import BackButton from '@components/BackButton';
import { Heading } from '@components/ui/Heading';
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
          <div className="max-w-md w-full screen-content-top">
            <FramerSection
              className="text-center mb-6"
              animationType="fadeIn"
              delay={0.1}
            >
              <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Heading level={1}>
                  první pomoc
                </Heading>
              </div>
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
                    <Heading level={3} className="mb-2">
                      dýchanie
                    </Heading>
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
                    <Heading level={3} className="mb-2">
                      ukotvenie
                    </Heading>
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
                    <Heading level={3} className="mb-2">
                      ticho
                    </Heading>
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

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShaderSettingsProvider, useShaderSettings } from '@/contexts/ShaderSettingsContext.jsx';

const TestConsumer = ({ onReady }) => {
  const context = useShaderSettings();

  React.useEffect(() => {
    onReady(context);
  }, [context, onReady]);

  return null;
};

describe('ShaderSettingsProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('migruje legacy názvy sekcí na nové klíče', async () => {
    const legacySettings = {
      slova: 'legacySlovaShader',
      meditation: 'legacyMeditationShader',
      breath: 'legacyBreathShader',
      meditacia: 'legacyMeditaciaShader'
    };
    localStorage.setItem('meditation-app-shader-settings', JSON.stringify(legacySettings));

    const handleReady = vi.fn();

    render(
      <ShaderSettingsProvider>
        <TestConsumer onReady={handleReady} />
      </ShaderSettingsProvider>
    );

    await waitFor(() => {
      expect(handleReady).toHaveBeenCalled();
    });

    const contextValue = handleReady.mock.calls[0][0];

    expect(contextValue.shaderSettings.meditace).toBe('legacySlovaShader');
    expect(contextValue.shaderSettings.dychani).toBe('legacyMeditationShader');
    expect(contextValue.shaderSettings.slova).toBeUndefined();
    expect(contextValue.shaderSettings.meditation).toBeUndefined();
    expect(contextValue.shaderSettings.breath).toBeUndefined();
    expect(contextValue.shaderSettings.meditacia).toBeUndefined();
  });
});



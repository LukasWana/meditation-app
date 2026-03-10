module.exports = {
  root: true,
  ignorePatterns: [
    'dist/**',
    'coverage/**',
    'node_modules/**',
    'public/**',
    '*.config.js',
    '*.config.mjs',

    // Repo-level tooling (řeší se samostatně)
    'functions/**',
    'scripts/**',

    // Dev / pomocné skripty ve src
    'src/scripts/**',

    // Interní debug/overview komponenty
    'src/components/**/*FilesViewer*.jsx',
    'src/components/UnifiedFilesOverview.jsx',
    'src/components/DurationDisplayTest.jsx',

    // Debug/admin obrazovky
    'src/features/**/screens/**/*Debug*.jsx',

    // Audio feature je zatím hodně “work-in-progress” (lint později)
    'src/features/audio/**',

    // Firebase scannery/loader utility hooky (lint později)
    'src/hooks/useFirebase*.js',
    'src/hooks/useFastTrackLoader.js',
    'src/hooks/useUnifiedMetadata.js',
    'src/hooks/useTouchNavigation.js',

    // Vysoký debug/noise screen (lint později)
    'src/features/meditation/screens/SettingsScreen.jsx',

    // Testy nechceme lintovat v lint:app
    'src/tests/**'
  ],
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    'react'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',

    // Umožni záměrně nepoužité parametry/vars prefixované _
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],

    // Často hlučné v UI textech; necháme vypnuté, aby lint byl praktický
    'react/no-unescaped-entities': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.test.jsx', 'src/tests/**/*.js'],
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        test: 'readonly'
      }
    }
  ]
};

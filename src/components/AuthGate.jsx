import React, { useState, useEffect } from 'react';
import { auth } from '../config/secure-firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { testFirebaseAuth } from '../scripts/testFirebaseAuth';
import { validateEmail, validatePassword } from '../utils/validation';
import errorHandler from '../utils/error-handler';

const AuthGate = ({ children, onAuthenticated }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authTestResult, setAuthTestResult] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setIsLoading(false);
        onAuthenticated?.(user);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [onAuthenticated]);

  const testAuth = async () => {
    const result = await testFirebaseAuth();
    setAuthTestResult(result);
    console.log('Auth test result:', result);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsSigningIn(true);
    setError('');

    try {
      // Validace vstupů
      if (!validateEmail(email)) {
        setError('Neplatný formát email adresy');
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setError('Neplatné heslo: ' + passwordValidation.errors.join(', '));
        return;
      }

      // Sanitizace vstupů
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPassword = password.trim();

      await signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);

      // Úspěšné přihlášení
      console.log('✅ Úspěšné přihlášení');

    } catch (error) {
      // Enhanced error handling
      await errorHandler.handleFirebaseError(error, 'signIn', {
        email: email.substring(0, 3) + '***', // Masked email pro bezpečnost
        timestamp: Date.now()
      });

      // Uživatelsky přívětivé error zprávy
      let errorMessage = 'Nesprávné přihlašovací údaje';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Uživatel s touto email adresou neexistuje';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Nesprávné heslo';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Neplatný formát email adresy';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Účet byl deaktivován';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Příliš mnoho pokusů. Zkuste to později';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Problém s připojením. Zkuste to znovu';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Neplatné přihlašovací údaje';
          break;
        default:
          errorMessage = 'Došlo k neočekávané chybě. Zkuste to znovu';
      }

      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-content-container relative">
      <div className="text-center glass-panel p-8 relative z-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-white">Kontrola přístupu...</p>
      </div>
    </div>
    );
  }

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 app-content-container relative">
      <div className="max-w-md w-full space-y-8 glass-panel p-8 relative z-10">
        <div>
          <div className="mx-auto h-12 w-12 glass-panel-inner flex items-center justify-center" style={{ borderRadius: '50%' }}>
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            🔐 Admin přístup
          </h2>
          <p className="mt-2 text-center text-sm text-white/80">
            Správa databází vyžaduje přihlášení
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="glass-input relative block w-full px-4 py-3 text-white placeholder-white/70 sm:text-sm"
                placeholder="Email adresa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Heslo
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="glass-input relative block w-full px-4 py-3 text-white placeholder-white/70 sm:text-sm"
                placeholder="Heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="glass-panel-inner p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)' }}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">
                    Chyba přihlášení
                  </h3>
                  <div className="mt-2 text-sm text-red-100">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSigningIn}
              className="glass-button w-full flex justify-center py-3 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSigningIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Přihlašování...
                </>
              ) : (
                'Přihlásit se'
              )}
            </button>
          </div>

          <div className="text-center space-y-4">
            <button
              type="button"
              onClick={testAuth}
              className="text-xs text-white/70 hover:text-white underline transition-colors"
            >
              🧪 Test Firebase Auth
            </button>

            {authTestResult && (
              <div className={`text-xs p-2 rounded glass-panel-inner ${
                authTestResult.success
                  ? 'text-green-300 border-green-500/50'
                  : 'text-red-300 border-red-500/50'
              }`}>
                {authTestResult.success ? '✅' : '❌'} {authTestResult.message || authTestResult.error}
              </div>
            )}

            <p className="text-xs text-white/50">
              Pro přístup k administraci databází kontaktujte administrátora
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthGate;

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Kontrola přístupu...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🔐 Admin přístup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Správa databází vyžaduje přihlášení
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="rounded-md shadow-sm -space-y-px">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Chyba přihlášení
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              🧪 Test Firebase Auth
            </button>

            {authTestResult && (
              <div className={`text-xs p-2 rounded ${
                authTestResult.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {authTestResult.success ? '✅' : '❌'} {authTestResult.message || authTestResult.error}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Pro přístup k administraci databází kontaktujte administrátora
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthGate;

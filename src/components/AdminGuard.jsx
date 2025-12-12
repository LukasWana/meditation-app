import React from 'react';
import { useAuth } from '@contexts/AuthContext';

export const AdminGuard = ({ children }) => {
  const { user, isAdmin, isLoading, signInWithGoogle, signOut, error } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
        <h1 className="text-2xl font-semibold">Přihlášení vyžadováno</h1>
        <p>Pro přístup do administrace se přihlaste přes Google.</p>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Přihlásit se přes Google
        </button>
        {error && <p className="text-red-600 text-sm">{error.message}</p>}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
        <h1 className="text-2xl font-semibold">Nemáte oprávnění</h1>
        <p>Účet nemá admin oprávnění. Přihlaste se admin účtem.</p>
        <div className="flex gap-3">
          <button
            onClick={signOut}
            className="bg-gray-200 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Odhlásit
          </button>
          <button
            onClick={signInWithGoogle}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Přihlásit jiným účtem
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminGuard;


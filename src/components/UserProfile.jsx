import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, LogIn, Cloud, CloudOff, Loader } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';

const UserProfile = () => {
  const { user, isLoading, signInWithGoogle, signOut, syncLocalToCloud, syncCloudToLocal } = useAuth();

  const [showMenu, setShowMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Zavři menu při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      console.warn('🟡 Starting sign out...');
      setShowMenu(false); // Zavři menu před odhlášením

      // Zavolej signOut funkci
      console.warn('🟡 Calling signOut function...');
      const result = await signOut();
      console.warn('🟢 Sign out function returned:', result);
      console.warn('🟢 Sign out successful');

      // Počkej chvíli, aby se stav aktualizoval
      setTimeout(() => {
        console.warn('🟢 After signOut - user should be null');
      }, 1000);
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert('Odhlášení selhalo: ' + (error.message || error));
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      await syncLocalToCloud();
      alert('Nastavení byla synchronizována do cloudu.');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Synchronizace selhala. Zkuste to znovu.');
    } finally {
      setIsSyncing(false);
      setShowMenu(false);
    }
  };

  const handleSyncFromCloud = async () => {
    setIsSyncing(true);
    try {
      await syncCloudToLocal();
      alert('Nastavení byla načtena z cloudu.');
      // Obnov stránku, aby se nastavení projevila
      window.location.reload();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Synchronizace selhala. Zkuste to znovu.');
    } finally {
      setIsSyncing(false);
      setShowMenu(false);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Uživatel';
  const photoURL = user?.photoURL;
  const [imageError, setImageError] = useState(false);

  // Debug: zkontroluj, jestli photoURL existuje
  useEffect(() => {
    if (user) {
      console.log('User object:', {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        providerData: user.providerData
      });
    }
  }, [user]);

  // Reset image error když se změní photoURL
  useEffect(() => {
    setImageError(false);
  }, [photoURL]);

  // Debug: loguj změny showMenu
  useEffect(() => {
    console.log('🟡 showMenu changed:', showMenu);
  }, [showMenu]);

  // console.log('🟢 UserProfile render - showMenu:', showMenu, 'user:', user?.email);

  if (isLoading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow-sm">
        <Loader className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
        type="button"
      >
        <LogIn className="w-5 h-5 text-gray-700" />
        <span className="hidden sm:inline text-sm font-medium text-gray-700">Přihlásit</span>
      </button>
    );
  }

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }

    const newValue = !showMenu;
    setShowMenu(newValue);
    console.warn('🔵 Button clicked, setting showMenu to:', newValue);
  };

  return (
    <>
      <div className="relative z-50" ref={menuRef}>
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2 overflow-visible cursor-pointer"
          type="button"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}
        >
          {photoURL && !imageError ? (
            <img
              src={photoURL}
              alt={displayName}
              className="w-7 h-7 rounded-full object-cover"
              onLoad={() => {
                console.log('✅ Profile image loaded successfully:', photoURL);
              }}
              onError={(e) => {
                console.warn('⚠️ Failed to load profile image:', photoURL);
                setImageError(true);
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center avatar-fallback ${photoURL && !imageError ? 'hidden' : ''}`}>
            <span className="text-white text-xs font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[100px] truncate">
            {displayName}
          </span>
        </button>
      </div>

      {showMenu && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop pro zavření menu */}
          <div
            className="fixed inset-0 z-[9998]"
            onMouseDown={(e) => {
              // Zkontroluj, jestli kliknutí nebylo na tlačítko nebo v menu
              if (e.target.closest('button') || e.target.closest('.fixed.w-64')) {
                return; // Nezavírej menu, pokud je to kliknutí na tlačítko nebo menu
              }
              console.warn('Backdrop clicked, closing menu');
              setShowMenu(false);
            }}
            onClick={(e) => {
              // Zkontroluj, jestli kliknutí nebylo na tlačítko nebo v menu
              if (e.target.closest('button') || e.target.closest('.fixed.w-64')) {
                return; // Nezavírej menu, pokud je to kliknutí na tlačítko nebo menu
              }
              console.warn('Backdrop clicked, closing menu');
              setShowMenu(false);
            }}
            style={{ backgroundColor: 'transparent', pointerEvents: 'auto' }}
          />
          <div
            className="fixed w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[9999]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {photoURL && !imageError ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover"
                    onLoad={() => {
                      console.log('✅ Profile image loaded in menu:', photoURL);
                    }}
                    onError={(e) => {
                      console.warn('⚠️ Failed to load profile image in menu:', photoURL);
                      setImageError(true);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : null}
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center avatar-fallback-menu ${photoURL && !imageError ? 'hidden' : ''}`}>
                  <span className="text-white text-sm font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Menu options */}
            <div className="py-1">
              {/* Sync options - sekce pro synchronizaci */}
              <div className="border-b border-gray-100 pb-1">
                <button
                  onClick={handleSyncToCloud}
                  disabled={isSyncing}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSyncing ? (
                    <Loader className="w-4 h-4 animate-spin text-gray-500" />
                  ) : (
                    <Cloud className="w-4 h-4 text-gray-500" />
                  )}
                  <span>Nahrát do cloudu</span>
                </button>
                <button
                  onClick={handleSyncFromCloud}
                  disabled={isSyncing}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSyncing ? (
                    <Loader className="w-4 h-4 animate-spin text-gray-500" />
                  ) : (
                    <CloudOff className="w-4 h-4 text-gray-500" />
                  )}
                  <span>Načíst z cloudu</span>
                </button>
              </div>

              {/* Logout - hlavní akce */}
              <div className="pt-1">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn('🟢 MouseDown on logout button');
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn('🔴 Click on logout button');
                    handleSignOut(e);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn('🟡 TouchStart on logout button');
                    handleSignOut(e);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors rounded-md mx-1"
                  type="button"
                  style={{ pointerEvents: 'auto', zIndex: 10000 }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Odhlásit se</span>
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default UserProfile;


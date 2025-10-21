import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import RealtimeDatabaseManager from '../../../components/RealtimeDatabaseManager';
import MetadataSyncManager from '../../../components/MetadataSyncManager';
import AuthGate from '../../../components/AuthGate';

const DatabaseAdminScreen = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('realtime');
  const [user, setUser] = useState(null);

  const tabs = [
    { id: 'realtime', label: 'Realtime Database', icon: '🗄️' },
    { id: 'metadata', label: 'Metadata Sync', icon: '🔄' }
  ];

  return (
    <AuthGate onAuthenticated={setUser}>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🔧 Správa databází
              </h1>
              <p className="mt-2 text-gray-600">
                Administrace Firebase databází a synchronizace metadat
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">{user.email}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Admin přístup</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'realtime' && (
            <div>
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  🗄️ Realtime Database Manager
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Správa Firebase Realtime Database, testování připojení a synchronizace metadat
                </p>
              </div>
              <div className="p-6">
                <RealtimeDatabaseManager />
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div>
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  🔄 Metadata Sync Manager
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Synchronizace metadat mezi Firebase Storage, Firestore a Realtime Database
                </p>
              </div>
              <div className="p-6">
                <MetadataSyncManager />
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Informace o přístupu
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Tato stránka je dostupná pouze po přihlášení s administrátorskými oprávněními.
                  Zde můžete spravovat Firebase databáze a synchronizovat metadata z MP3 souborů.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGate>
  );
};

export default DatabaseAdminScreen;

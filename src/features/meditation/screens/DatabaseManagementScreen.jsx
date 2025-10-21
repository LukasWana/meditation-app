import React, { useState } from 'react';
import { useLanguage } from '@contexts/LanguageContext';
import MetadataSyncManager from '@components/MetadataSyncManager';
import RealtimeDatabaseManager from '@components/RealtimeDatabaseManager';

const DatabaseManagementScreen = ({ onNavigateToScreen }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('metadata');

  const tabs = [
    { id: 'metadata', label: 'Metadata Sync', component: MetadataSyncManager },
    { id: 'realtime', label: 'Realtime Database', component: RealtimeDatabaseManager }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-[#f4ddc4] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => onNavigateToScreen('home')}
            className="mb-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Zpět na hlavní stránku
          </button>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Database Management
          </h1>
          <p className="text-gray-600">
            Správa metadat a Realtime Database pro meditační aplikaci
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md">
          {ActiveComponent && <ActiveComponent />}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            Nápověda
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>Metadata Sync:</strong> Synchronizuje metadata z MP3 souborů uložených ve Firebase Storage do Firestore databáze.
            </p>
            <p>
              <strong>Realtime Database:</strong> Poskytuje real-time synchronizaci dat napříč všemi připojenými klienty.
            </p>
            <p>
              <strong>Doporučení:</strong> Pravidelně synchronizujte metadata po přidání nových audio souborů.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagementScreen;




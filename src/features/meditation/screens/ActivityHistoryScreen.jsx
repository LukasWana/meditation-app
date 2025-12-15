import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FramerSection, FramerPageTransition, BackButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import activityHistoryService from '@services/activityHistoryService';
import { Trash2, Clock, Calendar, Filter } from 'lucide-react';

const ActivityHistoryScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const { t } = useLanguage();
  const { getScreenBackgroundColor, getCurrentThemeColors, colorMode } = useTheme();
  const { user } = useAuth();
  const themeColors = getCurrentThemeColors?.() || {};

  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null); // null = všechny sekce
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = user?.uid || 'anonymous';

  // Načti historii při načtení komponenty
  useEffect(() => {
    loadHistory();
  }, [userId]);

  // Filtruj historii podle vybrané sekce
  useEffect(() => {
    if (selectedSection === null) {
      setFilteredHistory(history);
    } else {
      setFilteredHistory(history.filter(activity => activity.section === selectedSection));
    }
  }, [history, selectedSection]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activities = await activityHistoryService.getActivityHistory(userId);
      setHistory(activities);
    } catch (err) {
      console.error('Failed to load activity history:', err);
      setError(t('nepodariloSeNacistHistorie'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async (section = null) => {
    const confirmMessage = section
      ? t('opravduVymazatHistorieProSekci').replace('{section}', getSectionName(section))
      : t('opravduVymazatCelouHistorie');

    if (window.confirm(confirmMessage)) {
      try {
        await activityHistoryService.clearActivityHistory(userId, section);
        await loadHistory();
      } catch (err) {
        console.error('Failed to clear history:', err);
        alert(t('nepodariloSeVymazatHistorie'));
      }
    }
  };

  const getSectionName = (section) => {
    switch (section) {
      case 'meditation':
        return t('meditace');
      case 'music':
        return t('hudba');
      case 'breathing':
        return t('dychanie');
      default:
        return section;
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    try {
      // timeStr je ve formátu HH:MM:SS nebo HH:MM
      return timeStr.substring(0, 5); // Vrať jen HH:MM
    } catch {
      return timeStr;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs > 0 ? `${secs}s` : ''}`;
    } else {
      return `${secs}s`;
    }
  };

  const sections = [
    { id: null, name: t('vse'), key: 'vse' },
    { id: 'meditation', name: t('meditace'), key: 'meditacia' },
    { id: 'music', name: t('hudba'), key: 'hudba' },
    { id: 'breathing', name: t('dychanie'), key: 'dychanie' }
  ];

  return (
    <FramerPageTransition screenKey="activity-history">
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden overflow-y-auto relative"
        style={{
          backgroundColor: getScreenBackgroundColor()
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('settings')} />

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, paddingBottom: '2rem', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('historieAktivity')}
              </h1>
            </div>
          </FramerSection>

          {/* Filtry sekcí */}
          <FramerSection
            animationType="slideInUp"
            delay={0.2}
            className="mb-4"
          >
            <div
              className="w-full p-4 backdrop-blur rounded-none border"
              style={{
                backgroundColor: themeColors?.card || (colorMode === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
                borderColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Filter size={18} style={{ color: themeColors?.textSecondary || (colorMode === 'dark' ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)') }} />
                <span className="text-sm font-medium" style={{ color: themeColors?.textSecondary || (colorMode === 'dark' ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)') }}>
                  {t('filtrovatPodleSekce')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                  <motion.button
                    key={section.id || 'all'}
                    onClick={() => setSelectedSection(section.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                      selectedSection === section.id
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedSection === section.id
                        ? (themeColors?.primary || 'rgba(0, 0, 0, 0.8)')
                        : (colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
                      color: selectedSection === section.id
                        ? '#fff'
                        : (themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'))
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {section.name}
                  </motion.button>
                ))}
              </div>
            </div>
          </FramerSection>

          {/* Tlačítko pro vymazání historie */}
          {filteredHistory.length > 0 && (
            <FramerSection
              animationType="slideInUp"
              delay={0.25}
              className="mb-4"
            >
              <motion.button
                onClick={() => handleClearHistory(selectedSection)}
                className="w-full p-3 rounded-none border flex items-center justify-center gap-2"
                style={{
                  backgroundColor: themeColors?.card || (colorMode === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
                  borderColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)')
                }}
                whileHover={{ opacity: 0.8 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 size={18} />
                <span>{t('vymazatHistorie').replace('{section}', selectedSection ? getSectionName(selectedSection) : t('vsechnu'))}</span>
              </motion.button>
            </FramerSection>
          )}

          {/* Seznam historie */}
          {isLoading ? (
            <FramerSection
              animationType="slideInUp"
              delay={0.3}
            >
              <div
                className="w-full p-6 backdrop-blur rounded-none border text-center"
                style={{
                  backgroundColor: themeColors?.card || (colorMode === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
                  borderColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)')
                }}
              >
                <p>{t('nacitaniHistorie')}</p>
              </div>
            </FramerSection>
          ) : error ? (
            <FramerSection
              animationType="slideInUp"
              delay={0.3}
            >
              <div
                className="w-full p-6 backdrop-blur rounded-none border text-center"
                style={{
                  backgroundColor: themeColors?.card || (colorMode === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
                  borderColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)')
                }}
              >
                <p className="text-red-500">{error}</p>
                <button
                  onClick={loadHistory}
                  className="mt-4 px-4 py-2 bg-gray-200 rounded"
                  style={{
                    backgroundColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    color: themeColors?.text
                  }}
                >
                  {t('zkusitZnovu')}
                </button>
              </div>
            </FramerSection>
          ) : filteredHistory.length === 0 ? (
            <FramerSection
              animationType="slideInUp"
              delay={0.3}
            >
              <div
                className="w-full p-6 backdrop-blur rounded-none border text-center"
                style={{
                  backgroundColor: themeColors?.card || (colorMode === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
                  borderColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  color: themeColors?.textSecondary || (colorMode === 'dark' ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)')
                }}
              >
                <p>{t('zadnaHistorieKZobrazeni')}</p>
              </div>
            </FramerSection>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredHistory.map((activity, index) => (
                  <FramerSection
                    key={activity.id}
                    animationType="slideInUp"
                    delay={0.3 + index * 0.05}
                  >
                    <div
                      className="w-full p-4 backdrop-blur rounded-none border"
                      style={{
                        backgroundColor: themeColors?.card || (colorMode === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
                        borderColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {/* Sekce a popis */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                color: themeColors?.textSecondary || (colorMode === 'dark' ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)')
                              }}
                            >
                              {getSectionName(activity.section)}
                            </span>
                          </div>
                          <p
                            className="text-base font-medium"
                            style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
                          >
                            {activity.description || t('aktivita')}
                          </p>
                        </div>
                      </div>

                      {/* Datum, čas a délka */}
                      <div className="flex items-center gap-4 text-sm" style={{ color: themeColors?.textSecondary || (colorMode === 'dark' ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)') }}>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{formatDate(activity.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{formatTime(activity.time)}</span>
                        </div>
                        {activity.duration > 0 && (
                          <div className="flex items-center gap-1">
                            <span>⏱</span>
                            <span>
                              {activity.extraTime > 0
                                ? `+${formatDuration(activity.extraTime)}`
                                : formatDuration(activity.duration)
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </FramerSection>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default ActivityHistoryScreen;


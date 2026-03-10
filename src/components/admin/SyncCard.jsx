import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export const SyncCard = ({
  title,
  description,
  icon: Icon,
  buttonIcon: ButtonIcon,
  buttonText,
  onClick,
  loading,
  delay = 0,
  color = 'blue',
  isDarkMode
}) => {
  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const colorMap = {
    green: 'bg-green-500 hover:bg-green-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
  };

  const textColorMap = {
    green: 'text-green-500',
    purple: 'text-purple-500',
    blue: 'text-blue-500',
    orange: 'text-orange-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`p-6 rounded-lg border ${cardClasses}`}
    >
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <Icon className={`mr-2 ${textColorMap[color]}`} size={24} />
        {title}
      </h3>
      <p className="text-gray-500 mb-4">{description}</p>
      <button
        onClick={onClick}
        disabled={loading}
        className={`w-full ${colorMap[color]} disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center`}
      >
        {loading ? (
          <RefreshCw className="animate-spin mr-2" size={20} />
        ) : (
          <ButtonIcon className="mr-2" size={20} />
        )}
        {loading ? 'Zpracovávám...' : buttonText}
      </button>
    </motion.div>
  );
};

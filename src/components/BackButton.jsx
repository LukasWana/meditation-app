import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import FramerButton from './FramerButton';

const BackButton = ({ onClick, className = '' }) => {
  return (
    <motion.div
      className={`absolute top-6 left-6 z-50 ${className}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <FramerButton
        onClick={onClick}
        variant="ghost"
        className="w-12 h-12 flex items-center justify-center p-0 z-50 shadow-md"
      >
        <ArrowLeft size={20} />
      </FramerButton>
    </motion.div>
  );
};

export default BackButton;

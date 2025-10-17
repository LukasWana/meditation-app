import { motion } from 'framer-motion';

const TrackSwitcher = ({
  tracks,
  currentTrackIndex,
  onTrackChange
}) => {
  if (!tracks || tracks.length <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      {tracks.map((track, index) => (
        <motion.button
          key={index}
          onClick={() => index !== currentTrackIndex && onTrackChange(index)}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
            ${index === currentTrackIndex
              ? 'bg-[#f4ddc4] text-black border-2 border-black cursor-default'
              : 'bg-white/20 text-white border border-white/30 hover:bg-white/30 cursor-pointer'
            }
          `}
          whileHover={index !== currentTrackIndex ? { scale: 1.05 } : {}}
          whileTap={index !== currentTrackIndex ? { scale: 0.95 } : {}}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
        >
          {index + 1}
        </motion.button>
      ))}
    </div>
  );
};

export default TrackSwitcher;

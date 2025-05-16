'use client';

import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <motion.div 
      className="fixed inset-0 w-full h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div 
        className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-violet-500/30 rounded-full mix-blend-normal filter blur-[160px]"
        initial={{ scale: 1, opacity: 0 }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3
        }}
      />
      <motion.div 
        className="absolute bottom-0 right-1/4 w-[45rem] h-[45rem] bg-violet-900/40 rounded-full mix-blend-normal filter blur-[160px]"
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6
        }}
      />
      <motion.div 
        className="absolute top-1/4 right-1/3 w-[35rem] h-[35rem] bg-violet-900/60 rounded-full mix-blend-normal filter blur-[130px]"
        initial={{ scale: 1, opacity: 0 }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.9
        }}
      />
    </motion.div>
  );
} 
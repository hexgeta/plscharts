'use client';

import { GoTable } from '@/components/go-table';
import { motion } from 'framer-motion';

export default function GoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black py-8 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden">
        <motion.div 
          className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-violet-500/30 rounded-full mix-blend-normal filter blur-[160px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-[45rem] h-[45rem] bg-violet-900/40 rounded-full mix-blend-normal filter blur-[160px]"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div 
          className="absolute top-1/4 right-1/3 w-[35rem] h-[35rem] bg-violet-900/60 rounded-full mix-blend-normal filter blur-[130px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Content */}
      <motion.div 
        className="relative z-10 w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <GoTable />
      </motion.div>
    </div>
  );
} 
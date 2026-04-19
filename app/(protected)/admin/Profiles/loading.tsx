"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080B14]">

      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-sky-500/5 dark:bg-sky-500/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-violet-500/5 dark:bg-violet-500/8 blur-3xl" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-xl p-8 shadow-2xl dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex flex-col items-center space-y-6">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="relative"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </div>
            </motion.div>

            {/* Loading text */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-center space-y-2"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Loading Profiles
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Fetching user data...
              </p>
            </motion.div>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex space-x-1"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-sky-500"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
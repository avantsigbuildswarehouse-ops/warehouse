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
        className="relative flex flex-col items-center gap-8 rounded-3xl border border-slate-200 bg-white/80 px-16 py-12 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <Image
            src="/avantbg.png"
            alt="Avant Logo"
            width={180}
            height={52}
            className="object-contain scale-150 drop-shadow-sm"
            priority
          />

        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10"
        />

        {/* Animated bar loader */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-4 w-full"
        >
          {/* Track */}
          <div className="relative h-1 w-48 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 to-violet-500"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                repeatType: "loop",
              }}
              style={{ width: "50%" }}
            />
          </div>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-sky-400 dark:bg-sky-500"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Label */}
          <motion.p
            className="text-xs font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Loading workspace
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Bottom tagline */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="absolute bottom-8 text-xs text-slate-400 dark:text-slate-600 tracking-wide"
      >
        Avant Inventory Management System
      </motion.p>

    </div>
  );
}
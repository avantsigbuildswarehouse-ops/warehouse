"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function AppLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080B14]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/5 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute left-1/3 top-1/3 h-[300px] w-[300px] rounded-full bg-violet-500/5 blur-3xl dark:bg-violet-500/8" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center gap-8 rounded-3xl border border-slate-200 bg-white/80 px-16 py-12 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60"
      >
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
            className="scale-150 object-contain drop-shadow-sm"
            priority
          />
        </motion.div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex w-full flex-col items-center gap-4"
        >
          <div className="relative h-1 w-48 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 to-violet-500"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", repeatType: "loop" }}
              style={{ width: "50%" }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-sky-400 dark:bg-sky-500"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.2, ease: "easeInOut" }}
              />
            ))}
          </div>

          <motion.p
            className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Loading workspace
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}

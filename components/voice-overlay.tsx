"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils/cn";

export type VoiceStatus = "idle" | "listening" | "transcribing" | "unsupported";

export function VoiceOverlay({
  visible,
  status,
  elapsedLabel
}: {
  visible: boolean;
  status: VoiceStatus;
  elapsedLabel: string;
}) {
  const text =
    status === "listening"
      ? "Listening..."
      : status === "transcribing"
        ? "Turning speech into words..."
        : status === "unsupported"
          ? "Voice is not available here"
          : "";

  return (
    <motion.div
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.985,
        y: visible ? 0 : 8
      }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center rounded-[32px]",
        visible ? "z-10" : "-z-10"
      )}
    >
      <div className="absolute inset-x-12 top-1/2 h-28 -translate-y-1/2 overflow-hidden rounded-full">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-100/0 via-sky-100/70 to-sky-100/0 blur-2xl dark:via-sky-400/10" />
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className="absolute left-0 right-0 top-1/2 h-14 -translate-y-1/2 rounded-full border border-white/40 bg-transparent blur-[2px] dark:border-white/10"
            animate={{
              x: ["-4%", "4%", "-2%"],
              y: [index * 2, -index * 1.5, index * 1.2],
              scaleY: [0.7 + index * 0.06, 1 + index * 0.08, 0.76 + index * 0.05],
              opacity: [0.35, 0.72, 0.4]
            }}
            transition={{
              duration: 3.8 + index * 0.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-24">
        <p className="text-[40px] font-medium tracking-[-0.04em] text-trace-text">{text}</p>
        <span className="text-3xl text-trace-sub">{elapsedLabel}</span>
      </div>
    </motion.div>
  );
}

"use client";

import { Clock3, Mic2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface BottomDockProps {
  onVoice: () => void;
  onSave: () => void;
  onReflect: () => void;
  voiceActive: boolean;
  saveHint?: string;
  voiceHint?: string;
}

export function BottomDock({
  onVoice,
  onSave,
  onReflect,
  voiceActive,
  saveHint = "⌘↵",
  voiceHint = "⇧Space"
}: BottomDockProps) {
  return (
    <div className="pointer-events-auto mx-auto mt-8 inline-flex items-center gap-1 rounded-dock bg-white/72 p-2 shadow-dock backdrop-blur-2xl dark:bg-white/[0.06]">
      <button
        type="button"
        onClick={onVoice}
        className={cn(
          "flex items-center gap-2 rounded-dock px-5 py-3 text-[15px] font-medium text-trace-sub transition duration-200 ease-trace hover:text-trace-text",
          voiceActive && "bg-trace-accent text-trace-text"
        )}
      >
        <Mic2 className="h-4 w-4" />
        语音
        <span className="text-xs text-trace-ghost">{voiceHint}</span>
      </button>

      <span className="h-6 w-px bg-trace-line" />

      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-2 rounded-dock px-6 py-3 text-[15px] font-semibold text-trace-text transition duration-200 ease-trace hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
      >
        留下
        <span className="text-xs font-medium text-trace-ghost">{saveHint}</span>
      </button>

      <span className="h-6 w-px bg-trace-line" />

      <button
        type="button"
        onClick={onReflect}
        className="flex items-center gap-2 rounded-dock px-5 py-3 text-[15px] font-medium text-trace-sub transition duration-200 ease-trace hover:text-trace-text"
      >
        <Clock3 className="h-4 w-4" />
        回看
        <span className="text-xs text-trace-ghost">⌘/</span>
      </button>
    </div>
  );
}

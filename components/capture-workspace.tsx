"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { History, Plus, Tag as TagIcon } from "lucide-react";

import type { Entry, Profile, Tag } from "@/types";
import { AppShell } from "@/components/app-shell";
import { BottomDock } from "@/components/bottom-dock";
import { EmptyState } from "@/components/empty-state";
import { TagChip } from "@/components/tag-chip";
import { VoiceOverlay, type VoiceStatus } from "@/components/voice-overlay";
import { formatEntryTime } from "@/lib/utils/entry-time";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

function inferInputMode({
  voiceUsed,
  refinedAfterVoice
}: {
  voiceUsed: boolean;
  refinedAfterVoice: boolean;
}) {
  if (voiceUsed && refinedAfterVoice) return "mixed";
  if (voiceUsed) return "voice";
  return "text";
}

export function CaptureWorkspace({
  profile,
  initialEntries,
  initialTags
}: {
  profile: Profile;
  initialEntries: Entry[];
  initialTags: Tag[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftRef = useRef("");
  const voiceDraftBaseRef = useRef("");
  const voiceTranscriptRef = useRef("");

  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [status, setStatus] = useState("打开即写");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [tagDraft, setTagDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [refinedAfterVoice, setRefinedAfterVoice] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("trace-v1-draft");
    if (stored) setDraft(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("trace-v1-draft", draft);
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceStatus("unsupported");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";

    let interim = "";

    recognition.onstart = () => {
      voiceDraftBaseRef.current = draftRef.current;
      voiceTranscriptRef.current = "";
      setVoiceStatus("listening");
      setStatus("正在听");
      const started = Date.now();
      intervalRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - started) / 1000));
      }, 200);
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      interim = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const inserted = finalText || interim;
      if (!inserted) return;

      voiceTranscriptRef.current = `${finalText}${interim}`.trim();
      const next = [voiceDraftBaseRef.current.trim(), voiceTranscriptRef.current]
        .filter(Boolean)
        .join("\n");
      setDraft(next);
      setVoiceUsed(true);
    };

    recognition.onerror = () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setVoiceStatus("unsupported");
      setStatus("这里还不能直接说");
    };

    recognition.onend = () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setVoiceStatus("idle");
      setElapsed(0);
      setStatus("刚才那句，已经落下");
    };

    recognitionRef.current = recognition;

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void handleSave();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        router.push("/reflect");
      }
      if (event.code === "Space" && event.shiftKey) {
        event.preventDefault();
        toggleVoice();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const activeTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags]
  );

  const loadEntry = (entry: Entry) => {
    setActiveEntryId(entry.id);
    setDraft(entry.content);
    setSelectedTagIds(entry.tags?.map((tag) => tag.id) ?? []);
    setStatus("继续写");
    setLastSavedAt(formatEntryTime(entry.updated_at));
    textareaRef.current?.focus();
  };

  const persistEntryTags = async (entryId: string, tagIds: string[]) => {
    await supabase.from("entry_tags").delete().eq("entry_id", entryId);
    if (!tagIds.length) return;
    await supabase.from("entry_tags").insert(tagIds.map((tagId) => ({ entry_id: entryId, tag_id: tagId })));
  };

  const handleSave = async () => {
    const content = draft.trim();
    if (!content) {
      setStatus("先留一句");
      return;
    }

    const inputMode = inferInputMode({ voiceUsed, refinedAfterVoice });
    const payload = {
      user_id: profile.id,
      content,
      input_mode: inputMode,
      updated_at: new Date().toISOString()
    };

    setStatus("收着…");

    if (activeEntryId) {
      const { data, error } = await supabase
        .from("entries")
        .update(payload)
        .eq("id", activeEntryId)
        .select("*")
        .single();

      if (error) {
        setStatus("没收好");
        return;
      }

      await persistEntryTags(activeEntryId, selectedTagIds);
      const nextEntry = {
        ...(entries.find((entry) => entry.id === activeEntryId) as Entry),
        ...data,
        tags: tags.filter((tag) => selectedTagIds.includes(tag.id))
      } as Entry;

      setEntries((current) => current.map((entry) => (entry.id === activeEntryId ? nextEntry : entry)));
    } else {
      const { data, error } = await supabase
        .from("entries")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        setStatus("没收好");
        return;
      }

      await persistEntryTags(data.id, selectedTagIds);
      const nextEntry = {
        ...data,
        tags: tags.filter((tag) => selectedTagIds.includes(tag.id))
      } as Entry;

      setEntries((current) => [nextEntry, ...current]);
      setActiveEntryId(data.id);
    }

    setLastSavedAt(format(new Date(), "HH:mm", { locale: zhCN }));
    setStatus("收好了");
    setVoiceUsed(false);
    setRefinedAfterVoice(false);
    startTransition(() => router.refresh());
  };

  const toggleVoice = () => {
    if (!recognitionRef.current || voiceStatus === "unsupported") {
      setStatus("这里还不能直接说");
      return;
    }

    if (voiceStatus === "listening") {
      setVoiceStatus("transcribing");
      setStatus("正在落字");
      recognitionRef.current.stop();
      return;
    }

    setElapsed(0);
    recognitionRef.current.start();
  };

  const handleAddTag = async () => {
    const name = tagDraft.trim();
    if (!name) return;

    const existing = tags.find((tag) => tag.name === name);
    if (existing) {
      setSelectedTagIds((current) => [...new Set([...current, existing.id])]);
      setTagDraft("");
      return;
    }

    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: profile.id, name, color: null })
      .select("*")
      .single();

    if (error) return;

    setTags((current) => [...current, data]);
    setSelectedTagIds((current) => [...new Set([...current, data.id])]);
    setTagDraft("");
  };

  const rightPanel = (
    <div className="flex h-full flex-col">
      <div>
        <p className="text-[13px] font-medium tracking-[0.18em] text-trace-ghost">Context</p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-trace-text">今天</h2>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-trace-sub">
          <History className="h-4 w-4" />
          Recent
        </div>
        <div className="space-y-2">
          {entries.slice(0, 5).map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => loadEntry(entry)}
              className="w-full rounded-pane px-4 py-3 text-left transition hover:bg-white/56 dark:hover:bg-white/[0.04]"
            >
              <div className="text-xs text-trace-ghost">{formatEntryTime(entry.updated_at)}</div>
              <p className="mt-2 line-clamp-3 text-sm leading-7 text-trace-sub">{entry.content}</p>
            </button>
          ))}
          {!entries.length ? <EmptyState title="现在很安静" body="先留一句，再让时间慢慢堆起来。" /> : null}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-trace-sub">
          <TagIcon className="h-4 w-4" />
          Tags
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button key={tag.id} type="button" onClick={() => setSelectedTagIds((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])}>
              <TagChip label={tag.name} active={selectedTagIds.includes(tag.id)} />
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-dock bg-black/[0.03] p-1.5 dark:bg-white/[0.05]">
          <input
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            placeholder="Add tag"
            className="quiet-focus w-full bg-transparent px-3 py-2 text-sm text-trace-text placeholder:text-trace-ghost"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="rounded-dock p-2 text-trace-sub transition hover:bg-white hover:text-trace-text dark:hover:bg-white/[0.08]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {activeTags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeTags.map((tag) => (
              <TagChip key={tag.id} label={tag.name} active />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <AppShell profile={profile} title="Capture" contextPanel={rightPanel}>
      <div className="relative flex h-full flex-col px-10 py-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium tracking-[0.18em] text-trace-ghost">
              {format(new Date(), "今天 · M月d日", { locale: zhCN })}
            </p>
          </div>
          <p className="text-sm text-trace-ghost">
            {lastSavedAt ? `已自动保存 ${lastSavedAt}` : status}
          </p>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center">
          <VoiceOverlay
            visible={voiceStatus === "listening" || voiceStatus === "transcribing"}
            status={voiceStatus}
            elapsedLabel={new Date(elapsed * 1000).toISOString().slice(14, 19)}
          />

          <div className="relative z-20 flex w-full max-w-[760px] flex-1 flex-col justify-center">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (voiceUsed) setRefinedAfterVoice(true);
              }}
              placeholder="今天你在想什么"
              className="quiet-focus min-h-[320px] w-full bg-transparent text-center text-[56px] font-medium tracking-[-0.05em] text-trace-text placeholder:text-trace-ghost/60"
            />
            <div className="mt-6 text-center text-sm text-trace-ghost">⌘ Enter 保存</div>
          </div>
        </div>

        <BottomDock
          onVoice={toggleVoice}
          onSave={() => void handleSave()}
          onReflect={() => router.push("/reflect")}
          voiceActive={voiceStatus === "listening" || voiceStatus === "transcribing"}
        />
      </div>
    </AppShell>
  );
}

"use client";

import { useMemo, useState } from "react";

import type { Entry, Profile, Tag } from "@/types";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ReflectionList } from "@/components/reflection-list";
import { TagChip } from "@/components/tag-chip";
import { formatEntryTime } from "@/lib/utils/entry-time";

export function ReflectWorkspace({
  profile,
  entries,
  tags
}: {
  profile: Profile;
  entries: Entry[];
  tags: Tag[];
}) {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(entries[0] ?? null);

  const contextPanel = selectedEntry ? (
    <div className="flex h-full flex-col">
      <div>
        <p className="text-[13px] font-medium tracking-[0.18em] text-trace-ghost">Detail</p>
        <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-trace-text">时间翻开了一层</h2>
      </div>
      <article className="mt-8 rounded-pane bg-white/60 p-5 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-trace-ghost">{formatEntryTime(selectedEntry.updated_at)}</span>
          <span className="text-xs uppercase tracking-[0.12em] text-trace-ghost">
            {selectedEntry.input_mode === "voice" ? "Spoken" : selectedEntry.input_mode === "mixed" ? "Refined" : "Written"}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[16px] leading-8 text-trace-text">{selectedEntry.content}</p>
        {selectedEntry.tags?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {selectedEntry.tags.map((tag) => (
              <TagChip key={tag.id} label={tag.name} />
            ))}
          </div>
        ) : null}
      </article>
    </div>
  ) : (
    <EmptyState title="先选一条" body="回看不是列表管理，而是把一小段时间翻开。" />
  );

  return (
    <AppShell profile={profile} title="Reflect" contextPanel={contextPanel}>
      <ReflectionList
        entries={entries}
        tags={tags}
        selectedEntryId={selectedEntry?.id}
        onSelectEntry={setSelectedEntry}
      />
    </AppShell>
  );
}

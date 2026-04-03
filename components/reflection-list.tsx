"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { Entry, Tag } from "@/types";
import { EmptyState } from "@/components/empty-state";
import { ReflectionDayLabel, ReflectionEntry } from "@/components/reflection-entry";
import { TagChip } from "@/components/tag-chip";

function groupEntries(entries: Entry[]) {
  const groups = new Map<string, Entry[]>();

  entries.forEach((entry) => {
    const key = entry.updated_at.slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  });

  return [...groups.entries()];
}

export function ReflectionList({
  entries,
  tags,
  selectedEntryId,
  onSelectEntry
}: {
  entries: Entry[];
  tags: Tag[];
  selectedEntryId?: string;
  onSelectEntry: (entry: Entry) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesQuery = !query || entry.content.toLowerCase().includes(query.toLowerCase());
      const matchesTag = !activeTagId || entry.tags?.some((tag) => tag.id === activeTagId);
      return matchesQuery && matchesTag;
    });
  }, [entries, query, activeTagId]);

  const groups = useMemo(() => groupEntries(filteredEntries), [filteredEntries]);

  return (
    <div className="flex h-full flex-col px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium tracking-[0.18em] text-trace-ghost">Reflect</p>
          <h1 className="mt-3 text-[38px] font-semibold tracking-[-0.04em] text-trace-text">回看</h1>
        </div>
        <label className="flex min-w-[240px] items-center gap-3 rounded-dock bg-black/[0.03] px-4 py-3 dark:bg-white/[0.05]">
          <Search className="h-4 w-4 text-trace-ghost" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="quiet-focus w-full bg-transparent text-sm text-trace-text placeholder:text-trace-ghost"
          />
        </label>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTagId(null)}
          className="rounded-dock px-3 py-1.5 text-xs text-trace-sub transition hover:text-trace-text"
        >
          全部
        </button>
        {tags.map((tag) => (
          <button key={tag.id} type="button" onClick={() => setActiveTagId(tag.id)}>
            <TagChip label={tag.name} active={activeTagId === tag.id} />
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-3">
        {!filteredEntries.length ? (
          <EmptyState title="还没有留下什么" body="先写一点，或者说一句。之后再回来翻开它。" />
        ) : (
          <div className="space-y-8">
            {groups.map(([date, dayEntries]) => (
              <section key={date}>
                <ReflectionDayLabel date={date} />
                <div className="space-y-2">
                  {dayEntries.map((entry) => (
                    <ReflectionEntry
                      key={entry.id}
                      entry={entry}
                      active={selectedEntryId === entry.id}
                      onSelect={() => onSelectEntry(entry)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

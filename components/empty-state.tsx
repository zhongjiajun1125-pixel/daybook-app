export function EmptyState({
  title,
  body
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-trace-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-7 text-trace-sub">{body}</p>
    </div>
  );
}

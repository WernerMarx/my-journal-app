import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton list matching the Browse entry card layout. */
export function EntryListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Single-line inline loading indicator. */
export function InlineLoading({ className }) {
  return <Skeleton className={`h-4 w-32 ${className ?? ""}`} />;
}

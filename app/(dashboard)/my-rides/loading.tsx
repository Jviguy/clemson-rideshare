import { Skeleton } from "@/components/ui/Skeleton";

export default function MyRidesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Tab bar placeholder */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <Skeleton variant="text" width="w-28" height="h-9" className="rounded-lg" />
        <Skeleton variant="text" width="w-28" height="h-9" className="rounded-lg" />
      </div>

      {/* Card list */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
            <Skeleton variant="card" height="h-36" className="rounded-none" />
            <div className="p-4 space-y-3">
              <Skeleton variant="text" width="w-3/4" />
              <Skeleton variant="text" width="w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton variant="text" width="w-24" />
                <Skeleton variant="text" width="w-16" height="h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

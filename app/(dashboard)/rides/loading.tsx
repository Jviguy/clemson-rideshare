import { Skeleton } from "@/components/ui/Skeleton";

export default function RidesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Filter bar placeholder */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton height="h-10" width="w-full sm:w-48" />
        <Skeleton height="h-10" width="w-full sm:w-48" />
        <Skeleton height="h-10" width="w-full sm:w-40" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
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

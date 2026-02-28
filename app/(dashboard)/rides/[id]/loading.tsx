import { Skeleton } from "@/components/ui/Skeleton";

export default function RideDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Map placeholder */}
      <Skeleton variant="card" height="h-72 sm:h-96" />

      {/* Route stats bar */}
      <Skeleton variant="text" height="h-10" width="w-64" className="rounded-xl" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info - left column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="w-32" height="h-6" />
              <Skeleton variant="text" width="w-16" height="h-5" />
            </div>
            <Skeleton variant="text" lines={3} />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton variant="text" height="h-12" />
              <Skeleton variant="text" height="h-12" />
              <Skeleton variant="text" height="h-12" />
            </div>
          </div>
        </div>

        {/* Sidebar - right column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 p-6 space-y-3">
            <Skeleton variant="text" width="w-20" height="h-5" />
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" />
              <div className="flex-1 space-y-1">
                <Skeleton variant="text" width="w-28" />
                <Skeleton variant="text" width="w-40" height="h-3" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-6 space-y-4">
            <Skeleton variant="text" width="w-20" height="h-6" className="mx-auto" />
            <Skeleton variant="text" height="h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export function PortalLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Skeleton className="size-12 rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

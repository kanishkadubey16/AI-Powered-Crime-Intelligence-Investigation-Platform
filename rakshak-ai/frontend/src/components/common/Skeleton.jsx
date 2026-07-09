import { cn } from "../../utils/cn";

const Skeleton = ({ className }) => (
  <div className={cn("skeleton", className)} />
);

export const CardSkeleton = () => (
  <div className="glass rounded-xl p-5 space-y-3">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-32" />
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="glass rounded-xl overflow-hidden">
    <div className="p-4 border-b border-slate-800">
      <Skeleton className="h-5 w-32" />
    </div>
    <div className="divide-y divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="glass rounded-xl p-5 space-y-4">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-48 w-full" />
  </div>
);

export default Skeleton;

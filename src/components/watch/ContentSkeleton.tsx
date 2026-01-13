import { Skeleton } from '@/components/ui/skeleton';

export const CastSkeleton = () => (
  <div className="flex gap-3 overflow-x-auto pb-2">
    {Array.from({ length: 6 }).map((_, idx) => (
      <div key={idx} className="flex-shrink-0">
        <Skeleton className="w-20 h-28 rounded-lg" />
        <Skeleton className="w-16 h-3 mt-2 mx-auto" />
      </div>
    ))}
  </div>
);

export const EpisodesSkeleton = () => (
  <div className="grid grid-cols-3 gap-2">
    {Array.from({ length: 6 }).map((_, idx) => (
      <Skeleton key={idx} className="aspect-video rounded-lg" />
    ))}
  </div>
);

interface RecommendedSkeletonProps {
  columns?: number;
}

export const RecommendedSkeleton = ({ columns = 4 }: RecommendedSkeletonProps) => (
  <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {Array.from({ length: columns * 2 }).map((_, idx) => (
      <Skeleton key={idx} className="aspect-[2/3] rounded-lg" />
    ))}
  </div>
);

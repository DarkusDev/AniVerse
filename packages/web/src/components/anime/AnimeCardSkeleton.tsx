export default function AnimeCardSkeleton(): React.JSX.Element {
  return (
    <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface-elevated border border-surface-border">
      <div
        className="h-full w-full"
        style={{
          background:
            'linear-gradient(90deg, #16162a 25%, #1e1e35 50%, #16162a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    </div>
  );
}

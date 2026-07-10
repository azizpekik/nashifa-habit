export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-full sm:max-w-2xl px-4 py-6">
      <div className="mb-6">
        <div className="h-4 w-32 bg-muted rounded animate-pulse mb-2" />
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
      </div>
      <div className="mb-6 flex items-center gap-4">
        <div className="h-20 w-20 bg-muted rounded-full animate-pulse shrink-0" />
        <div className="w-full">
          <div className="h-4 w-36 bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse mb-3" />
      ))}
    </div>
  )
}

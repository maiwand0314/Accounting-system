export default function InvoiceDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-lg bg-muted" />
          <div className="h-10 w-20 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 rounded-xl bg-muted" />
        <div className="h-48 rounded-xl bg-muted" />
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}

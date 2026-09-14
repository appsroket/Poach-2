export default function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-2xl font-bold">Job</h1>
      <p className="mt-3 text-sm text-muted">
        Job detail + tailored application generation for job{" "}
        <code className="text-ink">{params.id}</code>. Route placeholder.
      </p>
    </main>
  );
}

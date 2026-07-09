import ReportDetail from "@/components/ReportDetail";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return <div className="min-h-screen grid place-items-center text-sm text-neutral-500">잘못된 URL</div>;
  }
  return <ReportDetail id={numeric} />;
}

import { HostRoomScreen } from "@/components/cwogo/host-room-screen";

export default async function HostRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="page-shell min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <HostRoomScreen slug={slug} />
      </div>
    </main>
  );
}

import { PlayerRoomScreen } from "@/components/cwogo/player-room-screen";

export default async function PlayerRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="page-shell min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <PlayerRoomScreen slug={slug} />
    </main>
  );
}

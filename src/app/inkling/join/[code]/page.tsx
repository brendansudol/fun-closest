import { JoinRoomForm } from "@/components/game/join-room-form";

export default async function JoinCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="page-shell min-h-screen px-4 py-10 sm:px-6">
      <JoinRoomForm code={code.toUpperCase()} />
    </main>
  );
}

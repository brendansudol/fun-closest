import { CreateRoomForm } from "@/components/cwogo/create-room-form";

export default function CwogoLandingPage() {
  return (
    <main className="page-shell min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <CreateRoomForm />
      </div>
    </main>
  );
}

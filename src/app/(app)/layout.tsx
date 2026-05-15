import { requireSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={session.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={session.fullName} userRole={session.role} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}

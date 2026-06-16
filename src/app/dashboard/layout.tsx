import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
        <div className="bg-glow" />
        <div className="relative z-10 p-4 pb-24 md:p-6 lg:p-8 max-w-[1400px] mx-auto min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

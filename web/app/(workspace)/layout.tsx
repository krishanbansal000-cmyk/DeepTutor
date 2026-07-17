import WorkspaceSidebar from "@/components/sidebar/WorkspaceSidebar";
import StudentMobileNav from "@/components/navigation/StudentMobileNav";
import { Suspense } from "react";
import { CapabilityAccessProvider } from "@/components/access/CapabilityAccessContext";
import CapabilityGate from "@/components/access/CapabilityGate";
import { UnifiedChatProvider } from "@/context/UnifiedChatContext";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CapabilityAccessProvider>
      <UnifiedChatProvider>
        <div className="workspace-shell flex h-screen overflow-hidden">
          <WorkspaceSidebar />
          <main className="flex-1 overflow-hidden bg-[var(--background)]">
            <CapabilityGate>{children}</CapabilityGate>
          </main>
          <Suspense fallback={null}>
            <StudentMobileNav />
          </Suspense>
        </div>
      </UnifiedChatProvider>
    </CapabilityAccessProvider>
  );
}

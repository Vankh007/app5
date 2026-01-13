import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div 
        className="min-h-screen w-full bg-background"
        onContextMenu={(e) => {
          // Allow right-click on all inputs/textareas for copy/paste
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return; // Allow default context menu
          }
        }}
      >
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
          <AdminHeader />
        </div>
        
        <div className="flex w-full min-h-screen pt-16">
          <AdminSidebar />
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

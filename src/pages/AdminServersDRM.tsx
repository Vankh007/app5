import { AdminLayout } from "@/components/admin/AdminLayout";

export default function ServersDRM() {
  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Servers & DRM</h1>
        <p className="text-muted-foreground">Manage streaming servers and DRM settings.</p>
      </div>
    </AdminLayout>
  );
}

import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { isUserAdmin } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const hasAdminAccess = await isUserAdmin(user.id);

  if (!hasAdminAccess) {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

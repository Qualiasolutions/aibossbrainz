import { unstable_cache } from "next/cache";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { MobileSidebarProvider } from "@/components/mobile-sidebar-context";
import { NetworkStatusBanner } from "@/components/network-status-banner";
import {
  SubscriptionLayout,
  SubscriptionProvider,
} from "@/components/subscription";
import { TosPopup } from "@/components/tos-popup";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Cache isAdmin check for 5 minutes to reduce DB queries
const getIsAdmin = unstable_cache(
  async (userId: string): Promise<boolean> => {
    const serviceClient = createServiceClient();
    const { data: userData } = await serviceClient
      .from("User")
      .select("isAdmin")
      .eq("id", userId)
      .single();
    return userData?.isAdmin === true;
  },
  ["user-admin-status"],
  { revalidate: 300 }, // 5 minutes
);

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin (cached for 5 minutes)
  const isAdmin = user ? await getIsAdmin(user.id) : false;

  return (
    <>
      {/* Network status banner for offline detection */}
      <NetworkStatusBanner />
      {/* Pyodide removed from layout - load on-demand in code-editor when Python execution is needed */}
      <TosPopup />
      <SubscriptionProvider>
        <DataStreamProvider>
          <MobileSidebarProvider>
            <SidebarProvider defaultOpen={true}>
              <AppSidebar user={user || undefined} isAdmin={isAdmin} />
              <SidebarInset>
                <SubscriptionLayout>{children}</SubscriptionLayout>
              </SidebarInset>
            </SidebarProvider>
          </MobileSidebarProvider>
        </DataStreamProvider>
      </SubscriptionProvider>
    </>
  );
}

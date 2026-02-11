"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { EnhancedModelSelector } from "@/components/enhanced-model-selector";
import { MobileSidebarProvider } from "@/components/mobile-sidebar-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { ExecutiveType } from "@/lib/ai/executive-personalities";

export default function DemoPage() {
  const [selectedModel, _setSelectedModel] = useState("chat-model");
  const [selectedExecutive, setSelectedExecutive] =
    useState<ExecutiveType>("alexandria");

  // Mock session for demo
  const mockSession = {
    user: {
      id: "demo-user",
      email: "demo@example.com",
      type: "guest" as const,
      name: "Demo User",
    },
    expires: "2024-12-31T23:59:59.999Z",
  };

  return (
    <MobileSidebarProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar user={mockSession.user as any} />
        <SidebarInset>
          <div className="flex h-screen flex-col">
            {/* Header with model selector */}
            <header className="border-b bg-white/80 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h1 className="font-bold text-2xl text-gray-900">
                  Alecci Media - Demo
                </h1>
                <div className="flex items-center gap-4">
                  <EnhancedModelSelector
                    className="w-auto"
                    onExecutiveSelect={setSelectedExecutive}
                    selectedExecutive={selectedExecutive}
                    selectedModelId={selectedModel}
                    userType={mockSession.user.type}
                  />
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
              <div className="mx-auto max-w-4xl space-y-6">
                <div className="rounded-xl bg-white p-6 shadow-lg">
                  <h2 className="mb-4 font-semibold text-xl">
                    UI Features Test
                  </h2>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <h3 className="font-medium text-green-800">
                        ✅ Sidebar Status
                      </h3>
                      <p className="mt-1 text-green-600 text-sm">
                        The sidebar should be open by default on the left with
                        no white space.
                      </p>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h3 className="font-medium text-blue-800">
                        ✅ Model Selector
                      </h3>
                      <p className="mt-1 text-blue-600 text-sm">
                        The dropdown in the header should have increased height
                        and better padding.
                      </p>
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <h3 className="font-medium text-purple-800">
                        ✅ Executive Personalities
                      </h3>
                      <p className="mt-1 text-purple-600 text-sm">
                        Try switching between Alexandria, Kim, and Collaborative
                        executives.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-lg">
                  <h2 className="mb-4 font-semibold text-xl">
                    Demo Chat Interface
                  </h2>
                  <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-gray-50 p-4">
                    <p className="text-gray-500">
                      This is a demo page to test the UI features. The actual
                      chat functionality would appear here in the full
                      application.
                    </p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </MobileSidebarProvider>
  );
}

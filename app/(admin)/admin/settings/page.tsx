import { Database, Palette, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 mt-1">
          Manage platform configuration and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform Settings */}
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-50 p-2">
                <Settings className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <CardTitle className="text-neutral-900">
                  Platform Settings
                </CardTitle>
                <CardDescription className="text-neutral-500">
                  General platform configuration
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Maintenance Mode
                </p>
                <p className="text-xs text-neutral-500">
                  Temporarily disable access
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                Off
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Rate Limiting
                </p>
                <p className="text-xs text-neutral-500">
                  Message limits per user
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                Enabled
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  New Registrations
                </p>
                <p className="text-xs text-neutral-500">
                  Allow new user signups
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                Open
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-neutral-900">Security</CardTitle>
                <CardDescription className="text-neutral-500">
                  Access and authentication settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Two-Factor Auth
                </p>
                <p className="text-xs text-neutral-500">
                  Require 2FA for admins
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-500 text-xs font-medium">
                Optional
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Session Timeout
                </p>
                <p className="text-xs text-neutral-500">
                  Auto-logout after inactivity
                </p>
              </div>
              <span className="text-sm text-neutral-700">24 hours</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-neutral-700">API Keys</p>
                <p className="text-xs text-neutral-500">
                  Manage external integrations
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <Database className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-neutral-900">Database</CardTitle>
                <CardDescription className="text-neutral-500">
                  Supabase database information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <p className="text-sm font-medium text-neutral-700">Project</p>
                <p className="text-xs text-neutral-500">Supabase project ID</p>
              </div>
              <span className="text-sm text-neutral-500 font-mono">
                esymbjpzjjkffpfqukxw
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <p className="text-sm font-medium text-neutral-700">Region</p>
                <p className="text-xs text-neutral-500">Database location</p>
              </div>
              <span className="text-sm text-neutral-700">US East</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Dashboard
                </p>
                <p className="text-xs text-neutral-500">
                  Open Supabase dashboard
                </p>
              </div>
              <Link
                href="https://supabase.com/dashboard/project/esymbjpzjjkffpfqukxw"
                target="_blank"
              >
                <Button variant="outline" size="sm">
                  Open
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Palette className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-neutral-900">
                  Executive Personas
                </CardTitle>
                <CardDescription className="text-neutral-500">
                  AI executive configuration
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-600" />
                <p className="text-sm font-medium text-neutral-700">
                  Alexandria (CMO)
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                Active
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-600" />
                <p className="text-sm font-medium text-neutral-700">
                  Kim (CSO)
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                Active
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600" />
                <p className="text-sm font-medium text-neutral-700">
                  Collaborative
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                Active
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 p-6 rounded-xl border border-neutral-200 bg-white shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/users">
            <Button variant="outline">Manage Users</Button>
          </Link>
          <Link href="/admin/conversations">
            <Button variant="outline">View Conversations</Button>
          </Link>
          <Link href="/admin/analytics">
            <Button variant="outline">View Analytics</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Back to App</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

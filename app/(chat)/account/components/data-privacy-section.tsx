"use client";

import { Download, Loader2, Shield, Trash2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DataPrivacySection({
	exporting,
	deleting,
	deleteConfirmText,
	setDeleteConfirmText,
	handleExport,
	handleDeleteAccount,
}: {
	exporting: boolean;
	deleting: boolean;
	deleteConfirmText: string;
	setDeleteConfirmText: (v: string) => void;
	handleExport: () => void;
	handleDeleteAccount: () => void;
}) {
	return (
		<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
			<div className="mb-6 flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100">
					<Shield className="size-5 text-emerald-600" />
				</div>
				<div>
					<h2 className="text-lg font-semibold text-stone-900">
						Data & Privacy
					</h2>
					<p className="text-sm text-stone-500">Export or delete your data</p>
				</div>
			</div>

			<div className="space-y-4">
				{/* Export Data */}
				<div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 p-4">
					<div>
						<p className="font-medium text-stone-900">Export Your Data</p>
						<p className="text-sm text-stone-500">
							Download all your data as a JSON file
						</p>
					</div>
					<Button
						variant="outline"
						onClick={handleExport}
						disabled={exporting}
						className="gap-2"
					>
						{exporting ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Download className="size-4" />
						)}
						Export
					</Button>
				</div>

				{/* Delete Account */}
				<div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-4">
					<div>
						<p className="font-medium text-stone-900">Delete Your Account</p>
						<p className="text-sm text-stone-500">
							Permanently delete your account and all data
						</p>
					</div>
					<AlertDialog
						onOpenChange={(open) => {
							if (!open) setDeleteConfirmText("");
						}}
					>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" className="gap-2">
								<Trash2 className="size-4" />
								Delete
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. All your chats, documents, and
									account data will be permanently deleted.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<div className="py-2">
								<Label
									htmlFor="delete-confirm"
									className="text-sm text-stone-600"
								>
									Type <span className="font-bold">DELETE</span> to confirm
								</Label>
								<Input
									id="delete-confirm"
									value={deleteConfirmText}
									onChange={(e) => setDeleteConfirmText(e.target.value)}
									placeholder="DELETE"
									className="mt-1.5"
								/>
							</div>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleDeleteAccount}
									disabled={deleteConfirmText !== "DELETE" || deleting}
									className="bg-red-600 hover:bg-red-700"
								>
									{deleting ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									Delete Account
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}

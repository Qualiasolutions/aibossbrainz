import { revalidatePath } from "next/cache";
import { UsersTable } from "@/components/admin/users-table";
import {
  createUserByAdmin,
  deleteUserByAdmin,
  getAllUsers,
  updateUserByAdmin,
  updateUserSubscription,
} from "@/lib/admin/queries";
import type { SubscriptionType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

async function deleteUser(userId: string) {
  "use server";
  await deleteUserByAdmin(userId);
  revalidatePath("/admin/users");
}

async function toggleAdmin(userId: string, isAdmin: boolean) {
  "use server";
  await updateUserByAdmin(userId, { isAdmin });
  revalidatePath("/admin/users");
}

async function createUser(data: {
  email: string;
  displayName?: string;
  companyName?: string;
  subscriptionType?: SubscriptionType;
}): Promise<{ success: boolean; error?: string }> {
  "use server";
  try {
    await createUserByAdmin(data);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create user";

    // Handle specific Supabase Auth errors
    if (message.includes("rate limit") || message.includes("over_email_send")) {
      return {
        success: false,
        error:
          "Email rate limit exceeded. Please wait a few minutes before inviting this user again.",
      };
    }
    if (
      message.includes("invalid format") ||
      message.includes("validate email")
    ) {
      return {
        success: false,
        error:
          "Invalid email address format. Please check the email and try again.",
      };
    }
    if (message.includes("already") || message.includes("exists")) {
      return {
        success: false,
        error: "A user with this email already exists.",
      };
    }

    console.error("Create user error:", message);
    return { success: false, error: message };
  }
}

async function changeSubscription(
  userId: string,
  subscriptionType: SubscriptionType,
) {
  "use server";
  await updateUserSubscription(userId, subscriptionType);
  revalidatePath("/admin/users");
}

export default async function UsersPage() {
  const users = await getAllUsers();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">User Management</h1>
        <p className="text-neutral-500 mt-1">
          View and manage all users on the platform. {users.length} total users.
        </p>
      </div>

      <UsersTable
        users={users}
        onDeleteUser={deleteUser}
        onToggleAdmin={toggleAdmin}
        onCreateUser={createUser}
        onChangeSubscription={changeSubscription}
      />
    </div>
  );
}

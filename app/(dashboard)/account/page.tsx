import { redirect } from "next/navigation";
import { getAccountStatus } from "@/lib/actions/account";
import { AccountClient } from "@/components/account/AccountClient";

export default async function AccountPage() {
  const status = await getAccountStatus();

  if (!status.authenticated) {
    redirect("/login");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="mt-1 text-gray-500">
          Manage your profile and payout settings.
        </p>
      </div>

      <div className="max-w-2xl">
        <AccountClient
          connectStatus={status.connectStatus}
          connectError={status.connectError}
          name={status.name}
          email={status.email}
        />
      </div>
    </div>
  );
}

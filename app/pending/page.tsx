import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

export default async function PendingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status === "approved") redirect("/predict");

  return (
    <div className="card mx-auto max-w-lg text-center">
      <div className="text-4xl">⏳</div>
      <h1 className="mt-3 text-2xl font-bold">
        {profile.status === "rejected" ? "Account not approved" : "Awaiting approval"}
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        {profile.status === "rejected"
          ? "Your access request was declined. Contact the organizer if you think this is a mistake."
          : "Thanks for signing up! The organizer needs to approve your account before you can submit picks."}
      </p>
    </div>
  );
}

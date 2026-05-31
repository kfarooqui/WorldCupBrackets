"use client";

import { useTransition } from "react";
import { setUserStatus } from "@/app/actions/admin";

export default function UserStatusButtons({
  userId,
  status,
}: {
  userId: string;
  status: "pending" | "approved" | "rejected";
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2">
      {status !== "approved" && (
        <button
          disabled={pending}
          onClick={() => start(() => setUserStatus(userId, "approved"))}
          className="btn-primary px-3 py-1 text-xs"
        >
          Approve
        </button>
      )}
      {status !== "rejected" && (
        <button
          disabled={pending}
          onClick={() => start(() => setUserStatus(userId, "rejected"))}
          className="btn-ghost px-3 py-1 text-xs"
        >
          Reject
        </button>
      )}
      {status === "rejected" && (
        <button
          disabled={pending}
          onClick={() => start(() => setUserStatus(userId, "pending"))}
          className="btn-ghost px-3 py-1 text-xs"
        >
          Reset
        </button>
      )}
    </div>
  );
}

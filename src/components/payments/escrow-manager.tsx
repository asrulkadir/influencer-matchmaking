"use client";

import { useState } from "react";

interface EscrowPayment {
  id: string;
  creatorName: string;
  campaignTitle: string;
  amount: number;
  creatorPayout: number;
  platformFee: number;
  status: string;
  fundedAt: string | null;
  releasedAt: string | null;
}

interface EscrowManagerProps {
  escrows: EscrowPayment[];
}

export function EscrowManager({ escrows }: EscrowManagerProps) {
  const [payments, setPayments] = useState(escrows);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (
    campaignCreatorId: string,
    action: "release" | "refund" | "dispute"
  ) => {
    if (
      !confirm(
        `Are you sure you want to ${action} this escrow payment?`
      )
    )
      return;

    setProcessing(campaignCreatorId);
    try {
      const response = await fetch("/api/payments/escrow", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignCreatorId,
          action,
          reason:
            action === "refund"
              ? "Content did not meet requirements"
              : undefined,
        }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch {
      alert("Action failed");
    } finally {
      setProcessing(null);
    }
  };

  const totalEscrowed = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalReleased = payments
    .filter((p) => p.status === "RELEASED")
    .reduce((sum, p) => sum + p.creatorPayout, 0);
  const totalPending = payments
    .filter((p) => p.status === "FUNDED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-muted-foreground">Total Escrowed</p>
          <p className="mt-1 text-2xl font-bold">
            ${totalEscrowed.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-muted-foreground">Released to Creators</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            ${totalReleased.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-muted-foreground">Pending Release</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            ${totalPending.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Escrow Table */}
      <div className="rounded-xl border bg-white">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Escrow Payments</h2>
          <p className="text-sm text-muted-foreground">
            Manage milestone-based payments for your campaigns
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                <th className="px-6 py-3">Creator</th>
                <th className="px-6 py-3">Campaign</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Creator Payout</th>
                <th className="px-6 py-3">Platform Fee</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">
                    {payment.creatorName}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {payment.campaignTitle}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    ${payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    ${payment.creatorPayout.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    ${payment.platformFee.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <EscrowStatusBadge status={payment.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {payment.status === "FUNDED" && (
                        <>
                          <button
                            onClick={() =>
                              handleAction(payment.id, "release")
                            }
                            disabled={processing === payment.id}
                            className="rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                          >
                            Release
                          </button>
                          <button
                            onClick={() =>
                              handleAction(payment.id, "refund")
                            }
                            disabled={processing === payment.id}
                            className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            Refund
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EscrowStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    FUNDED: "bg-blue-100 text-blue-700",
    RELEASED: "bg-green-100 text-green-700",
    REFUNDED: "bg-red-100 text-red-700",
    DISPUTED: "bg-orange-100 text-orange-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${config[status] ?? "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}

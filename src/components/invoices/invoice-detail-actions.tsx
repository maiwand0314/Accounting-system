"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle, Download } from "lucide-react";
import {
  sendInvoiceAction,
  markInvoicePaidAction,
} from "@/server/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@prisma/client";

type PendingAction = "send" | "pay" | null;

export function InvoiceDetailActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [displayStatus, setDisplayStatus] = useState(status);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(
    action: PendingAction,
    optimisticStatus: InvoiceStatus,
    fn: () => Promise<{ success: boolean; error?: string }>,
  ) {
    setMessage(null);
    setError(null);
    setPendingAction(action);
    setDisplayStatus(optimisticStatus);
    startTransition(async () => {
      const result = await fn();
      setPendingAction(null);
      if (result.success) {
        setMessage("Fullført");
        router.refresh();
      } else {
        setDisplayStatus(status);
        setError(result.error ?? "Noe gikk galt");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {displayStatus === "DRAFT" && (
        <Button
          loading={pending && pendingAction === "send"}
          disabled={pending}
          onClick={() =>
            run("send", "SENT", () => sendInvoiceAction(invoiceId))
          }
        >
          {pending && pendingAction === "send" ? (
            "Sender…"
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send faktura
            </>
          )}
        </Button>
      )}
      {(displayStatus === "SENT" || displayStatus === "OVERDUE") && (
        <Button
          loading={pending && pendingAction === "pay"}
          disabled={pending}
          onClick={() =>
            run("pay", "PAID", () => markInvoicePaidAction(invoiceId))
          }
        >
          {pending && pendingAction === "pay" ? (
            "Registrerer…"
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Marker betalt
            </>
          )}
        </Button>
      )}
      {displayStatus !== "DRAFT" && (
        <Button variant="outline" asChild>
          <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noreferrer">
            <Download className="h-4 w-4" />
            PDF
          </a>
        </Button>
      )}
      {message && <span className="text-sm text-emerald-600">{message}</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

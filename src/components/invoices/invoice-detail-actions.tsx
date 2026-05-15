"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle, Download } from "lucide-react";
import {
  sendInvoiceAction,
  markInvoicePaidAction,
  // emailInvoiceAction — aktiveres når Resend er deployet til Vercel (ikke pushet ennå)
} from "@/server/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@prisma/client";

export function InvoiceDetailActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setMessage("Fullført");
        router.refresh();
      } else {
        setError(result.error ?? "Noe gikk galt");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button disabled={pending} onClick={() => run(() => sendInvoiceAction(invoiceId))}>
          <Send className="h-4 w-4" />
          Send faktura
        </Button>
      )}
      {(status === "SENT" || status === "OVERDUE") && (
        <Button disabled={pending} onClick={() => run(() => markInvoicePaidAction(invoiceId))}>
          <CheckCircle className="h-4 w-4" />
          Marker betalt
        </Button>
      )}
      {status !== "DRAFT" && (
        <>
          <Button variant="outline" asChild>
            <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              PDF
            </a>
          </Button>
          {/*
            Send e-post — AV for produksjon til Resend er deployet på Vercel.
            Krever: RESEND_API_KEY + RESEND_FROM_EMAIL i Vercel env.
            Fjern kommentar og importer emailInvoiceAction når klar.
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => emailInvoiceAction(invoiceId))}
          >
            <Mail className="h-4 w-4" />
            Send e-post
          </Button>
          */}
        </>
      )}
      {message && <span className="text-sm text-emerald-600">{message}</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

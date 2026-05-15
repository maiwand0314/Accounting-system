import { createClient } from "@supabase/supabase-js";

const BUCKET = "receipts";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase Storage er ikke konfigurert (mangler service role key)");
  }
  return createClient(url, key);
}

/** Laster opp kvittering til Supabase Storage (OCR-klar metadata i DB) */
export async function uploadReceipt(params: {
  companyId: string;
  expenseId: string;
  file: Buffer;
  fileName: string;
  mimeType: string;
}) {
  const supabase = getAdminClient();
  const path = `${params.companyId}/${params.expenseId}/${params.fileName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, params.file, {
    contentType: params.mimeType,
    upsert: true,
  });

  if (error) throw new Error(error.message);
  return path;
}

export function getReceiptPublicUrl(path: string) {
  const supabase = getAdminClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

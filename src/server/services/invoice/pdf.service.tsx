import { renderToBuffer } from "@react-pdf/renderer";
import {
  InvoicePdfDocument,
  type InvoicePdfData,
} from "./pdf-document";

export type { InvoicePdfData };

export class PdfService {
  static async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    const buffer = await renderToBuffer(
      <InvoicePdfDocument data={data} />,
    );
    return Buffer.from(buffer);
  }
}

import { Resend } from "resend";

export class EmailService {
  static async sendInvoiceEmail(params: {
    to: string;
    customerName: string;
    invoiceNumber: string;
    total: string;
    pdfBuffer: Buffer;
  }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) {
      throw new Error(
        "E-post er ikke konfigurert. Legg til RESEND_API_KEY og RESEND_FROM_EMAIL i .env.local",
      );
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `Faktura ${params.invoiceNumber} fra Regnskap`,
      html: `
        <p>Hei ${params.customerName},</p>
        <p>Vedlagt finner du faktura <strong>${params.invoiceNumber}</strong> på ${params.total}.</p>
        <p>Med vennlig hilsen</p>
      `,
      attachments: [
        {
          filename: `${params.invoiceNumber}.pdf`,
          content: params.pdfBuffer,
        },
      ],
    });

    if (error) throw new Error(error.message);
  }
}

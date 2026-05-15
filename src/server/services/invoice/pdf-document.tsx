import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatNOK } from "@/lib/utils";
import { VAT_RATES } from "@/lib/constants/vat";
import type { VatRate } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingBottom: 6,
    marginTop: 16,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },
  colDesc: { width: "40%" },
  colQty: { width: "12%", textAlign: "right" },
  colPrice: { width: "16%", textAlign: "right" },
  colVat: { width: "12%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    marginTop: 4,
  },
  bold: { fontWeight: "bold" },
});

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  company: {
    name: string;
    orgNumber: string;
    vatNumber?: string | null;
  };
  customer: {
    name: string;
    orgNumber?: string | null;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: VatRate;
    lineTotal: number;
  }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  notes?: string | null;
};

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>FAKTURA</Text>
        <Text>{data.invoiceNumber}</Text>
        <View style={{ marginTop: 12 }}>
          <Text style={styles.bold}>{data.company.name}</Text>
          <Text>Org.nr: {data.company.orgNumber}</Text>
          {data.company.vatNumber && <Text>MVA: {data.company.vatNumber}</Text>}
        </View>
        <View style={{ marginTop: 16 }}>
          <Text style={styles.bold}>Fakturamottaker</Text>
          <Text>{data.customer.name}</Text>
          {data.customer.orgNumber && (
            <Text>Org.nr: {data.customer.orgNumber}</Text>
          )}
          <Text>Fakturadato: {data.issueDate}</Text>
          <Text>Forfallsdato: {data.dueDate}</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Beskrivelse</Text>
          <Text style={styles.colQty}>Ant.</Text>
          <Text style={styles.colPrice}>Pris</Text>
          <Text style={styles.colVat}>MVA</Text>
          <Text style={styles.colTotal}>Beløp</Text>
        </View>
        {data.lines.map((line, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDesc}>{line.description}</Text>
            <Text style={styles.colQty}>{String(line.quantity)}</Text>
            <Text style={styles.colPrice}>{formatNOK(line.unitPrice)}</Text>
            <Text style={styles.colVat}>{VAT_RATES[line.vatRate].label}</Text>
            <Text style={styles.colTotal}>{formatNOK(line.lineTotal)}</Text>
          </View>
        ))}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Sum eks. MVA</Text>
            <Text>{formatNOK(data.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>MVA</Text>
            <Text>{formatNOK(data.vatAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.bold]}>
            <Text>Å betale</Text>
            <Text>{formatNOK(data.total)}</Text>
          </View>
        </View>
        {data.notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.bold}>Notat</Text>
            <Text>{data.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

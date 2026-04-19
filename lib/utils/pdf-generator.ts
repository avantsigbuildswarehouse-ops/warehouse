import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type IssueItem = {
  model_code: string;
  name: string;
  identifier: string; // Engine/Chassis or Serial No
  price: number | string | null | undefined;
};

export type IssueDocData = {
  type: "Quotation" | "Invoice" | "Receipt" | "Delivery Note";
  referenceNo: string;
  date: string;
  targetName: string;
  targetAddress: string;
  items: IssueItem[];
};

export function generateIssueDocument(data: IssueDocData) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Avant Signature Builds", 14, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "613, Bangalawa Junction, Ethul Kotte, Kotte, Sri Lanka",
    14,
    30
  );
  doc.text(
    "Email: avantsigbuilds@gmail.com| Tel: +94 77 741 1011",
    14,
    35
  );

  // Document Type Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.type.toUpperCase(), 150, 22, { align: "left" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref No: ${data.referenceNo}`, 150, 30);
  doc.text(
    `Date: ${new Date(data.date).toLocaleDateString()}`,
    150,
    35
  );

  doc.line(14, 40, 196, 40);

  // Issued To
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Issued To :`, 14, 50);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.targetName, 14, 56);
  doc.text(data.targetAddress || "-", 14, 62);

  // FIX: normalize price safely
  const tableData = data.items.map((item, index) => {
    const price = Number(item.price ?? 0);

    return [
      index + 1,
      item.model_code,
      item.name,
      item.identifier,
      "1",
      price.toFixed(2),
    ];
  });

  // FIX: safe total
  const total = data.items.reduce(
    (sum, item) => sum + Number(item.price ?? 0),
    0
  );

  autoTable(doc, {
    startY: 75,
    head: [
      [
        "#",
        "Code/UMC",
        "Description",
        "Engine/Serial",
        "Qty",
        "Price",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [8, 11, 20] },
    styles: { font: "helvetica", fontSize: 9 },
  });

  const finalY =
    (doc as any).lastAutoTable?.finalY || 100;

  // Total
  if (data.type !== "Delivery Note") {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(
      "Total Value : LKR. " + total.toFixed(2),
      140,
      finalY + 10
    );
  }

  // Signatures
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.text("-------------------------", 20, finalY + 40);
  doc.text("Authorized Signature", 20, finalY + 45);

  doc.text("-------------------------", 140, finalY + 40);
  doc.text("Recipient Signature", 140, finalY + 45);

  return doc;
}

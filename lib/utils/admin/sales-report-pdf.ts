import jsPDF from "jspdf";

export type SalesReportPdfData = {
  generatedAt: string;
  filters: {
    startDate?: string;
    endDate?: string;
    category?: string;
    type?: string;
    partnerQuery?: string;
  };
  summary: {
    totalVehiclesSold: number;
    totalSparesSold: number;
    totalValue: number;
    showroomValue: number;
    dealerValue: number;
  };
  monthlyBreakdown: Array<{ month: string; vehicles: number; spares: number; total: number }>;
  topPartners: Array<{
    partnerId: string;
    partnerType: string;
    partnerName?: string;
    vehicleCount: number;
    spareCount: number;
    totalValue: number;
  }>;
  recentSales: Array<{
    type: string;
    model_code: string;
    price: number;
    issued_at: string;
    issued_to: string;
    engine_number?: string;
    chassis_number?: string;
    spare_code?: string;
  }>;
  partnerDetail?: {
    code: string;
    name: string;
    type: "dealer" | "showroom";
    inventory: {
      bikeUnits: number;
      spareUnits: number;
      bikeValue: number;
      spareValue: number;
    };
    retailSales: {
      bikesSold: number;
      sparesSold: number;
      bikeSalesValue: number;
      spareSalesValue: number;
    };
    warehouseIssuance: {
      vehicles: number;
      spares: number;
      totalValue: number;
    };
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadLogo(doc: jsPDF) {
  const logo = new Image();
  logo.src = "/formlogo.png";
  await new Promise((resolve) => {
    logo.onload = resolve;
    logo.onerror = () => resolve(null);
  });
  if (logo.complete && logo.naturalWidth > 0) {
    doc.addImage(logo, "PNG", 15, 12, 38, 22);
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("AVANT", 15, 22);
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

export async function generateSalesReportPdf(data: SalesReportPdfData) {
  const doc = new jsPDF("p", "mm", "a4");
  await loadLogo(doc);

  let y = 40;
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("SALES PERFORMANCE REPORT", 105, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${formatDate(data.generatedAt)} ${new Date(data.generatedAt).toLocaleTimeString()}`, 105, y, {
    align: "center",
  });
  y += 10;

  const filterParts = [
    data.filters.startDate ? `From ${data.filters.startDate}` : null,
    data.filters.endDate ? `To ${data.filters.endDate}` : null,
    data.filters.category && data.filters.category !== "all" ? `Category: ${data.filters.category}` : null,
    data.filters.type && data.filters.type !== "all" ? `Type: ${data.filters.type}` : null,
    data.filters.partnerQuery ? `Partner: ${data.filters.partnerQuery}` : null,
  ].filter(Boolean);
  if (filterParts.length) {
    doc.setFontSize(8);
    doc.text(filterParts.join(" | "), 15, y);
    y += 8;
  }

  doc.line(15, y, 195, y);
  y += 8;

  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SUMMARY", 18, y + 5.5);
  y += 12;

  const summaryRows = [
    ["Total Vehicles Sold", String(data.summary.totalVehiclesSold)],
    ["Total Spares Sold", String(data.summary.totalSparesSold)],
    ["Total Sales Value", formatCurrency(data.summary.totalValue)],
    ["Showroom Issuance Value", formatCurrency(data.summary.showroomValue)],
    ["Dealer Issuance Value", formatCurrency(data.summary.dealerValue)],
  ];

  doc.setFontSize(9);
  for (const [label, value] of summaryRows) {
    y = ensureSpace(doc, y, 8);
    doc.setFont("helvetica", "bold");
    doc.text(label, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 120, y);
    y += 7;
  }

  if (data.partnerDetail) {
    y += 4;
    y = ensureSpace(doc, y, 40);
    doc.setFillColor(230, 230, 230);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text(`PARTNER: ${data.partnerDetail.name} (${data.partnerDetail.code})`, 18, y + 5.5);
    y += 12;

    const partnerRows = [
      ["On-hand bikes", String(data.partnerDetail.inventory.bikeUnits)],
      ["On-hand spares", String(data.partnerDetail.inventory.spareUnits)],
      ["Inventory bike value", formatCurrency(data.partnerDetail.inventory.bikeValue)],
      ["Inventory spare value", formatCurrency(data.partnerDetail.inventory.spareValue)],
      ["Retail bikes sold", String(data.partnerDetail.retailSales.bikesSold)],
      ["Retail spares sold", String(data.partnerDetail.retailSales.sparesSold)],
      ["Retail bike revenue", formatCurrency(data.partnerDetail.retailSales.bikeSalesValue)],
      ["Warehouse vehicles issued", String(data.partnerDetail.warehouseIssuance.vehicles)],
      ["Warehouse spares issued", String(data.partnerDetail.warehouseIssuance.spares)],
      ["Warehouse issuance value", formatCurrency(data.partnerDetail.warehouseIssuance.totalValue)],
    ];

    for (const [label, value] of partnerRows) {
      y = ensureSpace(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.text(label, 18, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 120, y);
      y += 7;
    }
  }

  y += 4;
  y = ensureSpace(doc, y, 20);
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("MONTHLY BREAKDOWN", 18, y + 5.5);
  y += 12;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Month", 18, y);
  doc.text("Vehicles", 90, y, { align: "right" });
  doc.text("Spares", 130, y, { align: "right" });
  doc.text("Total", 175, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");

  for (const month of data.monthlyBreakdown) {
    y = ensureSpace(doc, y, 7);
    doc.text(month.month.slice(0, 28), 18, y);
    doc.text(formatCurrency(month.vehicles), 90, y, { align: "right" });
    doc.text(formatCurrency(month.spares), 130, y, { align: "right" });
    doc.text(formatCurrency(month.total), 175, y, { align: "right" });
    y += 6;
  }

  y += 4;
  y = ensureSpace(doc, y, 20);
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("TOP PARTNERS", 18, y + 5.5);
  y += 12;

  for (const partner of data.topPartners.slice(0, 10)) {
    y = ensureSpace(doc, y, 8);
    const label = partner.partnerName
      ? `${partner.partnerName} (${partner.partnerId})`
      : partner.partnerId;
    doc.setFontSize(8);
    doc.text(label.slice(0, 55), 18, y);
    doc.text(
      `${partner.partnerType} • ${partner.vehicleCount}v / ${partner.spareCount}s`,
      18,
      y + 4
    );
    doc.text(formatCurrency(partner.totalValue), 175, y + 2, { align: "right" });
    y += 10;
  }

  if (data.recentSales.length > 0) {
    y += 2;
    y = ensureSpace(doc, y, 20);
    doc.setFillColor(230, 230, 230);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("RECENT TRANSACTIONS", 18, y + 5.5);
    y += 12;

    for (const sale of data.recentSales.slice(0, 40)) {
      y = ensureSpace(doc, y, 10);
      const itemLabel =
        sale.type === "vehicle"
          ? sale.engine_number || sale.model_code
          : sale.spare_code || sale.model_code;
      doc.setFontSize(8);
      doc.text(`${sale.type} • ${itemLabel}`.slice(0, 50), 18, y);
      doc.text(formatCurrency(sale.price), 120, y);
      doc.text(sale.issued_to.slice(0, 20), 18, y + 4);
      doc.text(formatDate(sale.issued_at), 120, y + 4);
      y += 10;
    }
  }

  doc.line(15, 280, 195, 280);
  doc.setFontSize(7);
  doc.text("AVANT signature builds — Confidential", 105, 285, { align: "center" });

  const partnerSlug = data.partnerDetail
    ? `${data.partnerDetail.type}-${data.partnerDetail.code}`.replace(/[^a-zA-Z0-9-_]/g, "_")
    : null;
  const fileName = partnerSlug
    ? `partner-report-${partnerSlug}-${new Date().toISOString().split("T")[0]}.pdf`
    : `sales-report-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}

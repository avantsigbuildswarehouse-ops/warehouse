"use client";

import { useState } from "react";
import {
  Bike,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileCheck,
  FileText,
  Loader2,
  Receipt,
  Truck,
  Wrench,
} from "lucide-react";
import JSZip from "jszip";

import type { SaleHistoryGroup, SalesHistoryData } from "@/lib/sales/history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DocumentInfo = {
  id: string;
  document_type: string;
  document_number: string;
  generated_at: string;
  document_data: Record<string, unknown>;
};

type DocType = "Quotation" | "Invoice" | "Receipt" | "Delivery Note";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function getBuyerName(group: SaleHistoryGroup) {
  if (group.buyerType === "customer") {
    return `${group.customer?.firstName || ""} ${group.customer?.lastName || ""}`.trim() || "Customer";
  }

  return group.company?.companyName || "Company";
}

function getBuyerMeta(group: SaleHistoryGroup) {
  if (group.buyerType === "customer") {
    return [group.customer?.phoneNumber, group.customer?.nic].filter(Boolean).join(" • ");
  }

  return [group.company?.companyEmail, group.company?.companyContact].filter(Boolean).join(" • ");
}

function getBuyerId(group: SaleHistoryGroup) {
  return group.buyerType === "customer" ? group.customer?.id : group.company?.id;
}

function getItemDetails(groupItem: SaleHistoryGroup["items"][number]) {
  if (groupItem.type === "Bike") {
    return [
      groupItem.engineNumber ? `ENG: ${groupItem.engineNumber}` : null,
      groupItem.chassisNumber ? `CHS: ${groupItem.chassisNumber}` : null,
      groupItem.color ? `CLR: ${groupItem.color}` : null,
      groupItem.yom ? `YOM: ${groupItem.yom}` : null,
      groupItem.version ? `VER: ${groupItem.version}` : null,
    ]
      .filter(Boolean)
      .join(" • ");
  }

  return [groupItem.spareCode ? `CODE: ${groupItem.spareCode}` : null, groupItem.serialNumber ? `SER: ${groupItem.serialNumber}` : null]
    .filter(Boolean)
    .join(" • ");
}

async function importGenerator(buyerType: "customer" | "company", docType: string) {
  if (buyerType === "customer") {
    switch (docType) {
      case "quotation":
      case "Quotation":
        return (await import("@/lib/utils/customer/customerQuotation")).default;
      case "invoice":
      case "Invoice":
        return (await import("@/lib/utils/customer/customerInvoice")).default;
      case "receipt":
      case "Receipt":
        return (await import("@/lib/utils/customer/customerReceipt")).default;
      case "delivery_note":
      case "Delivery Note":
        return (await import("@/lib/utils/customer/customerDeliveryNote")).default;
      default:
        return null;
    }
  }

  switch (docType) {
    case "quotation":
    case "Quotation":
      return (await import("@/lib/utils/company/companyQuotation")).default;
    case "invoice":
    case "Invoice":
      return (await import("@/lib/utils/company/companyInvoice")).default;
    case "receipt":
    case "Receipt":
      return (await import("@/lib/utils/company/companyReceipt")).default;
    case "delivery_note":
    case "Delivery Note":
      return (await import("@/lib/utils/company/companyDeliveryNote")).default;
    default:
      return null;
  }
}

function buildDocumentPayload(group: SaleHistoryGroup) {
  return {
    id: group.id,
    created_at: group.createdAt || new Date().toISOString(),
    target_type: group.targetType,
    target_code: group.targetCode,
    customer_id: group.customer?.id,
    company_id: group.company?.id,
    customer: group.customer
      ? {
          id: group.customer.id,
          first_name: group.customer.firstName,
          last_name: group.customer.lastName,
          phone_number: group.customer.phoneNumber,
          address: group.customer.address,
          nic: group.customer.nic,
        }
      : undefined,
    company: group.company
      ? {
          id: group.company.id,
          company_name: group.company.companyName,
          company_email: group.company.companyEmail,
          company_contact: group.company.companyContact,
          address: group.company.address,
          br_no: group.company.brNo,
          vat_no: group.company.vatNo,
        }
      : undefined,
    items: group.items.map((item) => ({
      type: item.type,
      model_code: item.modelCode,
      identifier: item.identifier,
      price: item.price,
      engine_number: item.engineNumber,
      chassis_number: item.chassisNumber,
      color: item.color,
      yom: item.yom,
      version: item.version,
      spare_code: item.spareCode,
      serial_number: item.serialNumber,
    })),
    base_price: group.basePrice,
    registration_fee: group.registrationFee,
    discount: group.discount,
    advance_payment: group.advancePayment,
    balance_due: group.balanceDue,
    payment_method: group.paymentMethod,
    total: group.total,
    amount_paid: group.total - group.balanceDue,
    quotation_no: `${group.buyerType.toUpperCase()}-QUOT-${group.targetCode}-${group.id}`,
    invoice_no: `${group.buyerType.toUpperCase()}-INV-${group.targetCode}-${group.id}`,
    reference_no: `REF-${group.targetCode}-${group.id}`,
  };
}

export default function SalesDocumentsHistory({
  data,
  title,
  description,
  buyerLabel,
}: {
  data: SalesHistoryData;
  title: string;
  description: string;
  buyerLabel: string;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [documentsList, setDocumentsList] = useState<Map<string, DocumentInfo[]>>(new Map());
  const [showDocsPopup, setShowDocsPopup] = useState<string | null>(null);
  const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(new Set());
  const [generatingSingle, setGeneratingSingle] = useState<Set<string>>(new Set());

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function generateGroupDoc(group: SaleHistoryGroup, type: DocType) {
    try {
      const generator = await importGenerator(group.buyerType, type);
      if (!generator) return;
      await generator(buildDocumentPayload(group));
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Failed to generate document. Please try again.");
    }
  }

  async function getExistingDocuments(group: SaleHistoryGroup) {
    const buyerId = getBuyerId(group);
    if (!buyerId) {
      alert(`Missing ${group.buyerType} information for this sale.`);
      return;
    }

    try {
      const response = await fetch(
        `/api/sales/group-documents?sale_id=${group.id}&buyer_type=${group.buyerType}&buyer_id=${buyerId}`
      );
      const result = await response.json();

      if (response.ok && result.documents?.length) {
        setDocumentsList((prev) => new Map(prev).set(group.id, result.documents));
        setShowDocsPopup(group.id);
        return;
      }

      alert("No documents found for this sale. Generate them first.");
    } catch (error) {
      console.error("Error fetching documents:", error);
      alert("Failed to fetch documents. Please try again.");
    }
  }

  async function regenerateSingleDocument(doc: DocumentInfo, group: SaleHistoryGroup) {
    const docId = `${doc.id}-${doc.document_type}`;
    setGeneratingSingle((prev) => new Set(prev).add(docId));

    try {
      const generator = await importGenerator(group.buyerType, doc.document_type);
      const pdfBuffer = generator ? await generator(doc.document_data as never, true) : null;

      if (pdfBuffer) {
        const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `${group.buyerType}_${doc.document_type}_${group.id}_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pdfUrl);
      }
    } catch (error) {
      console.error("Error regenerating document:", error);
      alert(`Failed to regenerate ${doc.document_type}`);
    } finally {
      setGeneratingSingle((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  }

  async function downloadAllDocuments(group: SaleHistoryGroup) {
    setDownloadingDocs((prev) => new Set(prev).add(group.id));

    try {
      const documents = documentsList.get(group.id) || [];
      const zip = new JSZip();

      for (const doc of documents) {
        const generator = await importGenerator(group.buyerType, doc.document_type);
        const pdfBuffer = generator ? await generator(doc.document_data as never, true) : null;
        if (pdfBuffer) {
          zip.file(`${doc.document_type}_${group.id}.pdf`, pdfBuffer);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `${group.buyerType}_${group.id}_documents.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error("Error downloading documents:", error);
      alert("Failed to download documents.");
    } finally {
      setDownloadingDocs((prev) => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white/80 dark:bg-slate-900/40">
          <CardHeader>
            <CardDescription>{buyerLabel} sales</CardDescription>
            <CardTitle>{data.groups.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white/80 dark:bg-slate-900/40">
          <CardHeader>
            <CardDescription>Vehicles sold</CardDescription>
            <CardTitle>{data.stats.soldVehicles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white/80 dark:bg-slate-900/40">
          <CardHeader>
            <CardDescription>Spares sold</CardDescription>
            <CardTitle>{data.stats.soldSpares}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white/80 dark:bg-slate-900/40">
          <CardHeader>
            <CardDescription>Total revenue</CardDescription>
            <CardTitle>LKR {formatNumber(data.stats.totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-white/80 dark:bg-slate-900/40">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              No completed sales found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.groups.map((group) => {
                const isExpanded = expandedKeys.has(group.id);
                const bikeCount = group.items.filter((item) => item.type === "Bike").length;
                const spareCount = group.items.filter((item) => item.type === "Spare").length;

                return (
                  <div
                    key={group.id}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10"
                  >
                    <div
                      className="flex cursor-pointer items-center justify-between bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/60"
                      onClick={() => toggleExpand(group.id)}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {group.buyerType}
                        </Badge>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {getBuyerName(group)}
                        </span>
                        {getBuyerMeta(group) ? (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {getBuyerMeta(group)}
                          </span>
                        ) : null}
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {group.createdAt
                            ? new Date(group.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "-"}
                        </span>
                        {bikeCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                            <Bike className="h-3 w-3" />
                            {bikeCount}
                          </span>
                        ) : null}
                        {spareCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            <Wrench className="h-3 w-3" />
                            {spareCount}
                          </span>
                        ) : null}
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          LKR {formatNumber(group.total)}
                        </span>
                      </div>

                      <div className="ml-4 flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button size="sm" variant="secondary" onClick={() => getExistingDocuments(group)}>
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Get Copies
                        </Button>
                        <div className="hidden gap-2 md:flex">
                          <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Quotation")}>
                            <FileText className="mr-1 h-3.5 w-3.5" />
                            Quotation
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Invoice")}>
                            <FileCheck className="mr-1 h-3.5 w-3.5" />
                            Invoice
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Receipt")}>
                            <Receipt className="mr-1 h-3.5 w-3.5" />
                            Receipt
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Delivery Note")}>
                            <Truck className="mr-1 h-3.5 w-3.5" />
                            Delivery
                          </Button>
                        </div>
                        <div className="text-slate-400 dark:text-slate-500">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-slate-200 dark:border-white/10">
                        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4 md:hidden dark:border-white/5">
                          <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Quotation")}>
                            <FileText className="mr-1 h-3.5 w-3.5" />
                            Quotation
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Invoice")}>
                            <FileCheck className="mr-1 h-3.5 w-3.5" />
                            Invoice
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Receipt")}>
                            <Receipt className="mr-1 h-3.5 w-3.5" />
                            Receipt
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Delivery Note")}>
                            <Truck className="mr-1 h-3.5 w-3.5" />
                            Delivery
                          </Button>
                        </div>

                        <div className="grid gap-4 border-b border-slate-100 p-4 md:grid-cols-3 dark:border-white/5">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Buyer
                            </p>
                            <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{getBuyerName(group)}</p>
                            {group.buyerType === "customer" ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {group.customer?.address || "No address provided"}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {group.company?.address || "No address provided"}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Payment
                            </p>
                            <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{group.paymentMethod}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Paid: LKR {formatNumber(group.total - group.balanceDue)} • Balance: LKR {formatNumber(group.balanceDue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Pricing
                            </p>
                            <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                              Base LKR {formatNumber(group.basePrice)}
                              {group.registrationFee ? ` • Reg LKR ${formatNumber(group.registrationFee)}` : ""}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Discount: LKR {formatNumber(group.discount)}
                            </p>
                          </div>
                        </div>

                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/20">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Type
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Model
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Details
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Price
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => (
                              <tr
                                key={`${group.id}-${item.inventoryId}`}
                                className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-slate-800/20"
                              >
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.type === "Bike"
                                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                    }`}
                                  >
                                    {item.type === "Bike" ? <Bike className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                                    {item.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                                  {item.modelCode}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                  {getItemDetails(item)}
                                </td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                  LKR {formatNumber(item.price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showDocsPopup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDocsPopup(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Generated Documents</h3>
              <button
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
                onClick={() => setShowDocsPopup(null)}
              >
                x
              </button>
            </div>
            <div className="space-y-2">
              {documentsList.get(showDocsPopup)?.map((doc) => {
                const group = data.groups.find((entry) => entry.id === showDocsPopup);
                const docId = `${doc.id}-${doc.document_type}`;

                return group ? (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-3 dark:border-white/10"
                  >
                    <div>
                      <p className="font-medium capitalize dark:text-white">{doc.document_type}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{doc.document_number}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(doc.generated_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regenerateSingleDocument(doc, group)}
                      disabled={generatingSingle.has(docId)}
                    >
                      {generatingSingle.has(docId) ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View/Download
                        </>
                      )}
                    </Button>
                  </div>
                ) : null;
              })}
              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    const group = data.groups.find((entry) => entry.id === showDocsPopup);
                    if (group) {
                      void downloadAllDocuments(group);
                    }
                    setShowDocsPopup(null);
                  }}
                  disabled={downloadingDocs.has(showDocsPopup)}
                >
                  {downloadingDocs.has(showDocsPopup) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download All as ZIP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Receipt,
  Truck,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Bike,
  Wrench,
  Download,
  Loader2,
  Eye,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PaginationControls from "@/components/ui/pagination-controls";
import JSZip from "jszip";

type Item = {
  type: "Bike" | "Spare";
  target: "Showroom" | "Dealer";
  target_code: string;
  model_code: string;
  identifier: string;
  price: number;
  issued_at: string;
};

type Group = {
  key: string;
  target: "Showroom" | "Dealer";
  target_code: string;
  date: string;
  items: Item[];
  totalValue: number;
  bikeCount: number;
  spareCount: number;
  latestIssuedAt: string;
};

type DocumentInfo = {
  id: string;
  document_type: string;
  document_number: string;
  generated_at: string;
  document_data: any;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function IssuedHistoryPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetFilter, setTargetFilter] = useState<"all" | "showroom" | "dealer">("all");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(new Set());
  const [generatingSingle, setGeneratingSingle] = useState<Set<string>>(new Set());
  const [documentsList, setDocumentsList] = useState<Map<string, DocumentInfo[]>>(new Map());
  const [showDocsPopup, setShowDocsPopup] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    fetch(`/api/warehouse/issued-history?type=${targetFilter}&page=${currentPage}&limit=${pageSize}`)
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.groups || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalGroups(data.pagination.total);
        }
        setLoading(false);
      });
  }, [targetFilter, currentPage]);

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      setLoading(true);
      setCurrentPage(page);
    }
  }

  function changeFilter(filter: "all" | "showroom" | "dealer") {
    setLoading(true);
    setTargetFilter(filter);
    setCurrentPage(1);
  }

  const summary = useMemo(() => {
    const allItems = groups.flatMap((g) => g.items);
    return {
      totalGroups: groups.length,
      bikes: allItems.filter((i) => i.type === "Bike").length,
      spares: allItems.filter((i) => i.type === "Spare").length,
      totalValue: allItems.reduce((a, b) => a + Number(b.price || 0), 0),
    };
  }, [groups]);

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function generateGroupDoc(group: Group, type: "Quotation" | "Invoice" | "Receipt" | "Delivery Note") {
    try {
      if (group.target === "Showroom") {
        switch (type) {
          case "Quotation":
            const generateShowroomQuotation = (await import("../../lib/utils/showroom/showroomQuotation")).default;
            await generateShowroomQuotation({
              id: group.key,
              created_at: group.latestIssuedAt,
              showroom_code: group.target_code,
              items: group.items.map(item => ({
                type: item.type,
                model_code: item.model_code,
                identifier: item.identifier,
                price: item.price,
              })),
              total_value: group.totalValue,
              base_price: group.totalValue,
              discount: 0,
            });
            break;
          case "Invoice":
            const generateShowroomInvoice = (await import("../../lib/utils/showroom/showroomInvoice")).default;
            await generateShowroomInvoice({
              id: group.key,
              created_at: group.latestIssuedAt,
              showroom_code: group.target_code,
              items: group.items.map(item => ({
                type: item.type,
                model_code: item.model_code,
                identifier: item.identifier,
                price: item.price,
              })),
              total_value: group.totalValue,
              base_price: group.totalValue,
              discount: 0,
            });
            break;
          case "Receipt":
            const generateShowroomReceipt = (await import("../../lib/utils/showroom/showroomReceipt")).default;
            await generateShowroomReceipt({
              id: group.key,
              created_at: group.latestIssuedAt,
              showroom_code: group.target_code,
              invoice_no: `SHOWROOM-INV-${group.target_code}-${group.key}`,
              quotation_no: `SHOWROOM-QUOT-${group.target_code}-${group.key}`,
              amount_paid: group.totalValue,
              balance_due: 0,
            });
            break;
          case "Delivery Note":
            const generateShowroomDeliveryNote = (await import("../../lib/utils/showroom/showroomDeliveryNote")).default;
            await generateShowroomDeliveryNote({
              id: group.key,
              created_at: group.latestIssuedAt,
              showroom_code: group.target_code,
              items: group.items.map(item => ({
                type: item.type,
                model_code: item.model_code,
                identifier: item.identifier,
                price: item.price,
              })),
              reference_no: `REF-${group.date}-${group.target_code}`,
            });
            break;
        }
      } else if (group.target === "Dealer") {
        switch (type) {
          case "Quotation":
            const generateDealerQuotation = (await import("../../lib/utils/dealer/dealerQuotation")).default;
            await generateDealerQuotation({
              id: group.key,
              created_at: group.latestIssuedAt,
              dealer_code: group.target_code,
              items: group.items.map(item => ({
                type: item.type,
                model_code: item.model_code,
                identifier: item.identifier,
                price: item.price,
              })),
              total_value: group.totalValue,
              base_price: group.totalValue,
              discount: 0,
            });
            break;
          case "Invoice":
            const generateDealerInvoice = (await import("../../lib/utils/dealer/dealerInvoice")).default;
            await generateDealerInvoice({
              id: group.key,
              created_at: group.latestIssuedAt,
              dealer_code: group.target_code,
              items: group.items.map(item => ({
                type: item.type,
                model_code: item.model_code,
                identifier: item.identifier,
                price: item.price,
              })),
              total_value: group.totalValue,
              base_price: group.totalValue,
              discount: 0,
            });
            break;
          case "Receipt":
            const generateDealerReceipt = (await import("../../lib/utils/dealer/dealerReceipt")).default;
            await generateDealerReceipt({
              id: group.key,
              created_at: group.latestIssuedAt,
              dealer_code: group.target_code,
              invoice_no: `DEALER-INV-${group.target_code}-${group.key}`,
              quotation_no: `DEALER-QUOT-${group.target_code}-${group.key}`,
              amount_paid: group.totalValue,
              balance_due: 0,
            });
            break;
          case "Delivery Note":
            const generateDealerDeliveryNote = (await import("../../lib/utils/dealer/dealerDeliveryNote")).default;
            await generateDealerDeliveryNote({
              id: group.key,
              created_at: group.latestIssuedAt,
              dealer_code: group.target_code,
              items: group.items.map(item => ({
                type: item.type,
                model_code: item.model_code,
                identifier: item.identifier,
                price: item.price,
              })),
              reference_no: `REF-${group.date}-${group.target_code}`,
            });
            break;
        }
      }
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Failed to generate document. Please try again.");
    }
  }

  async function getExistingDocuments(group: Group) {
    try {
      const response = await fetch(`/api/warehouse/group-documents?group_key=${group.key}&target_type=${group.target.toLowerCase()}&target_code=${group.target_code}`);
      
      const data = await response.json();
      
      if (response.ok && data.documents && data.documents.length > 0) {
        setDocumentsList(prev => new Map(prev).set(group.key, data.documents));
        setShowDocsPopup(group.key);
      } else if (response.status === 404 || !data.documents || data.documents.length === 0) {
        alert("No documents found for this batch. Please generate them first.");
      } else {
        alert("Failed to fetch documents.");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      alert("Failed to fetch documents. Please try again.");
    }
  }

  async function regenerateSingleDocument(doc: DocumentInfo, group: Group) {
    const docId = `${doc.id}-${doc.document_type}`;
    setGeneratingSingle(prev => new Set(prev).add(docId));
    
    try {
      let pdfGenerator;
      let fileName = "";
      
      if (group.target === "Dealer") {
        switch (doc.document_type) {
          case "quotation":
            pdfGenerator = (await import("../../lib/utils/dealer/dealerQuotation")).default;
            fileName = `Dealer_Quotation_${group.target_code}`;
            break;
          case "invoice":
            pdfGenerator = (await import("../../lib/utils/dealer/dealerInvoice")).default;
            fileName = `Dealer_Invoice_${group.target_code}`;
            break;
          case "receipt":
            pdfGenerator = (await import("../../lib/utils/dealer/dealerReceipt")).default;
            fileName = `Dealer_Receipt_${group.target_code}`;
            break;
          case "delivery_note":
            pdfGenerator = (await import("../../lib/utils/dealer/dealerDeliveryNote")).default;
            fileName = `Dealer_DeliveryNote_${group.target_code}`;
            break;
        }
      } else {
        switch (doc.document_type) {
          case "quotation":
            pdfGenerator = (await import("../../lib/utils/showroom/showroomQuotation")).default;
            fileName = `Showroom_Quotation_${group.target_code}`;
            break;
          case "invoice":
            pdfGenerator = (await import("../../lib/utils/showroom/showroomInvoice")).default;
            fileName = `Showroom_Invoice_${group.target_code}`;
            break;
          case "receipt":
            pdfGenerator = (await import("../../lib/utils/showroom/showroomReceipt")).default;
            fileName = `Showroom_Receipt_${group.target_code}`;
            break;
          case "delivery_note":
            pdfGenerator = (await import("../../lib/utils/showroom/showroomDeliveryNote")).default;
            fileName = `Showroom_DeliveryNote_${group.target_code}`;
            break;
        }
      }
      
      if (pdfGenerator) {
        // Pass returnPdfData=true to get the buffer and skip duplicate checks
        // This allows regenerating existing documents
        const pdfBuffer = await pdfGenerator(doc.document_data, true);
        
        if (pdfBuffer) {
          // Convert buffer to blob and trigger download
          const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement("a");
          link.href = pdfUrl;
          link.download = `${fileName}_${new Date().getTime()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pdfUrl);
        }
      }
    } catch (error) {
      console.error("Error regenerating document:", error);
      alert(`Failed to regenerate ${doc.document_type}`);
    } finally {
      setGeneratingSingle(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  }

  async function downloadAllDocuments(group: Group) {
    setDownloadingDocs(prev => new Set(prev).add(group.key));
    
    try {
      const documents = documentsList.get(group.key) || [];
      const zip = new JSZip();
      let hasErrors = false;
      const generatedDocs: Array<{ type: string; buffer: ArrayBuffer }> = [];
      
      for (const doc of documents) {
        try {
          let pdfGenerator;
          let docTypeLabel = "";
          
          if (group.target === "Dealer") {
            switch (doc.document_type) {
              case "quotation":
                pdfGenerator = (await import("../../lib/utils/dealer/dealerQuotation")).default;
                docTypeLabel = "Quotation";
                break;
              case "invoice":
                pdfGenerator = (await import("../../lib/utils/dealer/dealerInvoice")).default;
                docTypeLabel = "Invoice";
                break;
              case "receipt":
                pdfGenerator = (await import("../../lib/utils/dealer/dealerReceipt")).default;
                docTypeLabel = "Receipt";
                break;
              case "delivery_note":
                pdfGenerator = (await import("../../lib/utils/dealer/dealerDeliveryNote")).default;
                docTypeLabel = "DeliveryNote";
                break;
            }
          } else {
            switch (doc.document_type) {
              case "quotation":
                pdfGenerator = (await import("../../lib/utils/showroom/showroomQuotation")).default;
                docTypeLabel = "Quotation";
                break;
              case "invoice":
                pdfGenerator = (await import("../../lib/utils/showroom/showroomInvoice")).default;
                docTypeLabel = "Invoice";
                break;
              case "receipt":
                pdfGenerator = (await import("../../lib/utils/showroom/showroomReceipt")).default;
                docTypeLabel = "Receipt";
                break;
              case "delivery_note":
                pdfGenerator = (await import("../../lib/utils/showroom/showroomDeliveryNote")).default;
                docTypeLabel = "DeliveryNote";
                break;
            }
          }
          
          if (pdfGenerator) {
            // Call the PDF generator with returnPdfData=true to get the buffer instead of auto-download
            const pdfBuffer = await pdfGenerator(doc.document_data, true);
            
            if (pdfBuffer) {
              generatedDocs.push({ 
                type: docTypeLabel, 
                buffer: pdfBuffer as ArrayBuffer 
              });
            }
          }
        } catch (err) {
          console.error(`Error generating ${doc.document_type}:`, err);
          hasErrors = true;
        }
      }
      
      // Add all generated PDFs to the ZIP file
      for (let i = 0; i < generatedDocs.length; i++) {
        const genDoc = generatedDocs[i];
        const fileName = `${i + 1}_${genDoc.type}_${group.target_code}_${new Date(group.date).getTime()}.pdf`;
        zip.file(fileName, genDoc.buffer);
      }
      
      // Generate and download the ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipLink = document.createElement("a");
      zipLink.href = zipUrl;
      zipLink.download = `${group.target}_${group.target_code}_Documents_${new Date(group.date).toISOString().split("T")[0]}.zip`;
      document.body.appendChild(zipLink);
      zipLink.click();
      document.body.removeChild(zipLink);
      URL.revokeObjectURL(zipUrl);
      
      if (hasErrors) {
        alert("Some documents failed to generate. Check the browser console for details.");
      } else {
        alert("All documents downloaded successfully!");
      }
    } catch (error) {
      console.error("Error downloading documents:", error);
      alert("Failed to download documents. Please try downloading individually.");
    } finally {
      setDownloadingDocs(prev => {
        const next = new Set(prev);
        next.delete(group.key);
        return next;
      });
    }
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit">
            Warehouse Operations
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight dark:text-white">
              Issued Inventory History
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Grouped by destination and date. Expand a row to view items and generate documents.
            </p>
          </div>

          {/* FILTER */}
          <div className="flex gap-2 pt-1">
            {(["all", "showroom", "dealer"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={targetFilter === f ? "default" : "outline"}
                onClick={() => changeFilter(f)}
                className="capitalize"
              >
                {f === "all" ? "All" : f === "showroom" ? "Showrooms" : "Dealers"}
              </Button>
            ))}
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Issue Batches", value: summary.totalGroups },
            { label: "Bikes Issued", value: summary.bikes },
            { label: "Spares Issued", value: summary.spares },
            { label: "Total Value", value: summary.totalValue },
          ].map((s) => (
            <Card key={s.label} className="dark:border-white/10 dark:bg-slate-900/60">
              <CardHeader>
                <CardDescription className="dark:text-slate-400">{s.label}</CardDescription>
                <CardTitle className="text-3xl dark:text-white">
                  {formatNumber(s.value)}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* GROUPED TABLE */}
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">Issue Batches</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Each row is a batch of items issued to the same destination on the same day.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                Loading issued history...
              </div>
            ) : groups.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                No issued records found.
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const isExpanded = expandedKeys.has(group.key);
                  return (
                    <div
                      key={group.key}
                      className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden"
                    >
                      {/* GROUP HEADER ROW */}
                      <div
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                        onClick={() => toggleExpand(group.key)}
                      >
                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Target badge */}
                          <Badge
                            variant="outline"
                            className={
                              group.target === "Dealer"
                                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                                : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
                            }
                          >
                            {group.target}
                          </Badge>

                          <span className="font-semibold text-slate-800 dark:text-white">
                            {group.target_code}
                          </span>

                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {new Date(group.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>

                          {/* Item counts */}
                          <div className="flex items-center gap-2">
                            {group.bikeCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/30 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                                <Bike className="w-3 h-3" />
                                {group.bikeCount} {group.bikeCount === 1 ? "bike" : "bikes"}
                              </span>
                            )}
                            {group.spareCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <Wrench className="w-3 h-3" />
                                {group.spareCount} {group.spareCount === 1 ? "spare" : "spares"}
                              </span>
                            )}
                          </div>

                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            LKR {formatNumber(group.totalValue)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          {/* Get Copies Button */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              getExistingDocuments(group);
                            }}
                            className="dark:border-white/10 dark:text-slate-300"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> 
                            Get Copies
                          </Button>

                          {/* Doc buttons — always visible */}
                          <div className="hidden md:flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Quotation")} className="dark:border-white/10 dark:text-slate-300">
                              <FileText className="w-3.5 h-3.5 mr-1" /> Quotation
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Invoice")} className="dark:border-white/10 dark:text-slate-300">
                              <FileCheck className="w-3.5 h-3.5 mr-1" /> Invoice
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Receipt")} className="dark:border-white/10 dark:text-slate-300">
                              <Receipt className="w-3.5 h-3.5 mr-1" /> Receipt
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Delivery Note")} className="dark:border-white/10 dark:text-slate-300">
                              <Truck className="w-3.5 h-3.5 mr-1" /> Delivery
                            </Button>
                          </div>

                          {/* Expand toggle */}
                          <div className="text-slate-400 dark:text-slate-500">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* EXPANDED ITEMS */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 dark:border-white/10">
                          {/* Mobile doc buttons */}
                          <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100 dark:border-white/5 md:hidden">
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Quotation")} className="dark:border-white/10 dark:text-slate-300">
                              <FileText className="w-3.5 h-3.5 mr-1" /> Quotation
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Invoice")} className="dark:border-white/10 dark:text-slate-300">
                              <FileCheck className="w-3.5 h-3.5 mr-1" /> Invoice
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Receipt")} className="dark:border-white/10 dark:text-slate-300">
                              <Receipt className="w-3.5 h-3.5 mr-1" /> Receipt
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Delivery Note")} className="dark:border-white/10 dark:text-slate-300">
                              <Truck className="w-3.5 h-3.5 mr-1" /> Delivery
                            </Button>
                          </div>

                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/20">
                              <tr>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Model</th>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Identifier</th>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Price</th>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.type === "Bike"
                                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                    }`}>
                                      {item.type === "Bike"
                                        ? <Bike className="w-3 h-3" />
                                        : <Wrench className="w-3 h-3" />}
                                      {item.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.model_code}</td>
                                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{item.identifier}</td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                    {item.price ? `LKR ${formatNumber(item.price)}` : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                    {new Date(item.issued_at).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItemsLabel={`${totalGroups} total batches`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Documents Popup Modal */}
      {showDocsPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDocsPopup(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Generated Documents</h3>
              <button
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
                onClick={() => setShowDocsPopup(null)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {documentsList.get(showDocsPopup)?.map((doc) => {
                const group = groups.find(g => g.key === showDocsPopup);
                const docId = `${doc.id}-${doc.document_type}`;
                return group && (
                  <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg dark:border-white/10">
                    <div>
                      <p className="font-medium capitalize dark:text-white">{doc.document_type}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{doc.document_number}</p>
                      <p className="text-xs text-slate-400">{new Date(doc.generated_at).toLocaleString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regenerateSingleDocument(doc, group)}
                      disabled={generatingSingle.has(docId)}
                    >
                      {generatingSingle.has(docId) ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View/Download
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
              <div className="pt-4">
                <Button 
                  className="w-full"
                  onClick={() => {
                    const group = groups.find(g => g.key === showDocsPopup);
                    if (group) {
                      downloadAllDocuments(group);
                    }
                    setShowDocsPopup(null);
                  }}
                  disabled={downloadingDocs.has(showDocsPopup)}
                >
                  {downloadingDocs.has(showDocsPopup) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download All as ZIP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
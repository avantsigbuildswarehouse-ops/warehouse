"use client";

import { useEffect, useState, useMemo } from "react";
import { PackageOpen, Download as DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { generateIssueDocument, IssueDocData, IssueItem } from "@/lib/utils/pdf-generator";

type Showroom = { showroom_code: string; city: string; address: string };
type Dealer = { dealer_code: string; business_name: string; address: string };
type BikeItem = {
  model_code: string;
  model_name: string;
  engine_number: string;
  chassis_number: string;
  price: number;
};
type SpareItem = {
  model_code: string;
  spare_code: string;
  spare_name: string;
  serial_number: string;
  price: number;
};

export default function IssueStockForm() {
  const [targetType, setTargetType] = useState<"ASB_Showroom" | "Dealer">("ASB_Showroom");
  const [targetCode, setTargetCode] = useState<string>("");
  const [itemType, setItemType] = useState<"Bike" | "Spare">("Bike");
  
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [bikes, setBikes] = useState<BikeItem[]>([]);
  const [spares, setSpares] = useState<SpareItem[]>([]);
  
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [issueQuantity, setIssueQuantity] = useState<number | "">("");
  
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<IssueDocData | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [srRes, dlRes, bkRes, spRes] = await Promise.all([
          fetch("/api/showrooms"),
          fetch("/api/dealers"),
          fetch("/api/warehouse/available-bikes"),
          fetch("/api/warehouse/available-spares"),
        ]);
        
        setShowrooms(await srRes.json());
        setDealers(await dlRes.json());
        
        const bkData = await bkRes.json();
        setBikes(bkData.items || []);
        
        const spData = await spRes.json();
        setSpares(spData.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute available model categories from loaded inventory
  const availableBikeModels = useMemo(() => {
    const map = new Map<string, {name: string, count: number}>();
    bikes.forEach(b => {
      const prev = map.get(b.model_code);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(b.model_code, { name: b.model_name, count: 1 });
      }
    });
    return Array.from(map.entries()).map(([code, data]) => ({ code, name: data.name, count: data.count }));
  }, [bikes]);

const availableSpareTypes = useMemo(() => {
  const map = new Map<
    string,
    { name: string; model: string; count: number }
  >();

  spares.forEach((s) => {
    const key = `${s.model_code}__${s.spare_code}`;

    const prev = map.get(key);

    if (prev) {
      prev.count += 1;
    } else {
      map.set(key, {
        name: s.spare_name,
        model: s.model_code,
        count: 1,
      });
    }
  });

  return Array.from(map.entries()).map(([key, data]) => {
    const [model_code, spare_code] = key.split("__");

    return {
      code: key,
      spare_code,
      model_code,
      name: data.name,
      count: data.count,
    };
  });
}, [spares]);


  // Compute the automatically selected items based on quantity
const itemsToIssue = useMemo(() => {
  if (
    !selectedModel ||
    !issueQuantity ||
    typeof issueQuantity !== "number" ||
    issueQuantity <= 0
  )
    return [];

  if (itemType === "Bike") {
    return bikes
      .filter((b) => b.model_code === selectedModel)
      .slice(0, issueQuantity);
  } else {
    const [model_code, spare_code] = selectedModel.split("__");

    return spares
      .filter(
        (s) =>
          s.model_code === model_code &&
          s.spare_code === spare_code
      )
      .slice(0, issueQuantity);
  }
}, [selectedModel, issueQuantity, itemType, bikes, spares]);


  const handleIssue = async () => {
    if (!targetCode || itemsToIssue.length === 0) return;
    
    setIssuing(true);
    try {
      const selectedItemIdentifiers = itemType === "Bike" 
        ? itemsToIssue.map(i => (i as BikeItem).engine_number) 
        : itemsToIssue.map(i => (i as SpareItem).serial_number);

      const res = await fetch("/api/warehouse/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetCode,
          itemType,
          items: selectedItemIdentifiers
        })
      });
      
      if (!res.ok) throw new Error("Failed to issue");
      
      // Compute details for PDF Generation
      let docItems: IssueItem[] = [];
      if (itemType === "Bike") {
        docItems = itemsToIssue.map(b => {
          const bike = b as BikeItem;
          return { model_code: bike.model_code, name: bike.model_name, identifier: bike.engine_number, price: bike.price };
        });
        setBikes(prev => prev.filter(b => !selectedItemIdentifiers.includes(b.engine_number)));
      } else {
        docItems = itemsToIssue.map(s => {
           const spare = s as SpareItem;
           return { model_code: spare.spare_code, name: spare.spare_name, identifier: spare.serial_number, price: spare.price };
        });
        setSpares(prev => prev.filter(s => !selectedItemIdentifiers.includes(s.serial_number)));
      }
      
      let targetName = "";
      let targetAddress = "";
      if (targetType === "ASB_Showroom") {
        const sr = showrooms.find(x => x.showroom_code === targetCode)!;
        targetName = `Showroom - ${sr.city} (${sr.showroom_code})`;
        targetAddress = sr.address;
      } else {
        const dl = dealers.find(x => x.dealer_code === targetCode)!;
        targetName = `Dealer - ${dl.business_name} (${dl.dealer_code})`;
        targetAddress = dl.address;
      }
      
      setIssueResult({
        type: "Quotation", // default
        referenceNo: `ISSUE-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        targetName,
        targetAddress,
        items: docItems
      });
      
      setIssueQuantity("");
      setTargetCode("");
      setSelectedModel("");
    } catch (e) {
      console.error(e);
      alert("Error issuing stock.");
    } finally {
      setIssuing(false);
    }
  };

  const handleDownload = (docType: "Quotation" | "Invoice" | "Delivery Note" | "Receipt") => {
    if (!issueResult) return;
    const doc = generateIssueDocument({ ...issueResult, type: docType });
    doc.save(`${docType}_${issueResult.referenceNo}.pdf`);
  };

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
       {/* HEADER */}
       <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60 transition-colors">
          <Badge variant="outline" className="w-fit border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-slate-700 bg-slate-50">
            Stock Distribution
          </Badge>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Issue Inventory</h1>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">Issue multiple units at once using quick select logic.</p>
            </div>
          </div>
        </div>

        {issueResult ? (
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <CardHeader>
              <CardTitle className="text-emerald-800 dark:text-emerald-300">Successfully Issued</CardTitle>
              <CardDescription className="text-emerald-600 dark:text-emerald-400">
                You have successfully issued {issueResult.items.length} items to {issueResult.targetName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium mb-4 text-emerald-800 dark:text-emerald-200">Download Official Documents:</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => handleDownload("Quotation")} className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                  <DownloadIcon className="w-4 h-4 mr-2"/> Quotation
                </Button>
                <Button variant="outline" onClick={() => handleDownload("Invoice")} className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                   <DownloadIcon className="w-4 h-4 mr-2"/> Invoice
                </Button>
                <Button variant="outline" onClick={() => handleDownload("Receipt")} className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                   <DownloadIcon className="w-4 h-4 mr-2"/> Receipt
                </Button>
                <Button variant="outline" onClick={() => handleDownload("Delivery Note")} className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                   <DownloadIcon className="w-4 h-4 mr-2"/> Delivery Note
                </Button>
              </div>
              <Button className="mt-6 w-full" variant="ghost" onClick={() => setIssueResult(null)}>Issue Another Batch</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6 space-y-6">
              {loading ? (
                 <div className="h-40 flex items-center justify-center text-slate-500">Loading Configuration...</div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 dark:text-slate-300">Select Destination Type</Label>
                      <select 
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition-colors dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                        value={targetType} onChange={e => { setTargetType(e.target.value as any); setTargetCode(""); }}
                      >
                        <option value="ASB_Showroom">ASB Showroom</option>
                        <option value="Dealer">Dealer</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 dark:text-slate-300">Select Location</Label>
                      <select 
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition-colors dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                        value={targetCode} onChange={e => setTargetCode(e.target.value)}
                      >
                        <option value="">-- Choose Location --</option>
                        {targetType === "ASB_Showroom" 
                          ? showrooms.map(s => <option key={s.showroom_code} value={s.showroom_code}>{s.city} ({s.showroom_code})</option>)
                          : dealers.map(d => <option key={d.dealer_code} value={d.dealer_code}>{d.business_name} ({d.dealer_code})</option>)
                        }
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                    <Label className="text-slate-700 dark:text-slate-300 mb-4 block">Select Inventory Action</Label>
                    <div className="flex flex-col gap-6 md:flex-row md:items-end">
                       <div className="space-y-3 w-full md:w-1/3">
                         <Label className="font-normal text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Inventory Type</Label>
                         <div className="flex gap-2">
                           <Button className="flex-1" variant={itemType === "Bike" ? "default" : "outline"} onClick={() => { setItemType("Bike"); setSelectedModel(""); setIssueQuantity(""); }}>Bikes</Button>
                           <Button className="flex-1" variant={itemType === "Spare" ? "default" : "outline"} onClick={() => { setItemType("Spare"); setSelectedModel(""); setIssueQuantity(""); }}>Spares</Button>
                         </div>
                       </div>
                       
                       <div className="space-y-3 w-full md:w-1/3">
                          <Label className="font-normal text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Available Category</Label>
                          <select 
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                            value={selectedModel} onChange={e => { setSelectedModel(e.target.value); setIssueQuantity(""); }}
                          >
                            <option value="">-- Select --</option>
                            {itemType === "Bike" 
                              ? availableBikeModels.map(m => <option key={m.code} value={m.code}>{m.name} ({m.count} remaining)</option>)
                              : availableSpareTypes.map(m => <option key={m.code} value={m.code}>{m.name} {""} {m.code}({m.count} remaining)</option>)
                            }
                          </select>
                       </div>
                       
                       <div className="space-y-3 w-full md:w-1/3">
                          <Label className="font-normal text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantity to Issue</Label>
                          <Input 
                             type="number" min="1" 
                             className="h-10 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                             value={issueQuantity}
                             onChange={e => {
                               const val = parseInt(e.target.value);
                               if (!isNaN(val)) {
                                 const maxAvailable = itemType === "Bike" 
                                    ? (availableBikeModels.find(x => x.code === selectedModel)?.count || 0)
                                    : (availableSpareTypes.find(x => x.code === selectedModel)?.count || 0);

                                 if (val > maxAvailable) setIssueQuantity(maxAvailable);
                                 else setIssueQuantity(val);
                               } else {
                                 setIssueQuantity("");
                               }
                             }}
                             disabled={!selectedModel}
                             placeholder="E.g. 5"
                          />
                       </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  {itemsToIssue.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 dark:bg-slate-800/30 dark:border-white/10 mt-6">
                       <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">Selected Items Summary</h3>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                         These exact {itemsToIssue.length} tracking units will be unlinked from central stock and assigned to the destination above.
                       </p>
                       <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                         {itemsToIssue.map((item, idx) => {
                            if (itemType === "Bike") {
                              const b = item as BikeItem;
                              return (
                                <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white border border-slate-100 rounded-lg dark:bg-slate-900/50 dark:border-white/5">
                                  <span className="font-medium dark:text-slate-200">{b.model_name} <span className="text-xs text-slate-400 font-normal ml-1">Engine No:</span></span>
                                  <span className="font-mono text-slate-600 dark:text-slate-300">{b.engine_number}</span>
                                </div>
                              );
                            } else {
                              const s = item as SpareItem;
                              return (
                                <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white border border-slate-100 rounded-lg dark:bg-slate-900/50 dark:border-white/5">
                                  <span className="font-medium dark:text-slate-200">{s.spare_name} <span className="text-xs text-slate-400 font-normal ml-1">Serial No:</span></span>
                                  <span className="font-mono text-slate-600 dark:text-slate-300">{s.serial_number}</span>
                                </div>
                              );
                            }
                         })}
                       </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <Button disabled={issuing || !targetCode || itemsToIssue.length === 0} onClick={handleIssue} className="w-full md:w-auto">
                      <PackageOpen className="w-4 h-4 mr-2" />
                      {issuing ? "Processing..." : `Issue ${itemsToIssue.length} units`}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
    </div>
    </div>
  );
}

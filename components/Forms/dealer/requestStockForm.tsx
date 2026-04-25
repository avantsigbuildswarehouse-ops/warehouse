"use client";

import { useEffect, useState, useMemo } from "react";
import { PackageOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";


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

type IssueResult = {
  itemCount: number;
  targetName: string;
  referenceNo: string;
};

export default function RequestStockForm() {
  const [targetType, setTargetType] = useState<"ASB_Showroom" | "Dealer">("ASB_Showroom");
  const [targetCode, setTargetCode] = useState<string>("");
  const [itemType, setItemType] = useState<"Bike" | "Spare">("Bike");

  const [bikes, setBikes] = useState<BikeItem[]>([]);
  const [spares, setSpares] = useState<SpareItem[]>([]);

  const [selectedModel, setSelectedModel] = useState<string>("");
  const [issueQuantity, setIssueQuantity] = useState<number | "">("");

  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<IssueResult | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [ bkRes, spRes] = await Promise.all([
          fetch("/api/warehouse/available-bikes"),
          fetch("/api/warehouse/available-spares"),
        ]);

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

  const availableBikeModels = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    bikes.forEach((b) => {
      const prev = map.get(b.model_code);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(b.model_code, { name: b.model_name, count: 1 });
      }
    });
    return Array.from(map.entries()).map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count,
    }));
  }, [bikes]);

  const availableSpareTypes = useMemo(() => {
    const map = new Map<string, { name: string; model: string; count: number }>();
    spares.forEach((s) => {
      const key = `${s.model_code}__${s.spare_code}`;
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(key, { name: s.spare_name, model: s.model_code, count: 1 });
      }
    });
    return Array.from(map.entries()).map(([key, data]) => {
      const [model_code, spare_code] = key.split("__");
      return { code: key, spare_code, model_code, name: data.name, count: data.count };
    });
  }, [spares]);

  const itemsToIssue = useMemo(() => {
    if (!selectedModel || !issueQuantity || typeof issueQuantity !== "number" || issueQuantity <= 0)
      return [];

    if (itemType === "Bike") {
      return bikes.filter((b) => b.model_code === selectedModel).slice(0, issueQuantity);
    } else {
      const [model_code, spare_code] = selectedModel.split("__");
      return spares
        .filter((s) => s.model_code === model_code && s.spare_code === spare_code)
        .slice(0, issueQuantity);
    }
  }, [selectedModel, issueQuantity, itemType, bikes, spares]);

  const handleIssue = async () => {
    if (!targetCode || itemsToIssue.length === 0) return;

    setIssuing(true);
    try {
      const selectedItemIdentifiers =
        itemType === "Bike"
          ? itemsToIssue.map((i) => (i as BikeItem).engine_number)
          : itemsToIssue.map((i) => (i as SpareItem).serial_number);

      const res = await fetch("/api/warehouse/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetCode,
          itemType,
          items: selectedItemIdentifiers,
        }),
      });

      if (!res.ok) throw new Error("Failed to issue");

      // Update local inventory state
      if (itemType === "Bike") {
        setBikes((prev) => prev.filter((b) => !selectedItemIdentifiers.includes(b.engine_number)));
      } else {
        setSpares((prev) => prev.filter((s) => !selectedItemIdentifiers.includes(s.serial_number)));
      }


      //setIssueResult({
        itemCount: selectedItemIdentifiers.length,
        //targetName,
        //referenceNo: `ISSUE-${Date.now().toString().slice(-6)}`,
      //});

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

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60 transition-colors">
          <Badge variant="outline" className="w-fit border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-slate-700 bg-slate-50">
            Stock Request
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Request Inventory Stock
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Request Inventory stock from central warehouse to be delivered to your location. Select the destination, choose the inventory items you want to request, and submit your request. You can track the status of your requests in the "My Requests" section.
            </p>
          </div>
        </div>

        {/* SUCCESS STATE */}
        {issueResult ? (
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-emerald-800 dark:text-emerald-300">
                    Successfully Requested
                  </CardTitle>
                  <CardDescription className="text-emerald-600 dark:text-emerald-400">
                    Ref: {issueResult.referenceNo}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-white/60 dark:bg-emerald-950/20 p-4">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  <span className="font-semibold">{issueResult.itemCount} {issueResult.itemCount === 1 ? "unit" : "units"}</span>Request Sent successfully to warehouse!.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* FORM */
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6 space-y-6 max-h-[75vh] overflow-y-auto pr-4">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  Loading configuration...
                </div>
              ) : (
                <>
                  {/* DEALER REQUEST HEADER */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-800/30">
                <div className="flex items-start justify-between gap-4">
                    <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Dealer Stock Request
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Select inventory items and quantities to request from the central warehouse.
                        This request will be submitted for approval before stock allocation.
                    </p>
                    </div>

                    <Badge
                    variant="outline"
                    className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                    Request Mode
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/40">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Request Type</p>
                    <p className="font-medium text-slate-800 dark:text-white">Dealer Request</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/40">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Source</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                        Central Warehouse
                    </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/40">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                        Pending Submission
                    </p>
                    </div>
                </div>
                </div>


                  {/* INVENTORY SELECTION */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                    <Label className="text-slate-700 dark:text-slate-300 mb-4 block">
                      Select Inventory Action
                    </Label>
                    <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="space-y-3 min-w-0">
                        <Label className="font-normal text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Inventory Type
                        </Label>
                        <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            variant={itemType === "Bike" ? "default" : "outline"}
                            onClick={() => { setItemType("Bike"); setSelectedModel(""); setIssueQuantity(""); }}
                        >
                            Bikes
                        </Button>
                        <Button
                            className="flex-1"
                            variant={itemType === "Spare" ? "default" : "outline"}
                            onClick={() => { setItemType("Spare"); setSelectedModel(""); setIssueQuantity(""); }}
                        >
                            Spares
                        </Button>
                        </div>
                    </div>

                    <div className="space-y-3 min-w-0">
                        <Label className="font-normal text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Available Category
                        </Label>
                        <select
                        className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                        value={selectedModel}
                        onChange={(e) => { setSelectedModel(e.target.value); setIssueQuantity(""); }}
                        >
                        <option value="">-- Select --</option>
                        {itemType === "Bike"
                            ? availableBikeModels.map((m) => (
                                <option key={m.code} value={m.code}>
                                {m.name} ({m.count} remaining)
                                </option>
                            ))
                            : availableSpareTypes.map((m) => (
                                <option key={m.code} value={m.code}>
                                {m.name} — {m.spare_code} ({m.count} remaining)
                                </option>
                            ))}
                        </select>

                        {itemType === "Bike" && availableBikeModels.length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            No bikes available
                        </p>
                        )}
                        {itemType === "Spare" && availableSpareTypes.length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            No spares available
                        </p>
                        )}
                    </div>

                    <div className="space-y-3 min-w-0">
                        <Label className="font-normal text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Quantity to Issue
                        </Label>
                        <Input
                        type="number"
                        min="1"
                        className="h-10 w-full rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                        value={issueQuantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                            const maxAvailable =
                                itemType === "Bike"
                                ? availableBikeModels.find((x) => x.code === selectedModel)?.count || 0
                                : availableSpareTypes.find((x) => x.code === selectedModel)?.count || 0;
                            setIssueQuantity(val > maxAvailable ? maxAvailable : val);
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

                  {/* SUMMARY */}
                  {itemsToIssue.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 dark:bg-slate-800/30 dark:border-white/10">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                        Selected Items Summary
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        These exact {itemsToIssue.length} tracking units will be unlinked from central stock and assigned to the destination above.
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                        {itemsToIssue.map((item, idx) => {
                          if (itemType === "Bike") {
                            const b = item as BikeItem;
                            return (
                              <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white border border-slate-100 rounded-lg dark:bg-slate-900/50 dark:border-white/5">
                                <span className="font-medium dark:text-slate-200">
                                  {b.model_name}
                                  <span className="text-xs text-slate-400 font-normal ml-2">Engine No:</span>
                                </span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">{b.engine_number}</span>
                              </div>
                            );
                          } else {
                            const s = item as SpareItem;
                            return (
                              <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white border border-slate-100 rounded-lg dark:bg-slate-900/50 dark:border-white/5">
                                <span className="font-medium dark:text-slate-200">
                                  {s.spare_name}
                                  <span className="text-xs text-slate-400 font-normal ml-2">Serial No:</span>
                                </span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">{s.serial_number}</span>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUBMIT */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      disabled={issuing || !targetCode || itemsToIssue.length === 0}
                      onClick={handleIssue}
                      className="w-full md:w-auto"
                    >
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
"use client";

import { useState } from "react";
import { Bike, Building2, User, Wrench, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SellToCompanyForm from "@/components/Forms/sales/sell-to-company";
import SellToCustomerForm from "@/components/Forms/sales/sell-to-customer";

type SellFormType = "company" | "customer";
type ItemCategory = "bikes" | "spares";

const CATEGORY_CONFIG = {
  bikes: {
    label: "Vehicles",
    icon: Bike,
  },
  spares: {
    label: "Spare Parts",
    icon: Wrench,
  },
};

export default function BillingPage() {
  const [sellFormType, setSellFormType] = useState<SellFormType>("customer");
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("bikes");

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <Badge className="w-fit" variant="outline">
            <ReceiptText className="mr-2 h-3 w-3" />
            Sales & Billing
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Sales Management
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sell to customers or companies. Filter items by bikes or spare parts.
            </p>
          </div>
        </div>

        {/* Form Type Toggle */}
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-lg">Sell To</CardTitle>
            <CardDescription>Choose who you're selling to</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => setSellFormType("customer")}
                variant={sellFormType === "customer" ? "default" : "outline"}
              >
                <User className="mr-2 h-4 w-4" />
                Customer
              </Button>
              <Button
                className="flex-1"
                onClick={() => setSellFormType("company")}
                variant={sellFormType === "company" ? "default" : "outline"}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Company
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-lg">Filter Items</CardTitle>
            <CardDescription>View bikes or spare parts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 grid-cols-2 gap-2">
              {(Object.entries(CATEGORY_CONFIG) as Array<[ItemCategory, typeof CATEGORY_CONFIG.bikes]>).map(
                ([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      variant={selectedCategory === key ? "default" : "outline"}
                      className="flex items-center justify-center h-8 gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{config.label}</span>
                    </Button>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Forms */}
        {sellFormType === "customer" ? (
          <SellToCustomerForm filterCategory={selectedCategory} />
        ) : (
          <SellToCompanyForm filterCategory={selectedCategory} />
        )}
      </div>
    </div>
  );
}
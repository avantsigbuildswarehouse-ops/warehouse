"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Bike, Building2, ReceiptText, User, Wrench } from "lucide-react";

import AdvanceBookingForm from "@/components/Forms/sales/advance-booking-form";
import CollectBookingForm from "@/components/Forms/sales/collect-booking-form";
import SellToCompanyForm from "@/components/Forms/sales/sell-to-company";
import SellToCustomerForm from "@/components/Forms/sales/sell-to-customer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SellFormType = "company" | "customer";
type BillingStage = "onsite" | "advance" | "collect";
type ItemCategory = "bikes" | "spares";

const CATEGORY_CONFIG = {
  bikes: { label: "Vehicles", icon: Bike },
  spares: { label: "Spare Parts", icon: Wrench },
};

export default function BillingPage() {
  const params = useParams<{ dealerCode: string }>();
  const [sellFormType, setSellFormType] = useState<SellFormType>("customer");
  const [billingStage, setBillingStage] = useState<BillingStage>("onsite");
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("bikes");
  const isVehicleSale = selectedCategory === "bikes";
  const historyHref =
    sellFormType === "customer"
      ? `/dealer/${params.dealerCode}/Customer?stage=advance`
      : `/dealer/${params.dealerCode}/Company?stage=advance`;

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
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
              Handle on-site sales, advance bookings, and final vehicle collection.
            </p>
          </div>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-lg">Sell To</CardTitle>
            <CardDescription>Choose who you&apos;re handling the billing for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setSellFormType("customer")} variant={sellFormType === "customer" ? "default" : "outline"}>
                <User className="mr-2 h-4 w-4" />
                Customer
              </Button>
              <Button className="flex-1" onClick={() => setSellFormType("company")} variant={sellFormType === "company" ? "default" : "outline"}>
                <Building2 className="mr-2 h-4 w-4" />
                Company
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-lg">Filter Items</CardTitle>
            <CardDescription>Choose whether you are billing for vehicles or spare parts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {(Object.entries(CATEGORY_CONFIG) as Array<[ItemCategory, typeof CATEGORY_CONFIG.bikes]>).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    variant={selectedCategory === key ? "default" : "outline"}
                    className="flex h-8 items-center justify-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{config.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {isVehicleSale ? (
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-lg">Billing Stage</CardTitle>
            <CardDescription>Choose the type of billing flow to run</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              <Button onClick={() => setBillingStage("onsite")} variant={billingStage === "onsite" ? "default" : "outline"}>
                On Site Cash Purchase
              </Button>
              <Button onClick={() => setBillingStage("advance")} variant={billingStage === "advance" ? "default" : "outline"}>
                Advance Payments
              </Button>
              <Button onClick={() => setBillingStage("collect")} variant={billingStage === "collect" ? "default" : "outline"}>
                Came To Collect
              </Button>
            </div>
          </CardContent>
        </Card>
        ) : null}

        {!isVehicleSale || billingStage === "onsite" ? (
          sellFormType === "customer" ? (
            <SellToCustomerForm filterCategory={selectedCategory} />
          ) : (
            <SellToCompanyForm filterCategory={selectedCategory} />
          )
        ) : null}

        {isVehicleSale && billingStage === "advance" ? (
          <>
            <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
              <CardHeader>
                <CardTitle className="text-lg">Advance Payment Records</CardTitle>
                <CardDescription>
                  View only advance-payment bookings, buyer details, Performer Invoices, and Pre-Order Quotations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href={historyHref}>
                    View {sellFormType === "customer" ? "Customer" : "Company"} Advance Payments
                  </Link>
                </Button>
              </CardContent>
            </Card>
            {sellFormType === "customer" ? <AdvanceBookingForm buyerType="customer" /> : <AdvanceBookingForm buyerType="company" />}
          </>
        ) : null}

        {isVehicleSale && billingStage === "collect" ? (
          sellFormType === "customer" ? <CollectBookingForm buyerType="customer" /> : <CollectBookingForm buyerType="company" />
        ) : null}
      </div>
    </div>
  );
}

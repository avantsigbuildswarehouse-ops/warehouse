"use client"

// CompanyRegistrationForm.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CompanyRegistrationData, DatabaseError } from "../../../lib/types/formTypes"
import useCompanyDataValidation from "../../../lib/validations/company/useCompanyDataValidation"
import { CheckCircle, AlertCircle, Building2, Car, CircleDollarSign } from "lucide-react"

const CompanyRegistrationForm = () => {
  const [company, setCompany] = useState<CompanyRegistrationData>({
    companyName: "",
    companyAddress: "",
    vatRegistrationNumber: "",
    brNumber: "",
    companyContact: "",
    companyEmail: "",
    vehicleModel: "",
    manuYear: "",
    engineNumber: "",
    chasisNumber: "",
    color: "",
    basePrice: "",
    vat: "",
    registrationFee: "",
    discount: "",
    advancePayment: "",
    paymentMethod: "",
    balanceDue: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    errors,
    isValidating,
    validateField,
    validateAll,
    clearFieldError,
    clearAllErrors
  } = useCompanyDataValidation()

  const handleFormSubmit = async () => {
    setSubmitError(null)
    setSubmitSuccess(false)
    setIsSubmitting(true)

    try {
      const validationResult = await validateAll(company)

      if (!validationResult.isValid) {
        const firstErrorField = Object.keys(validationResult.errors)[0]
        const errorElement = document.getElementById(`field-${firstErrorField}`)
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        setSubmitError("Please fix the validation errors before submitting.")
        setIsSubmitting(false)
        return
      }

      const res = await fetch("/api/company/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company)
      })

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.error || "Failed to save company data";
        if (errorMessage.includes("duplicate") || errorMessage.includes("23505")) {
          setSubmitError("One or more fields (VAT Registration Number, BR Number, Engine Number, or Chassis Number) already exist in our system. Please use unique values.")
          await validateAll(company)
        } else {
          setSubmitError(errorMessage)
        }
        setIsSubmitting(false)
        return
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        setCompany({
          companyName: "", companyAddress: "", vatRegistrationNumber: "", brNumber: "",
          companyContact: "", companyEmail: "", vehicleModel: "", manuYear: "",
          engineNumber: "", chasisNumber: "", color: "", basePrice: "", vat: "",
          registrationFee: "", discount: "", advancePayment: "", paymentMethod: "", balanceDue: ""
        })
        clearAllErrors()
        setSubmitSuccess(false)
      }, 1000)

      const closeButton = document.querySelector('[data-state="open"] button[aria-label="Close"]')
      if (closeButton) (closeButton as HTMLButtonElement).click()
      setIsSubmitting(false)
    } catch (error) {
      setSubmitError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof CompanyRegistrationData, value: string) => {
    setCompany(prev => ({ ...prev, [field]: value }))
    clearFieldError(field)
    setSubmitError(null)
  }

  const handleBlur = (field: keyof CompanyRegistrationData, value: string) => {
    if (value) validateField(field, value)
  }

  const getFieldError = (field: keyof CompanyRegistrationData): string | undefined => errors[field]?.[0]

  const calculateTotal = () => {
    const basePrice = parseFloat(company.basePrice) || 0
    const vat = parseFloat(company.vat) || 0
    const registrationFee = parseFloat(company.registrationFee) || 0
    const discount = parseFloat(company.discount) || 0
    const advancePayment = parseFloat(company.advancePayment) || 0
    const subtotal = basePrice + vat + registrationFee
    const totalAfterDiscount = subtotal - discount
    const balanceDue = totalAfterDiscount - advancePayment
    return { subtotal, totalAfterDiscount, balanceDue }
  }

  const handleNumberChange = (field: keyof CompanyRegistrationData, value: string) => {
    setCompany(prev => ({ ...prev, [field]: value }))
    setTimeout(() => {
      const { balanceDue } = calculateTotal()
      setCompany(prev => ({ ...prev, balanceDue: balanceDue.toString() }))
    }, 0)
  }

  const fieldClass = (field: keyof CompanyRegistrationData) =>
    `h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-4 focus:ring-sky-500/10 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-900 ${
      getFieldError(field)
        ? "border-red-400 bg-red-50 focus:border-red-500 dark:border-red-500 dark:bg-red-950/20"
        : "border-slate-200 bg-white focus:border-sky-500 focus:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
    }`

  const hasPaymentData = company.basePrice || company.vat || company.registrationFee || company.discount || company.advancePayment

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Company management
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Company Registration
            </h1>
            <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Register a new company along with vehicle and payment details in a single form.
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {submitSuccess && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle className="size-4 shrink-0" />
            Company registered successfully!
          </div>
        )}
        {submitError && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="size-4 shrink-0" />
            {submitError}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Left Column */}
          <div className="flex flex-col gap-6">

            {/* Company Details */}
            <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-slate-500" />
                  <CardTitle className="dark:text-white">Company Details</CardTitle>
                </div>
                <CardDescription className="dark:text-slate-400">
                  Business information and registration identifiers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div id="field-companyName" className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.companyName}
                      onChange={e => handleInputChange("companyName", e.target.value)}
                      onBlur={e => handleBlur("companyName", e.target.value)}
                      placeholder="Enter company name"
                      className={fieldClass("companyName")}
                    />
                    {getFieldError("companyName") && <p className="text-xs text-red-600">{getFieldError("companyName")}</p>}
                  </div>

                  <div id="field-companyAddress" className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Company Address <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.companyAddress}
                      onChange={e => handleInputChange("companyAddress", e.target.value)}
                      onBlur={e => handleBlur("companyAddress", e.target.value)}
                      placeholder="Enter company address"
                      className={fieldClass("companyAddress")}
                    />
                    {getFieldError("companyAddress") && <p className="text-xs text-red-600">{getFieldError("companyAddress")}</p>}
                  </div>

                  <div id="field-vatRegistrationNumber" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      VAT Registration No. <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.vatRegistrationNumber}
                      onChange={e => handleInputChange("vatRegistrationNumber", e.target.value)}
                      onBlur={e => handleBlur("vatRegistrationNumber", e.target.value)}
                      placeholder="VAT registration number"
                      className={fieldClass("vatRegistrationNumber")}
                    />
                    {getFieldError("vatRegistrationNumber") && <p className="text-xs text-red-600">{getFieldError("vatRegistrationNumber")}</p>}
                  </div>

                  <div id="field-brNumber" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      BR Number <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.brNumber}
                      onChange={e => handleInputChange("brNumber", e.target.value)}
                      onBlur={e => handleBlur("brNumber", e.target.value)}
                      placeholder="Business Registration Number"
                      className={fieldClass("brNumber")}
                    />
                    {getFieldError("brNumber") && <p className="text-xs text-red-600">{getFieldError("brNumber")}</p>}
                  </div>

                  <div id="field-companyContact" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Company Contact <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.companyContact}
                      onChange={e => handleInputChange("companyContact", e.target.value)}
                      onBlur={e => handleBlur("companyContact", e.target.value)}
                      placeholder="Enter contact number"
                      className={fieldClass("companyContact")}
                    />
                    {getFieldError("companyContact") && <p className="text-xs text-red-600">{getFieldError("companyContact")}</p>}
                  </div>

                  <div id="field-companyEmail" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Company Email <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="email"
                      value={company.companyEmail}
                      onChange={e => handleInputChange("companyEmail", e.target.value)}
                      onBlur={e => handleBlur("companyEmail", e.target.value)}
                      placeholder="Enter company email"
                      className={fieldClass("companyEmail")}
                    />
                    {getFieldError("companyEmail") && <p className="text-xs text-red-600">{getFieldError("companyEmail")}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Details */}
            <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Car className="size-4 text-slate-500" />
                  <CardTitle className="dark:text-white">Vehicle Details</CardTitle>
                </div>
                <CardDescription className="dark:text-slate-400">
                  Vehicle model, identifiers, and physical attributes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div id="field-vehicleModel" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Vehicle Model <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.vehicleModel}
                      onChange={e => handleInputChange("vehicleModel", e.target.value)}
                      onBlur={e => handleBlur("vehicleModel", e.target.value)}
                      placeholder="e.g., Toyota Corolla"
                      className={fieldClass("vehicleModel")}
                    />
                    {getFieldError("vehicleModel") && <p className="text-xs text-red-600">{getFieldError("vehicleModel")}</p>}
                  </div>

                  <div id="field-manuYear" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Manufactured Year <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="date"
                      value={company.manuYear}
                      onChange={e => handleInputChange("manuYear", e.target.value)}
                      onBlur={e => handleBlur("manuYear", e.target.value)}
                      className={fieldClass("manuYear")}
                    />
                    {getFieldError("manuYear") && <p className="text-xs text-red-600">{getFieldError("manuYear")}</p>}
                  </div>

                  <div id="field-color" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Vehicle Color <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.color}
                      onChange={e => handleInputChange("color", e.target.value)}
                      onBlur={e => handleBlur("color", e.target.value)}
                      placeholder="e.g., Red, Blue, Black"
                      className={fieldClass("color")}
                    />
                    {getFieldError("color") && <p className="text-xs text-red-600">{getFieldError("color")}</p>}
                  </div>

                  <div id="field-engineNumber" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Engine Number <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.engineNumber}
                      onChange={e => handleInputChange("engineNumber", e.target.value)}
                      onBlur={e => handleBlur("engineNumber", e.target.value)}
                      placeholder="Enter engine number"
                      className={fieldClass("engineNumber")}
                    />
                    {getFieldError("engineNumber") && <p className="text-xs text-red-600">{getFieldError("engineNumber")}</p>}
                  </div>

                  <div id="field-chasisNumber" className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Chassis Number <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={company.chasisNumber}
                      onChange={e => handleInputChange("chasisNumber", e.target.value)}
                      onBlur={e => handleBlur("chasisNumber", e.target.value)}
                      placeholder="Enter chassis number"
                      className={fieldClass("chasisNumber")}
                    />
                    {getFieldError("chasisNumber") && <p className="text-xs text-red-600">{getFieldError("chasisNumber")}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment */}
          <div className="flex flex-col gap-6">
            <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="size-4 text-slate-500" />
                  <CardTitle className="dark:text-white">Payment Details</CardTitle>
                </div>
                <CardDescription className="dark:text-slate-400">
                  Pricing breakdown, discounts, and payment method.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div id="field-paymentMethod" className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Payment Method <span className="text-red-500">*</span>
                  </Label>
                  <input
                    value={company.paymentMethod}
                    onChange={e => handleInputChange("paymentMethod", e.target.value)}
                    onBlur={e => handleBlur("paymentMethod", e.target.value)}
                    placeholder="e.g., Cash, Bank Transfer"
                    className={fieldClass("paymentMethod")}
                  />
                  {getFieldError("paymentMethod") && <p className="text-xs text-red-600">{getFieldError("paymentMethod")}</p>}
                </div>

                <div id="field-basePrice" className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Base Price (LKR) <span className="text-red-500">*</span>
                  </Label>
                  <input
                    type="number"
                    value={company.basePrice}
                    onChange={e => handleNumberChange("basePrice", e.target.value)}
                    onBlur={e => handleBlur("basePrice", e.target.value)}
                    placeholder="Enter base price"
                    className={fieldClass("basePrice")}
                  />
                  {getFieldError("basePrice") && <p className="text-xs text-red-600">{getFieldError("basePrice")}</p>}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div id="field-vat" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      VAT (LKR) <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="number"
                      value={company.vat}
                      onChange={e => handleNumberChange("vat", e.target.value)}
                      onBlur={e => handleBlur("vat", e.target.value)}
                      placeholder="VAT amount"
                      className={fieldClass("vat")}
                    />
                    {getFieldError("vat") && <p className="text-xs text-red-600">{getFieldError("vat")}</p>}
                  </div>

                  <div id="field-registrationFee" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Registration Fee (LKR) <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="number"
                      value={company.registrationFee}
                      onChange={e => handleNumberChange("registrationFee", e.target.value)}
                      onBlur={e => handleBlur("registrationFee", e.target.value)}
                      placeholder="Fee amount"
                      className={fieldClass("registrationFee")}
                    />
                    {getFieldError("registrationFee") && <p className="text-xs text-red-600">{getFieldError("registrationFee")}</p>}
                  </div>

                  <div id="field-discount" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Discount (LKR)</Label>
                    <input
                      type="number"
                      value={company.discount}
                      onChange={e => handleNumberChange("discount", e.target.value)}
                      onBlur={e => handleBlur("discount", e.target.value)}
                      placeholder="Discount amount"
                      className={fieldClass("discount")}
                    />
                    {getFieldError("discount") && <p className="text-xs text-red-600">{getFieldError("discount")}</p>}
                  </div>

                  <div id="field-advancePayment" className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Advance Payment (LKR) <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="number"
                      value={company.advancePayment}
                      onChange={e => handleNumberChange("advancePayment", e.target.value)}
                      onBlur={e => handleBlur("advancePayment", e.target.value)}
                      placeholder="Advance amount"
                      className={fieldClass("advancePayment")}
                    />
                    {getFieldError("advancePayment") && <p className="text-xs text-red-600">{getFieldError("advancePayment")}</p>}
                  </div>
                </div>

                {/* Payment Summary */}
                {hasPaymentData && (
                  <div className="mt-2 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payment Summary</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Subtotal</span>
                        <span className="font-medium text-slate-900 dark:text-white">LKR {calculateTotal().subtotal.toFixed(2)}</span>
                      </div>
                      {parseFloat(company.discount) > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Discount</span>
                          <span>− LKR {parseFloat(company.discount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900 dark:border-white/10 dark:text-white">
                        <span>Total Amount</span>
                        <span>LKR {calculateTotal().totalAfterDiscount.toFixed(2)}</span>
                      </div>
                      {parseFloat(company.advancePayment) > 0 && (
                        <>
                          <div className="flex justify-between text-sky-600 dark:text-sky-400">
                            <span>Advance Payment</span>
                            <span>− LKR {parseFloat(company.advancePayment).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-white/10">
                            <span className="text-slate-900 dark:text-white">Balance Due</span>
                            <span className={calculateTotal().balanceDue > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                              LKR {calculateTotal().balanceDue.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={isSubmitting || isValidating}
                    className="min-w-40"
                  >
                    {isSubmitting ? "Saving..." : "Register Company"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyRegistrationForm
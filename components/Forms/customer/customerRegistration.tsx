// CustomerRegistrationForm.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RegistrationData, DatabaseError } from "../../../lib/types/formTypes"
import insertData from "../../../app/api/customer/insertData"
import useDataValidation from "../../../lib/validations/customer/useCustomerDataValidation"
import { createClient } from "../../../lib/supabase/client"
import { CheckCircle, AlertCircle, User, Car, CircleDollarSign } from "lucide-react"

const CustomerRegistrationForm = () => {
  const [customer, setCustomer] = useState<RegistrationData>({
    firstName: "",
    lastName: "",
    address: "",
    phoneNumber: "",
    nic: "",
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
    balanceDue: "",
    paymentMethod: ""
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
  } = useDataValidation()

  const handleFormSubmit = async () => {
    setSubmitError(null)
    setSubmitSuccess(false)
    setIsSubmitting(true)

    try {
      const validationResult = await validateAll(customer)

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

      const error = await insertData(customer)

      if (error) {
        const dbError = error as DatabaseError
        if (dbError.message?.includes("duplicate") || dbError.code === "23505") {
          setSubmitError("One or more fields (Phone Number, NIC, Engine Number, or Chassis Number) already exist in our system. Please use unique values.")
          await validateAll(customer)
        } else {
          setSubmitError("Failed to save customer data. Please try again.")
        }
        setIsSubmitting(false)
        return
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        setCustomer({
          firstName: "", lastName: "", address: "", phoneNumber: "", nic: "",
          vehicleModel: "", manuYear: "", engineNumber: "", chasisNumber: "",
          color: "", basePrice: "", vat: "", registrationFee: "", discount: "",
          advancePayment: "", balanceDue: "", paymentMethod: ""
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

  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }))
    clearFieldError(field)
    setSubmitError(null)
  }

  const handleBlur = async (field: keyof RegistrationData, value: string) => {
    if (value) {
      const fieldErrors = validateField(field, value)
      if (fieldErrors.length > 0) {
        clearFieldError(field)
      } else {
        if (["phoneNumber", "nic", "engineNumber", "chasisNumber"].includes(field)) {
          const supabase = createClient()
          let table = "", column = ""
          if (field === "phoneNumber") { table = "Customers"; column = "phoneNumber" }
          else if (field === "nic") { table = "Customers"; column = "nic_no" }
          else if (field === "engineNumber") { table = "Vehicles"; column = "engineNumber" }
          else if (field === "chasisNumber") { table = "Vehicles"; column = "chassisNumber" }
          const { data } = await supabase.from(table).select(column).eq(column, value)
          if (data && data.length > 0) {
            console.log(`${field} already registered`)
          } else {
            clearFieldError(field)
          }
        } else {
          clearFieldError(field)
        }
      }
    }
  }

  const getFieldError = (field: keyof RegistrationData): string | undefined => errors[field]?.[0]

  const calculateTotal = () => {
    const basePrice = parseFloat(customer.basePrice) || 0
    const vat = parseFloat(customer.vat) || 0
    const registrationFee = parseFloat(customer.registrationFee) || 0
    const discount = parseFloat(customer.discount) || 0
    const advancePayment = parseFloat(customer.advancePayment) || 0
    const subtotal = basePrice + vat + registrationFee
    const totalAfterDiscount = subtotal - discount
    const balanceDue = totalAfterDiscount - advancePayment
    return { subtotal, totalAfterDiscount, balanceDue }
  }

  const handleNumberChange = (field: keyof RegistrationData, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }))
    setTimeout(() => {
      const { balanceDue } = calculateTotal()
      setCustomer(prev => ({ ...prev, balanceDue: balanceDue.toString() }))
    }, 0)
  }

  const fieldClass = (field: keyof RegistrationData) =>
    `h-11 rounded-xl border px-4 text-sm font-medium shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-4 focus:ring-sky-500/10 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-900 ${
      getFieldError(field)
        ? "border-red-400 bg-red-50 focus:border-red-500 dark:border-red-500 dark:bg-red-950/20"
        : "border-slate-200 bg-white focus:border-sky-500 focus:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
    }`

  const hasPaymentData = customer.basePrice || customer.vat || customer.registrationFee || customer.discount || customer.advancePayment

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Customer management
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Customer Registration
            </h1>
            <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Register a new customer along with vehicle and payment details in a single form.
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {submitSuccess && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle className="size-4 shrink-0" />
            Customer registered successfully!
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

            {/* Customer Details */}
            <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="size-4 text-slate-500" />
                  <CardTitle className="dark:text-white">Customer Details</CardTitle>
                </div>
                <CardDescription className="dark:text-slate-400">
                  Personal information and contact details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div id="field-firstName" className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="first_name"
                      value={customer.firstName}
                      onChange={e => handleInputChange("firstName", e.target.value)}
                      onBlur={e => handleBlur("firstName", e.target.value)}
                      placeholder="Enter first name"
                      className={fieldClass("firstName")}
                    />
                    {getFieldError("firstName") && <p className="text-xs text-red-600">{getFieldError("firstName")}</p>}
                  </div>

                  <div id="field-lastName" className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="last_name"
                      value={customer.lastName}
                      onChange={e => handleInputChange("lastName", e.target.value)}
                      onBlur={e => handleBlur("lastName", e.target.value)}
                      placeholder="Enter last name"
                      className={fieldClass("lastName")}
                    />
                    {getFieldError("lastName") && <p className="text-xs text-red-600">{getFieldError("lastName")}</p>}
                  </div>

                  <div id="field-address" className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Address <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="address"
                      value={customer.address}
                      onChange={e => handleInputChange("address", e.target.value)}
                      onBlur={e => handleBlur("address", e.target.value)}
                      placeholder="Enter full address"
                      className={fieldClass("address")}
                    />
                    {getFieldError("address") && <p className="text-xs text-red-600">{getFieldError("address")}</p>}
                  </div>

                  <div id="field-phoneNumber" className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="phone"
                      value={customer.phoneNumber}
                      onChange={e => handleInputChange("phoneNumber", e.target.value)}
                      onBlur={e => handleBlur("phoneNumber", e.target.value)}
                      placeholder="Enter phone number"
                      className={fieldClass("phoneNumber")}
                    />
                    {getFieldError("phoneNumber") && <p className="text-xs text-red-600">{getFieldError("phoneNumber")}</p>}
                  </div>

                  <div id="field-nic" className="space-y-2">
                    <Label htmlFor="nic" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      NIC Number <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="nic"
                      value={customer.nic}
                      onChange={e => handleInputChange("nic", e.target.value)}
                      onBlur={e => handleBlur("nic", e.target.value)}
                      placeholder="Enter NIC number"
                      className={fieldClass("nic")}
                    />
                    {getFieldError("nic") && <p className="text-xs text-red-600">{getFieldError("nic")}</p>}
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
                      value={customer.vehicleModel}
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
                      value={customer.manuYear}
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
                      value={customer.color}
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
                      value={customer.engineNumber}
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
                      value={customer.chasisNumber}
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
                    value={customer.paymentMethod}
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
                    value={customer.basePrice}
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
                      value={customer.vat}
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
                      value={customer.registrationFee}
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
                      value={customer.discount}
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
                      value={customer.advancePayment}
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
                      {parseFloat(customer.discount) > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Discount</span>
                          <span>− LKR {parseFloat(customer.discount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900 dark:border-white/10 dark:text-white">
                        <span>Total Amount</span>
                        <span>LKR {calculateTotal().totalAfterDiscount.toFixed(2)}</span>
                      </div>
                      {parseFloat(customer.advancePayment) > 0 && (
                        <>
                          <div className="flex justify-between text-sky-600 dark:text-sky-400">
                            <span>Advance Payment</span>
                            <span>− LKR {parseFloat(customer.advancePayment).toFixed(2)}</span>
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
                    {isSubmitting ? "Saving..." : "Register Customer"}
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

export default CustomerRegistrationForm
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  X,
  Bike,
  Wrench,
  PackageOpen,
  CircleDollarSign,
  RefreshCw,
  ChevronDown,
  Loader2,
  Eye,
  MapPin,
  Hash,
  Palette,
  Calendar,
  Tag,
  Info,
  Building2,
  User
} from "lucide-react";
import PaginationControls from "@/components/ui/pagination-controls";
import { createClient } from "@/lib/supabase/client";
import AppLoading from "@/components/feedback/app-loading";

// Update your types at the top of the page
type VehicleInventoryItem = {
  id: string;
  model_code: string;
  model_name: string;
  make: string;
  engine_capacity: string;
  bike_category: string;
  engine_number: string;
  chassis_number: string;
  color: string;
  yom: string;
  version: string;
  status: string;
  price: number;
  created_at: string;
  issued_to?: string;
  issued_to_name?: string | null;
  issued_to_type?: string | null;
  model_price?: number | null;
  model_arrived_quantity?: number;
  model_warehouse_quantity?: number;
};

type SpareInventoryItem = {
  id: string;
  model_code: string;
  model_name: string;
  spare_code: string;
  spare_name: string;
  serial_number: string;
  status: string;
  price: number;
  created_at: string;
  issued_to?: string;
  issued_to_name?: string | null;
  issued_to_type?: string | null;
  spare_price?: number | null;
  spare_arrived_quantity?: number;
  spare_warehouse_quantity?: number;
};

type VehicleModel = {
  model_code: string;
  model_name: string;
};

// Helper function to safely parse price
function parsePrice(price: any): number {
  if (price === null || price === undefined) return 0;
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    const cleaned = price.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default function InventoryDataPage() {
  const [dataType, setDataType] = useState<"vehicles" | "spares">("vehicles");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [vehicles, setVehicles] = useState<VehicleInventoryItem[]>([]);
  const [spares, setSpares] = useState<SpareInventoryItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VehicleInventoryItem | SpareInventoryItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const pageSize = 15;
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset pagination and values when data type changes
  useEffect(() => {
    setCurrentPage(1);
    setTotalValue(0);
    setTotalItems(0);
    setVehicles([]);
    setSpares([]);
  }, [dataType]);

  // Debounce search term
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setSearching(true);

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setSearching(false);
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Load models for filter dropdown
  useEffect(() => {
    async function loadModels() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/warehouse/models", {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const data = await res.json();
        setModels(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    }
    loadModels();
  }, []);

  // Load categories from vehicles
  useEffect(() => {
    async function loadCategories() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .schema('warehouse')
          .from('vehicle_inventory')
          .select('bike_category')
          .not('bike_category', 'is', null)
          .not('bike_category', 'eq', '');

        if (!error && data) {
          const uniqueCategories = [...new Set(data.map(item => item.bike_category).filter(Boolean))];
          setCategories(uniqueCategories as string[]);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    }
    loadCategories();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    void fetchInventoryData();
  }, [dataType, selectedModel, selectedCategory, debouncedSearchTerm, currentPage]);

  async function fetchInventoryData() {
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const params = new URLSearchParams();
      params.append('type', dataType);
      if (selectedModel) params.append('modelCode', selectedModel);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (selectedCategory && dataType === 'vehicles' && selectedCategory) {
        params.append('category', selectedCategory);
      }
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());

      const res = await fetch(`/api/warehouse/combined-inventory?${params.toString()}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      const data = await res.json();

      if (dataType === 'vehicles') {
        const items = (data.vehicles?.items || []).map((item: any) => ({
          ...item,
          price: parsePrice(item.price)
        }));
        const total = data.vehicles?.total || 0;
        const value = data.vehicles?.totalValue || 0;

        setVehicles(items);
        setTotalItems(total);
        setTotalPages(Math.ceil(total / pageSize));
        setTotalValue(value);
      } else {
        const items = (data.spares?.items || []).map((item: any) => ({
          ...item,
          price: parsePrice(item.price)
        }));
        const total = data.spares?.total || 0;
        const value = data.spares?.totalValue || 0;

        setSpares(items);
        setTotalItems(total);
        setTotalPages(Math.ceil(total / pageSize));
        setTotalValue(value);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }

  function handleSearch() {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setDebouncedSearchTerm(searchTerm);
    setCurrentPage(1);
  }

  function handleResetFilters() {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedModel("");
    setSelectedCategory("");
    setCurrentPage(1);
  }

  function handleViewDetails(item: VehicleInventoryItem | SpareInventoryItem) {
    setSelectedItem(item);
    setShowDetailsModal(true);
  }

  function formatNumber(value: number) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Calculate summary stats based on current data type
  const summaryStats = useMemo(() => {
    if (dataType === 'vehicles') {
      const uniqueModels = new Set(vehicles.map(v => v.model_code)).size;

      return {
        totalUnits: totalItems,
        totalValue: totalValue,
        uniqueCount: uniqueModels,
        uniqueLabel: 'Models'
      };
    } else {
      const uniqueSpares = new Set(spares.map(s => s.spare_code)).size;

      return {
        totalUnits: totalItems,
        totalValue: totalValue,
        uniqueCount: uniqueSpares,
        uniqueLabel: 'Spare Types'
      };
    }
  }, [vehicles, spares, dataType, totalItems, totalValue]);

  if (initialLoad && loading) {
    return <AppLoading />;
  }

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto max-w-7xl flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Badge variant="outline" className="w-fit border-slate-300 dark:border-slate-700">
                Inventory Management
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Inventory Data
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Search and manage vehicle and spare parts inventory
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => void fetchInventoryData()}
              disabled={loading}
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-sky-200/60 bg-gradient-to-br from-white to-sky-50/50 dark:from-slate-900/60 dark:to-sky-950/20">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Total {dataType === 'vehicles' ? 'Vehicles' : 'Spare Units'}
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-sky-100 p-2.5 dark:bg-sky-500/20">
                  {dataType === 'vehicles' ? (
                    <Bike className="size-6 text-sky-600 dark:text-sky-400" />
                  ) : (
                    <Wrench className="size-6 text-sky-600 dark:text-sky-400" />
                  )}
                </div>
                {formatNumber(summaryStats.totalUnits)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-green-200/60 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-900/60 dark:to-green-950/20">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Total Value
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-green-100 p-2.5 dark:bg-green-500/20">
                  <CircleDollarSign className="size-6 text-green-600 dark:text-green-400" />
                </div>
                {formatNumber(summaryStats.totalValue)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-purple-200/60 bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-900/60 dark:to-purple-950/20">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Unique {summaryStats.uniqueLabel}
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-purple-100 p-2.5 dark:bg-purple-500/20">
                  <PackageOpen className="size-6 text-purple-600 dark:text-purple-400" />
                </div>
                {formatNumber(summaryStats.uniqueCount)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="dark:bg-slate-900/60 dark:border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-white">Search Inventory</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Filter and search through your inventory
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="size-4 mr-2" />
                Filters
                <ChevronDown className={`size-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={dataType === 'vehicles' ? 'default' : 'outline'}
                onClick={() => {
                  setDataType('vehicles');
                  setCurrentPage(1);
                }}
              >
                <Bike className="size-4 mr-2" />
                Vehicles
              </Button>
              <Button
                type="button"
                variant={dataType === 'spares' ? 'default' : 'outline'}
                onClick={() => {
                  setDataType('spares');
                  setCurrentPage(1);
                }}
              >
                <Wrench className="size-4 mr-2" />
                Spare Parts
              </Button>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder={dataType === 'vehicles'
                    ? "Search by engine number, chassis number, model name..."
                    : "Search by serial number, spare name..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dark:border-white/10 dark:bg-slate-950/60 pr-10"
                />
                {(searching || loading) && searchTerm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="size-4 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="size-4 mr-2" />
                Search
              </Button>
            </div>

            {searchTerm && debouncedSearchTerm !== searchTerm && (
              <p className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                Typing... search will update automatically
              </p>
            )}

            {showFilters && (
              <div className="grid gap-4 pt-4 border-t border-slate-200 dark:border-white/10 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Model</Label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  >
                    <option value="">All Models</option>
                    {models.map((model) => (
                      <option key={model.model_code} value={model.model_code}>
                        {model.model_name} ({model.model_code})
                      </option>
                    ))}
                  </select>
                </div>

                {dataType === 'vehicles' && categories.length > 0 && (
                  <div className="space-y-2">
                    <Label className="dark:text-slate-300">Category</Label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(selectedModel || selectedCategory || searchTerm) && (
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={handleResetFilters}>
                      <X className="size-4 mr-2" />
                      Reset Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="dark:bg-slate-900/60 dark:border-white/10">
          <CardHeader>
            <CardTitle className="dark:text-white">
              {dataType === 'vehicles' ? 'Vehicle Inventory' : 'Spare Parts Inventory'}
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              {loading ? "Loading..." : `${totalItems} ${dataType === 'vehicles' ? 'vehicles' : 'spare units'} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-sky-600" />
              </div>
            ) : dataType === 'vehicles' ? (
              <VehicleInventoryTable
                vehicles={vehicles}
                formatNumber={formatNumber}
                onViewDetails={handleViewDetails}
              />
            ) : (
              <SpareInventoryTable
                spares={spares}
                formatNumber={formatNumber}
                onViewDetails={handleViewDetails}
              />
            )}

            {totalItems > 0 && !loading && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItemsLabel={`${totalItems} total items`}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedItem && (
        <DetailsModal
          item={selectedItem}
          type={dataType}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedItem(null);
          }}
          formatNumber={formatNumber}
        />
      )}
    </div>
  );
}

// Compact Vehicle Table Component
function VehicleInventoryTable({
  vehicles,
  formatNumber,
  onViewDetails
}: {
  vehicles: VehicleInventoryItem[];
  formatNumber: (value: number) => string;
  onViewDetails: (item: VehicleInventoryItem) => void;
}) {
  if (vehicles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700">
        No vehicles found matching your criteria.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Model</th>
            <th className="px-3 py-2 font-medium">Engine No</th>
            <th className="px-3 py-2 font-medium">Chassis No</th>
            <th className="px-3 py-2 font-medium">Color</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium text-right">Price</th>
            <th className="px-3 py-2 font-medium text-center">Actions</th>
           </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr
              key={vehicle.id}
              className="bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800/70"
            >
              <td className="rounded-l-2xl px-3 py-3">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {vehicle.model_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {vehicle.model_code}
                </p>
               </td>
              <td className="px-3 py-3 font-mono text-xs">{vehicle.engine_number}</td>
              <td className="px-3 py-3 font-mono text-xs">{vehicle.chassis_number}</td>
              <td className="px-3 py-3">{vehicle.color || "-"}</td>
              <td className="px-3 py-3">
                <Badge variant={vehicle.status === 'available' ? 'default' : 'secondary'}>
                  {vehicle.status}
                </Badge>
               </td>
              <td className="px-3 py-3 text-right font-medium text-slate-900 dark:text-white">
                {formatNumber(vehicle.price)}
               </td>
              <td className="rounded-r-2xl px-3 py-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(vehicle)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
               </td>
             </tr>
          ))}
        </tbody>
       </table>
    </div>
  );
}

// Compact Spare Table Component
function SpareInventoryTable({
  spares,
  formatNumber,
  onViewDetails
}: {
  spares: SpareInventoryItem[];
  formatNumber: (value: number) => string;
  onViewDetails: (item: SpareInventoryItem) => void;
}) {
  if (spares.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700">
        No spare parts found matching your criteria.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Spare Name</th>
            <th className="px-3 py-2 font-medium">Spare Code</th>
            <th className="px-3 py-2 font-medium">Serial Number</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium text-right">Price</th>
            <th className="px-3 py-2 font-medium text-center">Actions</th>
           </tr>
        </thead>
        <tbody>
          {spares.map((spare) => (
            <tr
              key={spare.id}
              className="bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800/70"
            >
              <td className="rounded-l-2xl px-3 py-3">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {spare.spare_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {spare.model_name} ({spare.model_code})
                </p>
               </td>
              <td className="px-3 py-3 font-mono text-xs">{spare.spare_code}</td>
              <td className="px-3 py-3 font-mono text-xs">{spare.serial_number}</td>
              <td className="px-3 py-3">
                <Badge variant={spare.status === 'available' ? 'default' : 'secondary'}>
                  {spare.status}
                </Badge>
               </td>
              <td className="px-3 py-3 text-right font-medium text-slate-900 dark:text-white">
                {formatNumber(spare.price)}
               </td>
              <td className="rounded-r-2xl px-3 py-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(spare)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
               </td>
             </tr>
          ))}
        </tbody>
       </table>
    </div>
  );
}

// Details Modal Component
function DetailsModal({
  item,
  type,
  onClose,
  formatNumber
}: {
  item: VehicleInventoryItem | SpareInventoryItem;
  type: "vehicles" | "spares";
  onClose: () => void;
  formatNumber: (value: number) => string;
}) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {type === 'vehicles' ? (
              <Bike className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            ) : (
              <Wrench className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            )}
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {type === 'vehicles' ? 'Vehicle Details' : 'Spare Part Details'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {type === 'vehicles' ? (
            <VehicleDetailsModalContent item={item as VehicleInventoryItem} formatNumber={formatNumber} />
          ) : (
            <SpareDetailsModalContent item={item as SpareInventoryItem} formatNumber={formatNumber} />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-slate-900">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// Vehicle Details Content
function VehicleDetailsModalContent({
  item,
  formatNumber
}: {
  item: VehicleInventoryItem;
  formatNumber: (value: number) => string;
}) {
  // Group details into sections
  const vehicleInfo = [
    { label: "Model Name", value: item.model_name, icon: Tag },
    { label: "Model Code", value: item.model_code, icon: Hash },
    { label: "Make", value: item.make || "-", icon: Building2 },
    { label: "Engine Capacity", value: item.engine_capacity ? `${item.engine_capacity} CC` : "-", icon: Bike },
    { label: "Category", value: item.bike_category || "-", icon: PackageOpen },
    { label: "Year of Manufacture", value: item.yom || "-", icon: Calendar },
    { label: "Color", value: item.color || "-", icon: Palette },
    { label: "Description", value: item.version || "-", icon: Info },
  ];

  const identificationInfo = [
    { label: "Engine Number", value: item.engine_number, icon: Hash, highlight: true },
    { label: "Chassis Number", value: item.chassis_number, icon: Hash, highlight: true },
  ];

  const statusInfo = [
    { label: "Status", value: item.status, icon: Tag },
    { label: "Issued To", value: item.issued_to_name || "Warehouse", icon: MapPin },
    { label: "Issued Type", value: item.issued_to_type || "N/A", icon: User },
  ];

  const financialInfo = [
    { label: "Unit Price", value: `Rs. ${formatNumber(item.price)}`, icon: CircleDollarSign }
  ];

  const inventoryInfo = [
    { label: "Model Arrived Quantity", value: item.model_arrived_quantity?.toString() || "0", icon: PackageOpen },
    { label: "Model Warehouse Quantity", value: item.model_warehouse_quantity?.toString() || "0", icon: PackageOpen },
  ];

  const auditInfo = [
    { label: "Added On", value: new Date(item.created_at).toLocaleString(), icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Vehicle Information Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Bike className="h-4 w-4" />
          Vehicle Information
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {vehicleInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {detail.label}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white break-all">
                  {detail.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Identification Numbers Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Identification Numbers
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {identificationInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  detail.highlight 
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20'
                    : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {detail.label}
                  </p>
                </div>
                <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white break-all">
                  {detail.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status & Issuance Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Status & Issuance
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {statusInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {detail.label}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {detail.label === "Status" ? (
                    <Badge variant={detail.value === 'available' ? 'default' : 'secondary'} className="mt-1">
                      {detail.value}
                    </Badge>
                  ) : (
                    detail.value
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Information Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4" />
          Financial Information
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {financialInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-500/30 dark:bg-green-950/20"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                    {detail.label}
                  </p>
                </div>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">
                  {detail.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory Information Section */}
      {item.model_arrived_quantity !== undefined && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <PackageOpen className="h-4 w-4" />
            Inventory Information
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {inventoryInfo.map((detail, index) => {
              const Icon = detail.icon;
              return (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {detail.label}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {detail.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Information Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Audit Information
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {auditInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {detail.label}
                  </p>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {detail.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Spare Details Content
function SpareDetailsModalContent({
  item,
  formatNumber
}: {
  item: SpareInventoryItem;
  formatNumber: (value: number) => string;
}) {
  // Group details into sections
  const spareInfo = [
    { label: "Spare Name", value: item.spare_name, icon: Tag },
    { label: "Spare Code", value: item.spare_code, icon: Hash },
    { label: "Model Name", value: item.model_name, icon: Bike },
    { label: "Model Code", value: item.model_code, icon: Hash },
    { label: "Serial Number", value: item.serial_number, icon: Hash, highlight: true },
  ];

  const statusInfo = [
    { label: "Status", value: item.status, icon: Tag },
    { label: "Issued To", value: item.issued_to_name || "Warehouse", icon: MapPin },
    { label: "Issued Type", value: item.issued_to_type || "N/A", icon: User },
  ];

  const financialInfo = [
    { label: "Unit Price", value: `Rs. ${formatNumber(item.price)}`, icon: CircleDollarSign },
  ];

  const inventoryInfo = [
    { label: "Spare Arrived Quantity", value: item.spare_arrived_quantity?.toString() || "0", icon: PackageOpen },
    { label: "Spare Warehouse Quantity", value: item.spare_warehouse_quantity?.toString() || "0", icon: PackageOpen },
  ];

  const auditInfo = [
    { label: "Added On", value: new Date(item.created_at).toLocaleString(), icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Spare Information Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Spare Information
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {spareInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  detail.highlight 
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20'
                    : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {detail.label}
                  </p>
                </div>
                <p className={`text-sm font-semibold text-slate-900 dark:text-white break-all ${
                  detail.highlight ? 'font-mono' : ''
                }`}>
                  {detail.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status & Issuance Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Status & Issuance
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {statusInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {detail.label}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {detail.label === "Status" ? (
                    <Badge variant={detail.value === 'available' ? 'default' : 'secondary'} className="mt-1">
                      {detail.value}
                    </Badge>
                  ) : (
                    detail.value
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Information Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4" />
          Financial Information
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {financialInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-500/30 dark:bg-green-950/20"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                    {detail.label}
                  </p>
                </div>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">
                  {detail.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory Information Section */}
      {item.spare_arrived_quantity !== undefined && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <PackageOpen className="h-4 w-4" />
            Inventory Information
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {inventoryInfo.map((detail, index) => {
              const Icon = detail.icon;
              return (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {detail.label}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {detail.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Information Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Audit Information
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {auditInfo.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {detail.label}
                  </p>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {detail.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
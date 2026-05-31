// app/api/warehouse/combined-inventory/route.ts
import { requireAdminRoute } from '@/lib/auth/require-admin-route'
import { getSupabaseAdmin} from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  
  const type = searchParams.get('type')
  const modelCode = searchParams.get('modelCode')
  const searchTerm = searchParams.get('search')
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '15')

  try {
    const authError = await requireAdminRoute()
    if (authError) return authError;
    
    const results: any = {}

    // Helper function to parse price safely
    function parsePrice(price: any): number {
      if (price === null || price === undefined) return 0
      if (typeof price === 'number') return price
      if (typeof price === 'string') {
        const cleaned = price.replace(/[^0-9.-]/g, '')
        const parsed = parseFloat(cleaned)
        return isNaN(parsed) ? 0 : parsed
      }
      return 0
    }

    // Fetch vehicles if needed
    if (type === 'vehicles' || type === 'all') {
      // First, get the paginated vehicles
      let vehicleQuery = supabase
        .schema('warehouse')
        .from('vehicle_inventory')
        .select('*', { count: 'exact' })

      if (modelCode) vehicleQuery = vehicleQuery.eq('model_code', modelCode)
      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`
        vehicleQuery = vehicleQuery.or(`engine_number.ilike.${term},chassis_number.ilike.${term},model_name.ilike.${term},make.ilike.${term}`)
      }
      if (category && category.trim() && category !== '') {
        vehicleQuery = vehicleQuery.eq('bike_category', category)
      }

      const { data: vehicles, count, error } = await vehicleQuery
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Get all unique model codes from vehicles to fetch model names
      const modelCodes = [...new Set((vehicles || [])
        .map(v => v.model_code)
        .filter(code => code)
      )]
      
      // Fetch model names from vehicle_model_codes
      let modelNamesMap = new Map()
      if (modelCodes.length > 0) {
        const { data: models } = await supabase
          .schema('warehouse')
          .from('vehicle_model_codes')
          .select('model_code, model_name, price, arrived_quantity, warehouse_quantity')
          .in('model_code', modelCodes)
        
        if (models) {
          models.forEach(model => {
            modelNamesMap.set(model.model_code, {
              model_name: model.model_name,
              model_price: model.price,
              arrived_quantity: model.arrived_quantity,
              warehouse_quantity: model.warehouse_quantity
            })
          })
        }
      }
      
      // Get all unique issued_to IDs from the vehicles
      const issuedToIds = [...new Set((vehicles || [])
        .map(v => v.issued_to)
        .filter(id => id)
      )]
      
      // Fetch all showrooms and dealers in one go
      let issuedToMap = new Map()
      
      if (issuedToIds.length > 0) {
        // Fetch from showrooms
        const { data: showrooms } = await supabase
          .schema('asb_showrooms')
          .from('asb_showrooms')
          .select('id, name')
          .in('id', issuedToIds)
        
        if (showrooms) {
          showrooms.forEach(s => {
            issuedToMap.set(s.id, { name: s.name, type: 'showroom' })
          })
        }
        
        // Fetch remaining IDs from dealers
        const remainingIds = issuedToIds.filter(id => !issuedToMap.has(id))
        if (remainingIds.length > 0) {
          const { data: dealers } = await supabase
            .schema('asb_showrooms')
            .from('dealers')
            .select('id, name')
            .in('id', remainingIds)
          
          if (dealers) {
            dealers.forEach(d => {
              issuedToMap.set(d.id, { name: d.name, type: 'dealer' })
            })
          }
        }
      }
      
      // Calculate total value
      let totalValueQuery = supabase
        .schema('warehouse')
        .from('vehicle_inventory')
        .select('price')

      if (modelCode) totalValueQuery = totalValueQuery.eq('model_code', modelCode)
      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`
        totalValueQuery = totalValueQuery.or(`engine_number.ilike.${term},chassis_number.ilike.${term}`)
      }
      if (category && category.trim() && category !== '') {
        totalValueQuery = totalValueQuery.eq('bike_category', category)
      }

      const { data: allPrices, error: priceError } = await totalValueQuery
      
      let totalValue = 0
      if (!priceError && allPrices && allPrices.length > 0) {
        totalValue = allPrices.reduce((sum, item) => {
          const price = parsePrice(item.price)
          return sum + price
        }, 0)
      }
      
      // Process vehicles with model names and issued_to names
      const parsedVehicles = (vehicles || []).map(vehicle => {
        const issuedToInfo = vehicle.issued_to ? issuedToMap.get(vehicle.issued_to) : null
        const modelInfo = modelNamesMap.get(vehicle.model_code)
        
        return {
          ...vehicle,
          model_name: modelInfo?.model_name || vehicle.model_name || vehicle.model_code,
          model_price: modelInfo?.model_price || null,
          model_arrived_quantity: modelInfo?.arrived_quantity || 0,
          model_warehouse_quantity: modelInfo?.warehouse_quantity || 0,
          price: parsePrice(vehicle.price),
          issued_to_name: issuedToInfo?.name || null,
          issued_to_type: issuedToInfo?.type || null
        }
      })
      
      results.vehicles = { 
        items: parsedVehicles, 
        total: count || 0,
        totalValue: totalValue
      }
    }

    // Fetch spares if needed
    if (type === 'spares' || type === 'all') {
      // First, get the paginated spares
      let spareQuery = supabase
        .schema('warehouse')
        .from('vehicle_spare_inventory')
        .select('*', { count: 'exact' })

      if (modelCode) spareQuery = spareQuery.eq('model_code', modelCode)
      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`
        spareQuery = spareQuery.or(`serial_number.ilike.${term},spare_name.ilike.${term}`)
      }

      const { data: spares, count, error } = await spareQuery
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Get all unique model codes from spares to fetch model names
      const modelCodes = [...new Set((spares || [])
        .map(s => s.model_code)
        .filter(code => code)
      )]
      
      // Get all unique spare codes to fetch spare names
      const spareCodes = [...new Set((spares || [])
        .map(s => s.spare_code)
        .filter(code => code)
      )]
      
      // Fetch model names from vehicle_model_codes
      let modelNamesMap = new Map()
      if (modelCodes.length > 0) {
        const { data: models } = await supabase
          .schema('warehouse')
          .from('vehicle_model_codes')
          .select('model_code, name')
          .in('model_code', modelCodes)
        
        if (models) {
          models.forEach(model => {
            modelNamesMap.set(model.model_code, model.name)
          })
        }
      }
      
      // Fetch spare names from vehicle_spare_codes
      let spareNamesMap = new Map()
      if (spareCodes.length > 0) {
        const { data: sparesCatalog } = await supabase
          .schema('warehouse')
          .from('vehicle_spare_codes')
          .select('spare_code, spare_name, price, arrived_quantity, warehouse_quantity')
          .in('spare_code', spareCodes)
        
        if (sparesCatalog) {
          sparesCatalog.forEach(spare => {
            spareNamesMap.set(spare.spare_code, {
              spare_name: spare.spare_name,
              spare_price: spare.price,
              arrived_quantity: spare.arrived_quantity,
              warehouse_quantity: spare.warehouse_quantity
            })
          })
        }
      }
      
      // Get all unique issued_to IDs from the spares
      const issuedToIds = [...new Set((spares || [])
        .map(s => s.issued_to)
        .filter(id => id)
      )]
      
      // Fetch all showrooms and dealers in one go
      let issuedToMap = new Map()
      
      if (issuedToIds.length > 0) {
        // Fetch from showrooms
        const { data: showrooms } = await supabase
          .schema('asb_showrooms')
          .from('asb_showrooms')
          .select('id, name')
          .in('id', issuedToIds)
        
        if (showrooms) {
          showrooms.forEach(s => {
            issuedToMap.set(s.id, { name: s.name, type: 'showroom' })
          })
        }
        
        // Fetch remaining IDs from dealers
        const remainingIds = issuedToIds.filter(id => !issuedToMap.has(id))
        if (remainingIds.length > 0) {
          const { data: dealers } = await supabase
            .schema('asb_showrooms')
            .from('dealers')
            .select('id, name')
            .in('id', remainingIds)
          
          if (dealers) {
            dealers.forEach(d => {
              issuedToMap.set(d.id, { name: d.name, type: 'dealer' })
            })
          }
        }
      }
      
      // Calculate total value
      let totalValueQuery = supabase
        .schema('warehouse')
        .from('vehicle_spare_inventory')
        .select('price')

      if (modelCode) totalValueQuery = totalValueQuery.eq('model_code', modelCode)
      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`
        totalValueQuery = totalValueQuery.or(`serial_number.ilike.${term}`)
      }

      const { data: allPrices, error: priceError } = await totalValueQuery
      
      let totalValue = 0
      if (!priceError && allPrices && allPrices.length > 0) {
        totalValue = allPrices.reduce((sum, item) => {
          const price = parsePrice(item.price)
          return sum + price
        }, 0)
      }
      
      // Process spares with model names, spare names, and issued_to names
      const parsedSpares = (spares || []).map(spare => {
        const issuedToInfo = spare.issued_to ? issuedToMap.get(spare.issued_to) : null
        const modelName = modelNamesMap.get(spare.model_code)
        const spareInfo = spareNamesMap.get(spare.spare_code)
        
        return {
          ...spare,
          model_name: modelName || spare.model_code,
          spare_name: spareInfo?.spare_name || spare.spare_name || spare.spare_code,
          spare_price: spareInfo?.spare_price || null,
          spare_arrived_quantity: spareInfo?.arrived_quantity || 0,
          spare_warehouse_quantity: spareInfo?.warehouse_quantity || 0,
          price: parsePrice(spare.price),
          issued_to_name: issuedToInfo?.name || null,
          issued_to_type: issuedToInfo?.type || null
        }
      })
      
      results.spares = { 
        items: parsedSpares, 
        total: count || 0,
        totalValue: totalValue
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory data' },
      { status: 500 }
    )
  }
}
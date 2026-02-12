"use client"

import { useState, useEffect } from "react"
import { MapPin, Clock, Star, Phone, Loader2, Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface StoreData {
  id: string
  name: string
  address: string
  distance: string
  rating: number
  reviews: number
  open: boolean
  phone: string
  hours: string
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStores() {
      try {
        const response = await fetch('/api/shops')
        if (!response.ok) throw new Error('Failed to fetch stores')
        const data = await response.json()
        const transformedStores = data.shops.map((shop: any) => ({
          id: shop._id,
          name: shop.name,
          address: shop.address || 'Address not available',
          distance: '0.5 km', // Would need geolocation for real distance
          rating: 4.5,
          reviews: 0,
          open: true,
          phone: shop.phone || 'N/A',
          hours: '9 AM - 9 PM'
        }))
        setStores(transformedStores)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stores')
      } finally {
        setLoading(false)
      }
    }
    fetchStores()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-destructive mb-2">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-primary underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Nearby Medical Stores</h2>
        <p className="text-muted-foreground">Find verified medical stores close to your location.</p>
      </div>

      {/* Map placeholder */}
      <Card className="border bg-card overflow-hidden">
        <div className="flex h-48 items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <MapPin className="h-8 w-8" />
            <span className="text-sm font-medium">Map View</span>
            <span className="text-xs">Interactive map would appear here</span>
          </div>
        </div>
      </Card>

      {stores.length === 0 ? (
        <Card className="border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium text-card-foreground">No stores found nearby</p>
            <p className="text-sm text-muted-foreground">Try adjusting your location or check back later</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {stores.map((store) => (
            <Card key={store.id} className="border bg-card transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-card-foreground">{store.name}</h3>
                      <Badge
                        variant="secondary"
                        className={store.open ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}
                      >
                        {store.open ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{store.address}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {store.distance}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-chart-4" />
                    {store.rating} ({store.reviews})
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {store.hours}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {store.phone}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm">View Store</Button>
                  <Button size="sm" variant="outline">Get Directions</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

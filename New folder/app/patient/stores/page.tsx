"use client"

import { useState, useEffect, useCallback } from "react"
import { MapPin, Clock, Star, Phone, Loader2, Store, Navigation, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DynamicMap from "@/components/ui/dynamic-map"
import type { MapMarker } from "@/components/ui/map"

interface StoreData {
  id: string
  name: string
  shopName: string
  address: string
  distance: string | null
  distanceValue: number | null
  rating: number
  reviews: number
  open: boolean
  phone: string
  hours: string
  location: {
    lat: number
    lng: number
  } | null
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([])
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  const fetchStores = useCallback(async (lat?: number, lng?: number) => {
    setLoading(true)
    try {
      let url = '/api/shops'
      if (lat !== undefined && lng !== undefined) {
        url += `?lat=${lat}&lng=${lng}&maxDistance=50`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch stores')
      const data = await response.json()
      
      const transformedStores: StoreData[] = data.shops.map((shop: any) => ({
        id: shop.id,
        name: shop.name,
        shopName: shop.shopName || shop.name,
        address: shop.shopAddress || 'Address not available',
        distance: shop.distance || null,
        distanceValue: shop.distanceValue || null,
        rating: 4.5,
        reviews: Math.floor(Math.random() * 100),
        open: true,
        phone: shop.phone || 'N/A',
        hours: '9 AM - 9 PM',
        location: shop.location,
      }))
      
      setStores(transformedStores)
      
      // Create map markers
      const markers: MapMarker[] = transformedStores
        .filter((store) => store.location)
        .map((store) => ({
          id: store.id,
          lat: store.location!.lat,
          lng: store.location!.lng,
          title: store.shopName || store.name,
          description: store.address,
          isShop: true,
        }))
      
      setMapMarkers(markers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stores')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        fetchStores(latitude, longitude)
        setGettingLocation(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setError("Unable to get your location")
        setGettingLocation(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const openInGoogleMaps = (store: StoreData) => {
    if (store.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${store.location.lat},${store.location.lng}`
      window.open(url, '_blank')
    }
  }

  const getMapCenter = (): [number, number] => {
    if (selectedStore) {
      const store = stores.find((s) => s.id === selectedStore)
      if (store?.location) {
        return [store.location.lat, store.location.lng]
      }
    }
    if (userLocation) {
      return [userLocation.lat, userLocation.lng]
    }
    // Default to first store location or Mumbai
    if (stores.length > 0 && stores[0].location) {
      return [stores[0].location.lat, stores[0].location.lng]
    }
    return [19.0760, 72.8777] // Mumbai default
  }

  if (loading && stores.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Nearby Medical Stores</h2>
          <p className="text-muted-foreground">Find verified medical stores close to your location.</p>
        </div>
        <Button 
          onClick={handleGetLocation} 
          disabled={gettingLocation}
          variant="outline"
        >
          {gettingLocation ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          {userLocation ? "Update Location" : "Find Nearby Stores"}
        </Button>
      </div>

      {/* Interactive Map */}
      <Card className="border bg-card overflow-hidden">
        <div className="h-[350px]">
          <DynamicMap
            center={getMapCenter()}
            zoom={userLocation ? 14 : 12}
            markers={mapMarkers}
            showUserLocation={!!userLocation}
          />
        </div>
      </Card>

      {error && (
        <div className="text-center p-4 bg-destructive/10 rounded-lg">
          <p className="text-destructive">{error}</p>
          <Button 
            variant="link" 
            onClick={() => {
              setError(null)
              fetchStores()
            }}
          >
            Try again
          </Button>
        </div>
      )}

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
            <Card 
              key={store.id} 
              className={`border bg-card transition-shadow hover:shadow-md cursor-pointer ${
                selectedStore === store.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedStore(store.id === selectedStore ? null : store.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-card-foreground">
                        {store.shopName || store.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={store.open ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}
                      >
                        {store.open ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{store.address}</p>
                  </div>
                  {store.distance && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {store.distance}
                    </span>
                  )}
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
                  {store.location && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStore(store.id)
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        View on Map
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          openInGoogleMaps(store)
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Get Directions
                      </Button>
                    </>
                  )}
                  {!store.location && (
                    <span className="text-xs text-muted-foreground">Location not available</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

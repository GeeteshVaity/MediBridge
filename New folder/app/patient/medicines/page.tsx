"use client"

import { useState, useEffect } from "react"
import { Search, ShoppingCart, Plus, Check, Loader2, Pill, Bell } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"

interface Medicine {
  id: string
  inventoryId: string
  name: string
  brand: string
  price: number
  inStock: boolean
  category: string
  shopName: string
}

export default function MedicinesPage() {
  const { user } = useAuth()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [requestingMedicine, setRequestingMedicine] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    async function fetchMedicines() {
      try {
        // Fetch all medicines from all shops
        const response = await fetch('/api/medicines/search?query=')
        if (!response.ok) throw new Error('Failed to fetch medicines')
        const data = await response.json()
        const transformedMedicines = (data.medicines || []).map((m: any) => ({
          id: m._id,
          inventoryId: m._id,
          name: m.medicineName,
          brand: m.brand || 'Generic',
          price: m.price || 0,
          inStock: m.quantity > 0,
          category: m.category || 'General',
          shopName: m.shopId?.name || m.shopName || 'Unknown Shop'
        }))
        setMedicines(transformedMedicines)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch medicines')
      } finally {
        setLoading(false)
      }
    }
    fetchMedicines()
  }, [])

  // Search function
  async function handleSearch(searchTerm: string) {
    setSearch(searchTerm)
    setRequestSent(false) // Reset request state on new search
    if (searchTerm.length < 1) {
      // Fetch all
      try {
        const response = await fetch('/api/medicines/search?query=')
        if (!response.ok) return
        const data = await response.json()
        const transformedMedicines = (data.medicines || []).map((m: any) => ({
          id: m._id,
          inventoryId: m._id,
          name: m.medicineName,
          brand: m.brand || 'Generic',
          price: m.price || 0,
          inStock: m.quantity > 0,
          category: m.category || 'General',
          shopName: m.shopId?.name || m.shopName || 'Unknown Shop'
        }))
        setMedicines(transformedMedicines)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const filtered = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.brand.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd(medicine: Medicine) {
    if (!user?.id) {
      alert('Please login first')
      return
    }
    try {
      const response = await fetch('/api/patient/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          medicineName: medicine.name,
          quantity: 1,
          price: medicine.price,
          brand: medicine.brand,
          inventoryId: medicine.inventoryId
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add to cart')
      }
      setAddedIds((prev) => new Set(prev).add(medicine.id))
    } catch (err) {
      console.error('Failed to add to cart:', err)
      alert(err instanceof Error ? err.message : 'Failed to add to cart')
    }
  }

  async function handleRequestMedicine() {
    if (!user?.id || !user?.name) {
      alert('Please login first')
      return
    }
    if (!search.trim()) {
      alert('Please enter a medicine name to request')
      return
    }
    setRequestingMedicine(true)
    try {
      const response = await fetch('/api/medicine-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineName: search.trim(),
          patientId: user.id,
          patientName: user.name
        })
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 409) {
          alert('A request for this medicine is already pending. Stores have been notified!')
          setRequestSent(true)
        } else {
          throw new Error(data.error || 'Failed to request medicine')
        }
      } else {
        setRequestSent(true)
        alert(`Your request for "${search}" has been sent to all stores!`)
      }
    } catch (err) {
      console.error('Failed to request medicine:', err)
      alert(err instanceof Error ? err.message : 'Failed to request medicine')
    } finally {
      setRequestingMedicine(false)
    }
  }

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
        <h2 className="text-2xl font-bold text-foreground">Order Medicine</h2>
        <p className="text-muted-foreground">Search and add medicines to your cart.</p>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search medicines by name, brand, or category..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 && !search ? (
        <Card className="border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium text-card-foreground">No medicines available</p>
            <p className="text-sm text-muted-foreground">Medicines will appear here once added by stores</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => {
            const added = addedIds.has(m.id)
            return (
              <Card key={m.id} className="border bg-card transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between">
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      {m.category}
                    </Badge>
                    {m.inStock ? (
                      <span className="text-xs font-medium text-accent">In Stock</span>
                    ) : (
                      <span className="text-xs font-medium text-destructive">Out of Stock</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">{m.name}</h3>
                    <p className="text-sm text-muted-foreground">{m.brand}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">₹{m.price.toFixed(2)}</span>
                    <Button
                      size="sm"
                      variant={added ? "secondary" : "default"}
                      disabled={!m.inStock || added}
                      onClick={() => handleAdd(m)}
                      className="gap-1"
                    >
                      {added ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && search && (
        <Card className="border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium text-card-foreground">No medicines found for "{search}"</p>
            <p className="text-sm text-muted-foreground mb-4">
              Can't find what you're looking for? Request it and we'll notify all stores!
            </p>
            {requestSent ? (
              <div className="flex items-center gap-2 text-accent">
                <Check className="h-5 w-5" />
                <span className="font-medium">Request sent to all stores!</span>
              </div>
            ) : (
              <Button 
                onClick={handleRequestMedicine} 
                disabled={requestingMedicine}
                className="gap-2"
              >
                {requestingMedicine ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {requestingMedicine ? 'Sending Request...' : `Request "${search}"`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

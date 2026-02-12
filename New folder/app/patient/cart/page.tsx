"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/AuthContext"

interface CartItem {
  id: string
  name: string
  brand: string
  price: number
  quantity: number
}

export default function CartPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    async function fetchCart() {
      if (!user?.id) {
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`/api/patient/cart?patientId=${user.id}`)
        if (!response.ok) throw new Error('Failed to fetch cart')
        const data = await response.json()
        const transformedItems = (data.cart?.items || []).map((item: any) => ({
          id: item._id || item.inventoryId,
          name: item.medicineName,
          brand: item.brand || 'Generic',
          price: item.price || 0,
          quantity: item.quantity
        }))
        setItems(transformedItems)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cart')
      } finally {
        setLoading(false)
      }
    }
    fetchCart()
  }, [user])

  async function updateQty(id: string, name: string, delta: number) {
    const item = items.find(i => i.id === id)
    if (!item || !user?.id) return
    
    const newQty = Math.max(0, item.quantity + delta)
    
    if (newQty === 0) {
      await removeItem(id, name)
      return
    }

    try {
      const response = await fetch('/api/patient/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          itemId: id,
          medicineName: name,
          quantity: newQty
        })
      })
      if (!response.ok) throw new Error('Failed to update quantity')
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: newQty } : item
        )
      )
    } catch (err) {
      console.error('Failed to update quantity:', err)
    }
  }

  async function removeItem(id: string, name: string) {
    if (!user?.id) return
    try {
      const response = await fetch('/api/patient/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          itemId: id,
          medicineName: name
        })
      })
      if (!response.ok) throw new Error('Failed to remove item')
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Failed to remove item:', err)
    }
  }

  async function handleCheckout() {
    if (items.length === 0 || !user?.id) return
    
    setCheckingOut(true)
    try {
      const response = await fetch('/api/patient/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          medicines: items.map(item => ({
            medicineName: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create order')
      }
      
      // Clear the cart after successful order
      await fetch('/api/patient/cart/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: user.id })
      })
      
      alert('Order placed successfully!')
      setItems([])
      router.push('/patient/orders')
    } catch (err) {
      console.error('Checkout failed:', err)
      alert(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setCheckingOut(false)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = items.length > 0 ? 2.00 : 0
  const total = subtotal + deliveryFee

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
        <h2 className="text-2xl font-bold text-foreground">Your Cart</h2>
        <p className="text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""} in your cart</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {items.length === 0 ? (
            <Card className="border bg-card">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium text-card-foreground">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground">Add medicines to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="border bg-card">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.brand}</p>
                    <p className="mt-1 font-medium text-primary">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQty(item.id, item.name, -1)}
                      >
                        <Minus className="h-3 w-3" />
                        <span className="sr-only">Decrease quantity</span>
                      </Button>
                      <span className="w-8 text-center text-sm font-medium text-card-foreground">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQty(item.id, item.name, 1)}
                      >
                        <Plus className="h-3 w-3" />
                        <span className="sr-only">Increase quantity</span>
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id, item.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove item</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Order Summary */}
        <Card className="h-fit border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-card-foreground">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-card-foreground">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="text-card-foreground">${deliveryFee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span className="text-card-foreground">Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            <Button className="mt-2 w-full" size="lg" disabled={items.length === 0 || checkingOut} onClick={handleCheckout}>
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {checkingOut ? 'Placing Order...' : 'Place Order'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

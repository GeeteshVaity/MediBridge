"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'

interface CartItem {
  id: string
  name: string
  brand: string
  price: number
  quantity: number
  inventoryId?: string
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  loading: boolean
  operationLoading: string | null // Track which operation is in progress
  refreshCart: () => Promise<void>
  addToCart: (item: Omit<CartItem, 'id'> & { inventoryId: string }) => Promise<boolean>
  updateQuantity: (id: string, name: string, quantity: number) => Promise<boolean>
  removeFromCart: (id: string, name: string) => Promise<boolean>
  clearCart: () => Promise<boolean>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [operationLoading, setOperationLoading] = useState<string | null>(null)
  const initialFetchDone = useRef(false)

  const refreshCart = useCallback(async () => {
    if (!user?.id) {
      setItems([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/patient/cart?patientId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        const transformedItems = (data.cart?.items || []).map((item: any) => ({
          id: item._id || item.inventoryId,
          name: item.medicineName,
          brand: item.brand || 'Generic',
          price: item.price || 0,
          quantity: item.quantity,
          inventoryId: item.inventoryId
        }))
        setItems(transformedItems)
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!initialFetchDone.current && user?.id) {
      initialFetchDone.current = true
      refreshCart()
    } else if (!user?.id) {
      initialFetchDone.current = false
      setItems([])
    }
  }, [refreshCart, user?.id])

  const addToCart = async (item: Omit<CartItem, 'id'> & { inventoryId: string }): Promise<boolean> => {
    if (!user?.id) return false

    const operationId = `add-${item.inventoryId}`
    setOperationLoading(operationId)

    // Optimistic update
    const existingIndex = items.findIndex(i => i.inventoryId === item.inventoryId || i.name === item.name)
    const previousItems = [...items]
    
    if (existingIndex > -1) {
      setItems(prev => prev.map((i, idx) => 
        idx === existingIndex ? { ...i, quantity: i.quantity + item.quantity } : i
      ))
    } else {
      const newItem: CartItem = {
        id: item.inventoryId,
        name: item.name,
        brand: item.brand,
        price: item.price,
        quantity: item.quantity,
        inventoryId: item.inventoryId
      }
      setItems(prev => [...prev, newItem])
    }

    try {
      const response = await fetch('/api/patient/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          medicineName: item.name,
          quantity: item.quantity,
          price: item.price,
          brand: item.brand,
          inventoryId: item.inventoryId
        })
      })
      if (!response.ok) {
        // Revert on failure
        setItems(previousItems)
        return false
      }
      return true
    } catch (err) {
      console.error('Failed to add to cart:', err)
      setItems(previousItems)
      return false
    } finally {
      setOperationLoading(null)
    }
  }

  const updateQuantity = async (id: string, name: string, quantity: number): Promise<boolean> => {
    if (!user?.id) return false

    if (quantity <= 0) {
      return await removeFromCart(id, name)
    }

    const operationId = `update-${id}`
    setOperationLoading(operationId)

    // Optimistic update
    const previousItems = [...items]
    setItems(prev => prev.map(item => 
      (item.id === id || item.inventoryId === id || item.name === name) 
        ? { ...item, quantity } 
        : item
    ))

    try {
      const response = await fetch('/api/patient/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          itemId: id,
          medicineName: name,
          quantity
        })
      })
      if (!response.ok) {
        setItems(previousItems)
        return false
      }
      return true
    } catch (err) {
      console.error('Failed to update quantity:', err)
      setItems(previousItems)
      return false
    } finally {
      setOperationLoading(null)
    }
  }

  const removeFromCart = async (id: string, name: string): Promise<boolean> => {
    if (!user?.id) return false

    const operationId = `remove-${id}`
    setOperationLoading(operationId)

    // Optimistic update
    const previousItems = [...items]
    setItems(prev => prev.filter(item => 
      !(item.id === id || item.inventoryId === id || item.name === name)
    ))

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
      if (!response.ok) {
        setItems(previousItems)
        return false
      }
      return true
    } catch (err) {
      console.error('Failed to remove item:', err)
      setItems(previousItems)
      return false
    } finally {
      setOperationLoading(null)
    }
  }

  const clearCart = async (): Promise<boolean> => {
    if (!user?.id) return false

    setOperationLoading('clear')

    // Optimistic update
    const previousItems = [...items]
    setItems([])

    try {
      const response = await fetch('/api/patient/cart/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: user.id })
      })
      if (!response.ok) {
        setItems(previousItems)
        return false
      }
      return true
    } catch (err) {
      console.error('Failed to clear cart:', err)
      setItems(previousItems)
      return false
    } finally {
      setOperationLoading(null)
    }
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        loading,
        operationLoading,
        refreshCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

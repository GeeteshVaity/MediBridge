"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Package,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Bell,
  FileText,
  ShoppingBag,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"

interface Stat {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface RecentOrder {
  id: string
  patient: string
  medicines: string
  items: number
  total: number
  status: string
  date: string
}

interface LowStockAlert {
  name: string
  stock: number
  threshold: number
}

const defaultStats: Stat[] = [
  { label: "Pending Orders", value: "0", icon: ClipboardList, color: "text-primary" },
  { label: "Low Stock Items", value: "0", icon: AlertTriangle, color: "text-chart-4" },
  { label: "Prescriptions", value: "0", icon: FileText, color: "text-accent" },
  { label: "Total Products", value: "0", icon: Package, color: "text-primary" },
]

function statusColor(status: string) {
  if (status === "New" || status === "pending") return "bg-destructive/10 text-destructive"
  if (status === "Accepted" || status === "accepted") return "bg-primary/10 text-primary"
  return "bg-accent/10 text-accent"
}

export default function ShopkeeperHome() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stat[]>(defaultStats)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])
  const [shopName, setShopName] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) {
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`/api/shop/dashboard?shopId=${user.id}`)
        if (!response.ok) throw new Error('Failed to fetch dashboard')
        const data = await response.json()
        
        setStats([
          { label: "Pending Orders", value: data.pendingOrders?.toString() || "0", icon: ClipboardList, color: "text-primary" },
          { label: "Low Stock Items", value: data.lowStockCount?.toString() || "0", icon: AlertTriangle, color: "text-chart-4" },
          { label: "Prescriptions", value: data.pendingPrescriptions?.toString() || "0", icon: FileText, color: "text-accent" },
          { label: "Total Products", value: data.totalProducts?.toString() || "0", icon: Package, color: "text-primary" },
        ])
        
        // Transform recent orders
        const transformedOrders = (data.recentOrders || []).map((order: any) => {
          const medicineNames = order.medicines?.map((m: any) => m.medicineName).join(', ') || 'No medicines'
          return {
            id: `ORD-${order._id?.slice(-6).toUpperCase()}` || 'N/A',
            patient: order.patientId?.name || 'Unknown',
            medicines: medicineNames,
            items: order.medicines?.length || 0,
            total: order.medicines?.reduce((sum: number, m: any) => sum + (m.price || 0) * m.quantity, 0) || 0,
            status: order.status === 'pending' ? 'New' : order.status === 'accepted' ? 'Accepted' : 'Delivered',
            date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'
          }
        })
        setRecentOrders(transformedOrders)
        
        // Transform low stock items
        const transformedLowStock = (data.lowStockItems || []).map((item: any) => ({
          name: item.medicineName,
          stock: item.quantity,
          threshold: 20
        }))
        setLowStockAlerts(transformedLowStock)
        
        setShopName(user?.name || "Your store")
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Store Dashboard</h2>
        <p className="text-muted-foreground">{shopName || "Your store"} overview and quick actions.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-card-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="border bg-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-card-foreground">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/shopkeeper/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recent orders</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-card-foreground">{order.id}</span>
                        <Badge variant="secondary" className={statusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {order.medicines}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.patient} &middot; {order.items} items &middot; ₹{order.total.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{order.date}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <AlertTriangle className="h-4 w-4 text-chart-4" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No low stock alerts</p>
              </div>
            ) : (
              <div className="divide-y">
                {lowStockAlerts.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-card-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Threshold: {item.threshold} units
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-chart-4/10 text-chart-4">
                      {item.stock} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border bg-card transition-shadow hover:shadow-md">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-card-foreground">Manage Inventory</h3>
            <p className="text-sm text-muted-foreground">Add, update or remove stock items</p>
            <Button asChild size="sm" className="mt-1">
              <Link href="/shopkeeper/inventory">Go to Inventory</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border bg-card transition-shadow hover:shadow-md">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <ClipboardList className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-card-foreground">View Orders</h3>
            <p className="text-sm text-muted-foreground">Accept or reject incoming orders</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/shopkeeper/orders">View Orders</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border bg-card transition-shadow hover:shadow-md">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-4/10">
              <TrendingUp className="h-6 w-6 text-chart-4" />
            </div>
            <h3 className="font-semibold text-card-foreground">Restock Items</h3>
            <p className="text-sm text-muted-foreground">Request restocking for low items</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/shopkeeper/restock">Restock</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

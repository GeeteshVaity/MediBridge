"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Upload,
  Pill,
  ShoppingCart,
  ClipboardList,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle2,
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
  store: string
  status: string
  items: number
  date: string
}

interface Notification {
  text: string
  time: string
  unread: boolean
}

const defaultStats: Stat[] = [
  { label: "Active Orders", value: "0", icon: ClipboardList, color: "text-primary" },
  { label: "Cart Items", value: "0", icon: ShoppingCart, color: "text-accent" },
  { label: "Prescriptions", value: "0", icon: Upload, color: "text-chart-1" },
  { label: "Completed", value: "0", icon: CheckCircle2, color: "text-accent" },
]

function statusColor(status: string) {
  if (status === "Delivered" || status === "delivered") return "bg-accent/10 text-accent"
  if (status === "In Transit" || status === "accepted") return "bg-primary/10 text-primary"
  return "bg-muted text-muted-foreground"
}

function getDisplayStatus(status: string): string {
  switch (status) {
    case "pending": return "Pending"
    case "accepted": return "In Transit"
    case "delivered": return "Delivered"
    case "rejected": return "Cancelled"
    default: return status
  }
}

export default function PatientHome() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stat[]>(defaultStats)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userName, setUserName] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) {
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`/api/patient/dashboard?patientId=${user.id}`)
        if (!response.ok) throw new Error('Failed to fetch dashboard')
        const data = await response.json()
        
        setStats([
          { label: "Active Orders", value: data.activeOrders?.toString() || "0", icon: ClipboardList, color: "text-primary" },
          { label: "Cart Items", value: data.cartItems?.toString() || "0", icon: ShoppingCart, color: "text-accent" },
          { label: "Prescriptions", value: data.prescriptionCount?.toString() || "0", icon: Upload, color: "text-chart-1" },
          { label: "Completed", value: data.completedOrders?.toString() || "0", icon: CheckCircle2, color: "text-accent" },
        ])
        
        // Transform recent orders
        const transformedOrders = (data.recentOrders || []).map((order: any) => ({
          id: `ORD-${order._id.slice(-6).toUpperCase()}`,
          store: order.acceptedBy?.name || 'Pending',
          status: getDisplayStatus(order.status),
          items: order.medicines?.length || 0,
          date: new Date(order.createdAt).toLocaleDateString()
        }))
        setRecentOrders(transformedOrders)
        
        // Transform notifications
        const transformedNotifications = (data.notifications || []).map((n: any) => ({
          text: n.message,
          time: new Date(n.createdAt).toLocaleTimeString(),
          unread: !n.read
        }))
        setNotifications(transformedNotifications)
        
        setUserName(user?.name || "")
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
        <h2 className="text-2xl font-bold text-foreground">
          {userName ? `Welcome back, ${userName}` : "Welcome to MediBridge"}
        </h2>
        <p className="text-muted-foreground">{"Here's what's happening with your health today."}</p>
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
              <Link href="/patient/orders">View All</Link>
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
                      <span className="text-sm text-muted-foreground">
                        {order.store} &middot; {order.items} items
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{order.date}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications Panel */}
        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-6 py-4">
                    {n.unread && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    {!n.unread && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                    <div className="flex flex-col gap-1">
                      <span className={`text-sm ${n.unread ? "font-medium text-card-foreground" : "text-muted-foreground"}`}>
                        {n.text}
                      </span>
                      <span className="text-xs text-muted-foreground">{n.time}</span>
                    </div>
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
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-card-foreground">Upload Prescription</h3>
            <p className="text-sm text-muted-foreground">Upload a new prescription to get started</p>
            <Button asChild size="sm" className="mt-1">
              <Link href="/patient/prescription">Upload Now</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border bg-card transition-shadow hover:shadow-md">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <Pill className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-card-foreground">Search Medicines</h3>
            <p className="text-sm text-muted-foreground">Find medicines available at nearby stores</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/patient/medicines">Search</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border bg-card transition-shadow hover:shadow-md">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-card-foreground">Track Orders</h3>
            <p className="text-sm text-muted-foreground">Check the status of your current orders</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/patient/orders">View Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

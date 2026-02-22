"use client"

import { useState } from "react"
import Link from "next/link"
import { Pill, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"

type Role = "patient" | "shop"

export default function LoginPage() {
  const [role, setRole] = useState<Role>("patient")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const { login } = useAuth()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const result = await login(formData.email, formData.password)
    
    if (!result.success) {
      setError(result.error || "An error occurred during login")
    }
    
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Pill className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">MediBridge</span>
      </Link>

      <Card className="w-full max-w-md border bg-card shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-card-foreground">Welcome Back</CardTitle>
          <CardDescription>Sign in to your MediBridge account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Toggle */}
          <div className="mb-6 flex rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setRole("patient")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                role === "patient"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => setRole("shop")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                role === "shop"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Shopkeeper
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="mt-2 w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

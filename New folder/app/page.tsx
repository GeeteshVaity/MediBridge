"use client"

import Link from "next/link"
import {
  Heart,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  Pill,
  Store,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Upload,
    title: "Upload Prescriptions",
    description:
      "Simply upload your prescription and let nearby stores prepare your order.",
  },
  {
    icon: MapPin,
    title: "Find Nearby Stores",
    description:
      "Discover medical stores close to you with real-time availability.",
  },
  {
    icon: Clock,
    title: "Real-Time Tracking",
    description:
      "Track your order status in real time from placement to delivery.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Stores",
    description:
      "All stores are licensed and verified to ensure quality medicines.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">MediBridge</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,hsl(210_80%_50%/0.08),transparent)]" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-primary" />
            Healthcare made simple
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Connecting Patients with Nearby Medical Stores in Real Time
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            MediBridge bridges the gap between patients and medical stores. Upload prescriptions, search for medicines, and get your orders fulfilled by verified stores near you.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="gap-2">
              <Link href="/signup">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Login to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground">Everything You Need</h2>
            <p className="mt-3 text-muted-foreground">A complete platform for patients and medical stores</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="border bg-card transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-card-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-card px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
            <p className="mt-3 text-muted-foreground">Get your medicines in three simple steps</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", icon: Pill, title: "Search or Upload", desc: "Search for medicines or upload your prescription image." },
              { step: "02", icon: Store, title: "Choose a Store", desc: "Browse nearby stores with stock availability and pricing." },
              { step: "03", icon: MapPin, title: "Track & Receive", desc: "Place your order and track it in real time until delivery." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <item.icon className="h-7 w-7" />
                </div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary">Step {item.step}</span>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-primary-foreground/80">
            Join thousands of patients and medical stores already using MediBridge to streamline their healthcare experience.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" asChild className="gap-2">
              <Link href="/signup">
                Sign Up as Patient
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/signup">Register Your Store</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-card px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Pill className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">MediBridge</span>
          </div>
          <p className="text-sm text-muted-foreground">2026 MediBridge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

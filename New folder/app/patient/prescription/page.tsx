"use client"

import { useState, useEffect } from "react"
import { Upload, FileText, CheckCircle2, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"

interface Prescription {
  id: string
  name: string
  date: string
  status: string
}

export default function PrescriptionPage() {
  const { user } = useAuth()
  const [dragOver, setDragOver] = useState(false)
  const [uploaded, setUploaded] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pastPrescriptions, setPastPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPrescriptions() {
      if (!user?.id) {
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`/api/patient/prescriptions?patientId=${user.id}`)
        if (!response.ok) throw new Error('Failed to fetch prescriptions')
        const data = await response.json()
        const transformedPrescriptions = data.prescriptions.map((p: any) => ({
          id: p._id.slice(-8).toUpperCase(),
          name: p.imageUrl || 'Prescription',
          date: new Date(p.createdAt).toLocaleDateString(),
          status: p.status === 'processed' ? 'Processed' : 'Pending'
        }))
        setPastPrescriptions(transformedPrescriptions)
      } catch (err) {
        console.error('Failed to fetch prescriptions:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPrescriptions()
  }, [user])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setUploaded(file.name)
      setSelectedFile(file)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setUploaded(file.name)
      setSelectedFile(file)
    }
  }

  async function handleSubmit() {
    if (!uploaded || !user?.id) return
    
    setUploading(true)
    try {
      // For simplicity, store the filename as the imageUrl
      // In production, you'd upload to a storage service
      const response = await fetch('/api/patient/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          imageUrl: uploaded,
          notes: ''
        })
      })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      
      setPastPrescriptions(prev => [{
        id: data.prescription._id.slice(-8).toUpperCase(),
        name: uploaded,
        date: new Date().toLocaleDateString(),
        status: 'Pending'
      }, ...prev])
      
      alert('Prescription uploaded successfully!')
      setUploaded(null)
      setSelectedFile(null)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload prescription')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Upload Prescription</h2>
        <p className="text-muted-foreground">Upload your prescription to have it reviewed by nearby stores.</p>
      </div>

      <Card className="border bg-card">
        <CardContent className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
            }`}
          >
            {uploaded ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
                  <CheckCircle2 className="h-7 w-7 text-accent" />
                </div>
                <p className="font-medium text-card-foreground">{uploaded}</p>
                <p className="text-sm text-muted-foreground">File selected successfully</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmit} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Prescription
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setUploaded(null)}>
                    <X className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor="prescriptionUpload" className="flex cursor-pointer flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    Drag & drop your prescription here
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    or click to browse. Supports JPG, PNG, PDF (max 10MB)
                  </p>
                </div>
                <Button size="sm" variant="outline" className="mt-2" type="button">
                  Browse Files
                </Button>
                <input
                  id="prescriptionUpload"
                  type="file"
                  className="sr-only"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-card-foreground">Past Prescriptions</CardTitle>
          <CardDescription>Your previously uploaded prescriptions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : pastPrescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No prescriptions uploaded yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {pastPrescriptions.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {p.name.endsWith(".pdf") ? (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.id} &middot; {p.date}</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    p.status === "Processed"
                      ? "bg-accent/10 text-accent"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {p.status}
                </Badge>
              </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cloud, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    workspaceName: "",
    workspaceSlug: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Auto-generate slug from workspace name
      ...(name === "workspaceName" && {
        workspaceSlug: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      }),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Kata laluan tidak sepadan")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      // Store token and redirect
      localStorage.setItem("token", data.token)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Cloud className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">Awan Keusahawanan</span>
          </div>
          <CardTitle>Cipta Akaun Baharu</CardTitle>
          <CardDescription>Mulakan perjalanan digital perniagaan anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nama Penuh</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ahmad bin Ali"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Emel</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ahmad@syarikat.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceName">Nama Syarikat/Workspace</Label>
              <Input
                id="workspaceName"
                name="workspaceName"
                value={formData.workspaceName}
                onChange={handleChange}
                placeholder="Syarikat ABC Sdn Bhd"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceSlug">URL Workspace</Label>
              <Input
                id="workspaceSlug"
                name="workspaceSlug"
                value={formData.workspaceSlug}
                onChange={handleChange}
                placeholder="syarikat-abc"
                required
              />
              <p className="text-xs text-gray-500">URL: awan.my/{formData.workspaceSlug || "workspace-anda"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Kata Laluan</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 aksara"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Sahkan Kata Laluan</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Masukkan semula kata laluan"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cipta Akaun
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Sudah ada akaun? </span>
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Masuk di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

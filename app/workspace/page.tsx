"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cloud, Plus, Users, Building } from "lucide-react"

interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  role: string
  _count: {
    users: number
  }
}

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const fetchWorkspaces = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch("/api/workspaces", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch workspaces")
      }

      const data = await response.json()
      setWorkspaces(data.workspaces)
    } catch (error) {
      console.error("Error fetching workspaces:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const selectWorkspace = (workspaceId: string) => {
    localStorage.setItem("currentWorkspace", workspaceId)
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Cloud className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p>Memuatkan workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Cloud className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">Awan Keusahawanan</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pilih Workspace</h1>
          <p className="text-gray-600">Pilih workspace untuk meneruskan kerja anda</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Building className="h-8 w-8 text-blue-600" />
                  <Badge variant={workspace.role === "OWNER" ? "default" : "secondary"}>
                    {workspace.role === "OWNER" ? "Pemilik" : workspace.role === "ADMIN" ? "Admin" : "Ahli"}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{workspace.name}</CardTitle>
                <CardDescription>{workspace.description || "Tiada penerangan"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{workspace._count.users} ahli</span>
                  </div>
                  <Button onClick={() => selectWorkspace(workspace.id)}>Pilih</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create New Workspace Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-dashed">
            <CardHeader>
              <div className="flex items-center justify-center">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <CardTitle className="text-lg text-center">Cipta Workspace Baharu</CardTitle>
              <CardDescription className="text-center">Mulakan projek atau syarikat baharu</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => router.push("/workspace/create")}
              >
                Cipta Workspace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

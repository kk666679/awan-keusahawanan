"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ArrowLeft, Edit, Mail, Phone, Building, MapPin, FileText, Calendar } from "lucide-react"

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  notes?: string
  createdAt: string
  invoices: Array<{
    id: string
    number: string
    status: string
    total: number
    issueDate: string
  }>
}

export default function CustomerDetailPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params.id) {
      fetchCustomer(params.id as string)
    }
  }, [params.id])

  const fetchCustomer = async (customerId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Customer not found")
      }

      const data = await response.json()
      setCustomer(data.customer)
    } catch (error) {
      console.error("Error fetching customer:", error)
      router.push("/customers")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "default"
      case "SENT":
        return "secondary"
      case "OVERDUE":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Dibayar"
      case "SENT":
        return "Dihantar"
      case "OVERDUE":
        return "Tertunggak"
      case "DRAFT":
        return "Draf"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Memuatkan maklumat pelanggan...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p>Pelanggan tidak dijumpai</p>
        </div>
      </DashboardLayout>
    )
  }

  const totalRevenue = customer.invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + invoice.total, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/customers">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-gray-600">{customer.company || "Pelanggan Individu"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/customers/${customer.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/invoices/new?customer=${customer.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Cipta Invois
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Maklumat Hubungan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{customer.phone}</span>
                  </div>
                )}
                {customer.company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{customer.company}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span className="text-sm">{customer.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Didaftar: {new Date(customer.createdAt).toLocaleDateString("ms-MY")}</span>
                </div>
              </CardContent>
            </Card>

            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Nota</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{customer.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Statistik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Jumlah Invois</span>
                  <span className="font-medium">{customer.invoices.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Jumlah Hasil</span>
                  <span className="font-medium">RM {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Invois Tertunggak</span>
                  <span className="font-medium">{customer.invoices.filter((i) => i.status === "OVERDUE").length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoices */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Sejarah Invois</CardTitle>
                <CardDescription>Senarai invois untuk pelanggan ini</CardDescription>
              </CardHeader>
              <CardContent>
                {customer.invoices.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombor Invois</TableHead>
                          <TableHead>Tarikh</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                {invoice.number}
                              </Link>
                            </TableCell>
                            <TableCell>{new Date(invoice.issueDate).toLocaleDateString("ms-MY")}</TableCell>
                            <TableCell>RM {invoice.total.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(invoice.status)}>{getStatusText(invoice.status)}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Belum ada invois untuk pelanggan ini</p>
                    <Button asChild>
                      <Link href={`/invoices/new?customer=${customer.id}`}>Cipta Invois Pertama</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

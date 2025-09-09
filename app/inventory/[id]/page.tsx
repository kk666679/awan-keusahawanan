"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ArrowLeft, Edit, Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"

interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  price: number
  cost?: number
  stock: number
  lowStock: number
  createdAt: string
}

interface StockMovement {
  id: string
  type: "IN" | "OUT" | "ADJUSTMENT"
  quantity: number
  reason?: string
  createdAt: string
}

export default function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string)
    }
  }, [params.id])

  const fetchProduct = async (productId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Product not found")
      }

      const data = await response.json()
      setProduct(data.product)
      setStockMovements(data.stockMovements || [])
    } catch (error) {
      console.error("Error fetching product:", error)
      router.push("/inventory")
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { status: "Habis Stok", color: "destructive", icon: TrendingDown }
    if (product.stock <= product.lowStock) return { status: "Stok Rendah", color: "secondary", icon: AlertTriangle }
    return { status: "Stok Mencukupi", color: "default", icon: TrendingUp }
  }

  const getMovementType = (type: string) => {
    switch (type) {
      case "IN":
        return { label: "Masuk", color: "text-green-600" }
      case "OUT":
        return { label: "Keluar", color: "text-red-600" }
      case "ADJUSTMENT":
        return { label: "Pelarasan", color: "text-blue-600" }
      default:
        return { label: type, color: "text-gray-600" }
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Memuatkan maklumat produk...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p>Produk tidak dijumpai</p>
        </div>
      </DashboardLayout>
    )
  }

  const stockStatus = getStockStatus(product)
  const StatusIcon = stockStatus.icon
  const profit = product.cost ? product.price - product.cost : 0
  const profitMargin = product.cost ? ((profit / product.price) * 100).toFixed(1) : 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-gray-600">{product.sku ? `SKU: ${product.sku}` : "Tiada SKU"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/inventory/${product.id}/adjust`}>
                <Package className="mr-2 h-4 w-4" />
                Laras Stok
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/inventory/${product.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Produk
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Product Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Maklumat Produk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Penerangan</h4>
                    <p className="text-sm">{product.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Harga Jual</h4>
                    <p className="text-lg font-semibold">RM {product.price.toLocaleString()}</p>
                  </div>
                  {product.cost && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Harga Kos</h4>
                      <p className="text-lg font-semibold">RM {product.cost.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {product.cost && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Keuntungan</h4>
                      <p className="text-lg font-semibold text-green-600">RM {profit.toLocaleString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Margin</h4>
                      <p className="text-lg font-semibold text-green-600">{profitMargin}%</p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Didaftarkan</h4>
                  <p className="text-sm">{new Date(product.createdAt).toLocaleDateString("ms-MY")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Stock Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status Stok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stok Semasa</span>
                  <span className="text-2xl font-bold">{product.stock}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tahap Rendah</span>
                  <span className="text-sm font-medium">{product.lowStock}</span>
                </div>

                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4" />
                  <Badge variant={stockStatus.color as any}>{stockStatus.status}</Badge>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nilai Stok</span>
                    <span className="text-lg font-semibold">RM {(product.price * product.stock).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Movements */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Sejarah Pergerakan Stok</CardTitle>
                <CardDescription>Rekod masuk dan keluar stok produk ini</CardDescription>
              </CardHeader>
              <CardContent>
                {stockMovements.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarikh</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead>Kuantiti</TableHead>
                          <TableHead>Sebab</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockMovements.map((movement) => {
                          const movementType = getMovementType(movement.type)
                          return (
                            <TableRow key={movement.id}>
                              <TableCell>{new Date(movement.createdAt).toLocaleDateString("ms-MY")}</TableCell>
                              <TableCell>
                                <span className={movementType.color}>{movementType.label}</span>
                              </TableCell>
                              <TableCell>
                                <span className={movement.type === "OUT" ? "text-red-600" : "text-green-600"}>
                                  {movement.type === "OUT" ? "-" : "+"}
                                  {movement.quantity}
                                </span>
                              </TableCell>
                              <TableCell>{movement.reason || "-"}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Belum ada pergerakan stok</p>
                    <Button asChild>
                      <Link href={`/inventory/${product.id}/adjust`}>Laras Stok Pertama</Link>
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

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import {
  Users,
  Package,
  FileText,
  Cpu,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Plus,
  Activity,
  Calendar,
  Filter,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"

interface DashboardStats {
  customers: { total: number; thisMonth: number; growth: number }
  products: { total: number; lowStock: number }
  invoices: { total: number; pending: number; overdue: number; revenue: number }
  tasks: { total: number; completed: number; pending: number }
  computeJobs: { total: number; running: number; completed: number }
}

interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
  status?: string
}

interface ChartData {
  name: string
  customers: number
  revenue: number
  tasks: number
  date: string
}

interface MetricData {
  name: string
  value: number
  color: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [chartData, setChartData] = useState<ChartData[]>([])
  const [selectedMetric, setSelectedMetric] = useState<string>("customers")

  useEffect(() => {
    fetchDashboardData()
  }, [])

const fetchDashboardData = async () => {
    try {
      // Mock token and workspaceId for demo/testing
      const token = "mock-token"
      const workspaceId = "mock-workspace"

      // Remove redirect for testing
      // if (!token || !workspaceId) {
      //   router.push("/login")
      //   return
      // }

      // Mock stats data
      const statsData = {
        customers: { total: 100, thisMonth: 10, growth: 5 },
        products: { total: 50, lowStock: 3 },
        invoices: { total: 200, pending: 5, overdue: 2, revenue: 50000 },
        tasks: { total: 20, completed: 15, pending: 5 },
        computeJobs: { total: 10, running: 2, completed: 8 },
      }
      setStats(statsData)

      // Mock recent activity
      const activityData = {
        activities: [
          { id: "1", type: "invoice", description: "Invois #123 dibayar", timestamp: "2024-06-01", status: "completed" },
          { id: "2", type: "customer", description: "Pelanggan baru didaftarkan", timestamp: "2024-06-02" },
        ],
      }
      setRecentActivity(activityData.activities)

      // Mock chart data
      const chartDataMock = [
        { name: "1 Jun", customers: 10, revenue: 1000, tasks: 5, date: "2024-06-01" },
        { name: "2 Jun", customers: 12, revenue: 1200, tasks: 6, date: "2024-06-02" },
        { name: "3 Jun", customers: 15, revenue: 1500, tasks: 7, date: "2024-06-03" },
      ]
      setChartData(chartDataMock)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: "Tambah Pelanggan",
      description: "Daftar pelanggan baharu",
      icon: Users,
      href: "/customers/new",
      color: "bg-blue-500",
    },
    {
      title: "Cipta Invois",
      description: "Buat invois baharu",
      icon: FileText,
      href: "/invoices/new",
      color: "bg-green-500",
    },
    {
      title: "Tambah Produk",
      description: "Daftar produk baharu",
      icon: Package,
      href: "/inventory/new",
      color: "bg-purple-500",
    },
    {
      title: "Jalankan Komputasi",
      description: "Mulakan tugas GPU/CPU",
      icon: Cpu,
      href: "/compute/new",
      color: "bg-orange-500",
    },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
            <p>Memuatkan dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Selamat datang kembali! Berikut adalah ringkasan perniagaan anda.</p>
          </div>
          <Button onClick={() => router.push("/compute/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Tugas Baharu
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jumlah Pelanggan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.customers.total || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stats?.customers.growth && stats.customers.growth > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span
                  className={stats?.customers.growth && stats.customers.growth > 0 ? "text-green-500" : "text-red-500"}
                >
                  {stats?.customers.growth || 0}%
                </span>
                <span className="ml-1">dari bulan lepas</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produk</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.products.total || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stats?.products.lowStock && stats.products.lowStock > 0 && (
                  <>
                    <AlertTriangle className="mr-1 h-3 w-3 text-orange-500" />
                    <span className="text-orange-500">{stats.products.lowStock} stok rendah</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hasil Bulan Ini</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">RM {stats?.invoices.revenue?.toLocaleString() || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>{stats?.invoices.pending || 0} invois belum bayar</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tugas Komputasi</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.computeJobs.total || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Activity className="mr-1 h-3 w-3 text-blue-500" />
                <span className="text-blue-500">{stats?.computeJobs.running || 0} sedang berjalan</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Visualization */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trend Prestasi</CardTitle>
                  <CardDescription>Pemantauan metrik utama selama 30 hari</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="customers">Pelanggan</option>
                    <option value="revenue">Hasil</option>
                    <option value="tasks">Tugas</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Agihan Hasil</CardTitle>
              <CardDescription>Pecahan hasil mengikut kategori</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Produk', value: 400, color: '#3b82f6' },
                        { name: 'Perkhidmatan', value: 300, color: '#10b981' },
                        { name: 'Langganan', value: 200, color: '#f59e0b' },
                        { name: 'Lain-lain', value: 100, color: '#ef4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Produk', value: 400, color: '#3b82f6' },
                        { name: 'Perkhidmatan', value: 300, color: '#10b981' },
                        { name: 'Langganan', value: 200, color: '#f59e0b' },
                        { name: 'Lain-lain', value: 100, color: '#ef4444' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Tindakan Pantas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Card key={action.title} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity & Task Progress */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Aktiviti Terkini</CardTitle>
              <CardDescription>Aktiviti terbaru dalam workspace anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.timestamp}</p>
                      </div>
                      {activity.status && (
                        <Badge variant={activity.status === "completed" ? "default" : "secondary"}>
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Tiada aktiviti terkini</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Kemajuan Tugas</CardTitle>
              <CardDescription>Status tugas dan projek semasa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tugas Selesai</span>
                    <span className="text-sm text-gray-500">
                      {stats?.tasks.completed || 0}/{stats?.tasks.total || 0}
                    </span>
                  </div>
                  <Progress
                    value={stats?.tasks.total ? (stats.tasks.completed / stats.tasks.total) * 100 : 0}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Invois Dibayar</span>
                    <span className="text-sm text-gray-500">
                      {stats?.invoices.total && stats?.invoices.pending
                        ? stats.invoices.total - stats.invoices.pending
                        : 0}
                      /{stats?.invoices.total || 0}
                    </span>
                  </div>
                  <Progress
                    value={
                      stats?.invoices.total
                        ? ((stats.invoices.total - (stats.invoices.pending || 0)) / stats.invoices.total) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tugas Komputasi Selesai</span>
                    <span className="text-sm text-gray-500">
                      {stats?.computeJobs.completed || 0}/{stats?.computeJobs.total || 0}
                    </span>
                  </div>
                  <Progress
                    value={stats?.computeJobs.total ? (stats.computeJobs.completed / stats.computeJobs.total) * 100 : 0}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

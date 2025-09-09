import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cloud, Cpu, Database, Shield, Zap, Users } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Awan Keusahawanan</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Daftar Sekarang</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            Platform Terkini untuk Usahawan Malaysia
          </Badge>
          <h2 className="text-5xl font-bold text-gray-900 mb-6 text-balance">Awan Keusahawanan</h2>
          <p className="text-xl text-gray-600 mb-8 text-pretty">
            Platform cloud computing dan pengurusan perniagaan yang komprehensif untuk PKS Malaysia. Gabungan alat
            perniagaan terintegrasi dengan sumber komputasi berkuasa tinggi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Mulakan Percubaan Percuma</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">Lihat Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Semua Yang Anda Perlukan dalam Satu Platform</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Dari pengurusan pelanggan hingga pemprosesan AI berkuasa tinggi, kami menyediakan semua alat untuk
              mengembangkan perniagaan anda.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Users className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Pengurusan Pelanggan (CRM)</CardTitle>
                <CardDescription>Urus hubungan pelanggan, jejak interaksi, dan tingkatkan jualan</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Database className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Pengurusan Inventori</CardTitle>
                <CardDescription>Pantau stok, urus produk, dan dapatkan amaran stok rendah</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Shield className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Invois & Bil</CardTitle>
                <CardDescription>Cipta, hantar, dan jejak invois dengan sistem pembayaran terintegrasi</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Cpu className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle>Komputasi GPU Berkuasa</CardTitle>
                <CardDescription>Akses GPU untuk AI, machine learning, dan pemprosesan data berat</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Zap className="h-12 w-12 text-yellow-600 mb-4" />
                <CardTitle>Pemprosesan CPU Pantas</CardTitle>
                <CardDescription>Jalankan analisis data, simulasi, dan tugas komputasi intensif</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Cloud className="h-12 w-12 text-indigo-600 mb-4" />
                <CardTitle>Multi-Tenant Selamat</CardTitle>
                <CardDescription>Pengasingan data selamat dengan akses berbilang pengguna</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Harga Yang Berpatutan untuk Semua Saiz Perniagaan</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Mulakan dengan percuma, bayar mengikut penggunaan untuk sumber komputasi
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Asas</CardTitle>
                <CardDescription>Untuk perniagaan kecil</CardDescription>
                <div className="text-3xl font-bold">RM0</div>
                <div className="text-sm text-gray-500">sebulan</div>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-left">
                  <li>• 1 workspace</li>
                  <li>• 5 pengguna</li>
                  <li>• CRM & Inventori asas</li>
                  <li>• 10 invois/bulan</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 relative">
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Popular</Badge>
              <CardHeader>
                <CardTitle>Profesional</CardTitle>
                <CardDescription>Untuk perniagaan sederhana</CardDescription>
                <div className="text-3xl font-bold">RM99</div>
                <div className="text-sm text-gray-500">sebulan</div>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-left">
                  <li>• 5 workspace</li>
                  <li>• 25 pengguna</li>
                  <li>• Semua ciri asas</li>
                  <li>• Invois tanpa had</li>
                  <li>• Akses komputasi cloud</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Perusahaan</CardTitle>
                <CardDescription>Untuk perniagaan besar</CardDescription>
                <div className="text-3xl font-bold">Tersuai</div>
                <div className="text-sm text-gray-500">hubungi kami</div>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Workspace tanpa had</li>
                  <li>• Pengguna tanpa had</li>
                  <li>• Sokongan keutamaan</li>
                  <li>• GPU khusus</li>
                  <li>• Integrasi tersuai</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Cloud className="h-6 w-6" />
            <span className="text-xl font-bold">Awan Keusahawanan</span>
          </div>
          <p className="text-gray-400 mb-4">Memperkasakan usahawan Malaysia dengan teknologi cloud terkini</p>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-blue-400">
              Dasar Privasi
            </Link>
            <Link href="/terms" className="hover:text-blue-400">
              Terma Perkhidmatan
            </Link>
            <Link href="/contact" className="hover:text-blue-400">
              Hubungi Kami
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

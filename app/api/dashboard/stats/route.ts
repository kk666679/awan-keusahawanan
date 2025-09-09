import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Token tidak disediakan" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user) {
      return NextResponse.json({ error: "Token tidak sah" }, { status: 401 })
    }

    const workspaceId = request.headers.get("x-workspace-id") || user.workspaces[0]?.workspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace tidak dijumpai" }, { status: 400 })
    }

    // Get current date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Fetch all stats in parallel
    const [
      totalCustomers,
      customersThisMonth,
      customersLastMonth,
      totalProducts,
      lowStockProducts,
      totalInvoices,
      pendingInvoices,
      overdueInvoices,
      monthlyRevenue,
      totalTasks,
      completedTasks,
      totalComputeJobs,
      runningComputeJobs,
      completedComputeJobs,
    ] = await Promise.all([
      // Customers
      prisma.customer.count({ where: { workspaceId } }),
      prisma.customer.count({
        where: { workspaceId, createdAt: { gte: startOfMonth } },
      }),
      prisma.customer.count({
        where: {
          workspaceId,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),

      // Products
      prisma.product.count({ where: { workspaceId } }),
      prisma.product.count({
        where: {
          workspaceId,
          stock: { lte: prisma.product.fields.lowStock },
        },
      }),

      // Invoices
      prisma.invoice.count({ where: { workspaceId } }),
      prisma.invoice.count({
        where: { workspaceId, status: "SENT" },
      }),
      prisma.invoice.count({
        where: {
          workspaceId,
          status: "SENT",
          dueDate: { lt: now },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          workspaceId,
          status: "PAID",
          createdAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),

      // Tasks
      prisma.task.count({ where: { workspaceId } }),
      prisma.task.count({
        where: { workspaceId, status: "COMPLETED" },
      }),

      // Compute Jobs
      prisma.computeJob.count({ where: { workspaceId } }),
      prisma.computeJob.count({
        where: { workspaceId, status: "RUNNING" },
      }),
      prisma.computeJob.count({
        where: { workspaceId, status: "COMPLETED" },
      }),
    ])

    // Calculate growth percentage
    const customerGrowth =
      customersLastMonth > 0 ? ((customersThisMonth - customersLastMonth) / customersLastMonth) * 100 : 0

    const stats = {
      customers: {
        total: totalCustomers,
        thisMonth: customersThisMonth,
        growth: Math.round(customerGrowth),
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
      },
      invoices: {
        total: totalInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices,
        revenue: monthlyRevenue._sum.total || 0,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: totalTasks - completedTasks,
      },
      computeJobs: {
        total: totalComputeJobs,
        running: runningComputeJobs,
        completed: completedComputeJobs,
      },
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}

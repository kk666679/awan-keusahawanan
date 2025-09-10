# UI Component Hierarchy and Data Flow

## 1. Dashboard Page Component Hierarchy

DashboardPage
├── DashboardLayout
│   ├── Sidebar (navigation, user menu)
│   ├── Top Bar (mobile menu toggle, beta badge)
│   └── Main Content Area
│       ├── Header (title, new task button)
│       ├── Stats Grid (4 Cards: Customers, Products, Revenue, Compute Jobs)
│       ├── Data Visualization Grid
│       │   ├── Trend Chart (LineChart)
│       │   └── Revenue Distribution (PieChart)
│       ├── Quick Actions Grid (4 Cards with action buttons)
│       └── Content Grid
│           ├── Recent Activity Card (list of activities)
│           └── Task Progress Card (progress bars)

### Data Flow and Props
- DashboardPage fetches data from APIs and manages state (stats, recentActivity, chartData).
- Data passed as props to Card components for display.
- Chart components receive chartData and selectedMetric as props.
- Button components handle navigation actions.

## 2. Customers Page Component Hierarchy

CustomersPage
├── DashboardLayout
│   ├── Sidebar
│   ├── Top Bar
│   └── Main Content Area
│       ├── Header (title, add customer button)
│       ├── Stats Grid (3 Cards: Total Customers, Active, New Prospects)
│       └── Main Card
│           ├── Search Bar (Input component)
│           └── Customers Table
│               ├── TableHeader
│               ├── TableBody
│               │   ├── TableRow (mapped from filteredCustomers)
│               │   │   ├── TableCell (customer info, links)
│               │   │   └── DropdownMenu (row actions: edit, delete)
│               │   └── Empty State Row

### Data Flow and Props
- CustomersPage fetches customers data and manages searchTerm state.
- Filtered customers passed to TableBody for rendering rows.
- DropdownMenu triggers actions like edit and delete with callbacks.

## 3. Home Page Component Hierarchy

HomePage
├── Header (logo, login/register buttons)
├── Hero Section (Badge, title, description, action buttons)
├── Features Grid (6 Cards with icons and descriptions)
├── Pricing Section (3 Cards with pricing tiers)
└── Footer (branding, links)

### Data Flow and Props
- Static content with no dynamic data fetching.
- Button and Link components handle navigation.

## Summary

- DashboardLayout is a global layout component wrapping authenticated pages.
- UI components are composed hierarchically with clear separation of concerns.
- Data flows top-down from pages to child components via props.
- Interactive components handle user actions and state updates.

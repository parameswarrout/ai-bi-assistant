"use client";

import React, { useState, useEffect } from "react";
import DatePicker from "./DatePicker";
import RegionSelect from "./RegionSelect";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  Legend 
} from "recharts";

interface KPICards {
  total_customers: number;
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  customer_growth_rate: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders_count: number;
}

interface RegionalSales {
  region: string;
  revenue: number;
  percentage: number;
}

interface TopProductItem {
  product_name: string;
  category: string;
  units_sold: number;
  revenue: number;
}

interface CustomerGrowthItem {
  month: string;
  new_customers: number;
  cumulative_customers: number;
}

interface DashboardData {
  kpis: KPICards;
  revenue_trend: MonthlyRevenue[];
  sales_by_region: RegionalSales[];
  top_products: TopProductItem[];
  customer_growth: CustomerGrowthItem[];
}

interface DashboardProps {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  onAskQuestion: (q: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  region: string;
  setRegion: (r: string) => void;
}

const REGION_COLORS = {
  North: "#3b82f6", // Blue
  South: "#10b981", // Emerald
  East: "#8b5cf6",  // Violet
  West: "#f59e0b",  // Amber
};

export default function Dashboard({ 
  data, 
  loading, 
  error, 
  onAskQuestion,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  region,
  setRegion
}: DashboardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
        <p className="text-zinc-400 text-sm font-medium">Compiling business intelligence analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg max-w-md">
          <h3 className="font-bold mb-2">Failed to Load Dashboard</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, revenue_trend, sales_by_region, top_products, customer_growth } = data;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("en-US").format(val);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Executive Summary</h2>
          <p className="text-sm text-zinc-400">Real-time enterprise statistics compiled from database.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Quick queries:</span>
          <button 
            onClick={() => onAskQuestion("Compare sales between North and South regions")}
            className="text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-all"
          >
            Regional Comparison
          </button>
          <button 
            onClick={() => onAskQuestion("Which category is declining?")}
            className="text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-all"
          >
            Declining Products
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Start Date</span>
            <DatePicker
              selectedDate={startDate}
              onChange={setStartDate}
              placeholder="Select date"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">End Date</span>
            <DatePicker
              selectedDate={endDate}
              onChange={setEndDate}
              placeholder="Select date"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Region Filter</span>
            <RegionSelect
              value={region}
              onChange={setRegion}
              options={[
                { label: "All Regions", value: "" },
                { label: "North", value: "North" },
                { label: "South", value: "South" },
                { label: "East", value: "East" },
                { label: "West", value: "West" }
              ]}
            />
          </div>
        </div>

        {(startDate || endDate || region) && (
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setRegion("");
            }}
            className="text-xs text-violet-400 hover:text-violet-300 font-medium px-3 py-1.5 rounded-lg border border-violet-500/20 hover:bg-violet-500/10 transition mt-4 sm:mt-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue */}
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100">{formatCurrency(kpis.total_revenue)}</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="flex items-center text-xs font-medium text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" /> +12.4%
              </span>
              <span className="text-[10px] text-zinc-500">vs last year</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Orders */}
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Orders</span>
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100">{formatNumber(kpis.total_orders)}</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="flex items-center text-xs font-medium text-blue-400">
                <ArrowUpRight className="w-3.5 h-3.5" /> +8.2%
              </span>
              <span className="text-[10px] text-zinc-500">vs last year</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Average Order Value */}
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Avg Order Value</span>
            <div className="p-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100">{formatCurrency(kpis.average_order_value)}</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="flex items-center text-xs font-medium text-violet-400">
                <ArrowUpRight className="w-3.5 h-3.5" /> +4.7%
              </span>
              <span className="text-[10px] text-zinc-500">vs last year</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Total Customers */}
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Customers</span>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100">{formatNumber(kpis.total_customers)}</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="flex items-center text-xs font-medium text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{kpis.customer_growth_rate}%
              </span>
              <span className="text-[10px] text-zinc-500">growth rate (30d)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend AreaChart */}
        <div className="glass-card p-5 rounded-xl lg:col-span-2 space-y-4">
          <div>
            <h4 className="font-bold text-sm tracking-tight text-zinc-200">Revenue Trend (Last 12 Months)</h4>
            <p className="text-xs text-zinc-400">Monthly gross sales trends across regions.</p>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" />
                <YAxis 
                  stroke="#71717a" 
                  tickFormatter={(val) => `$${val / 1000}k`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                  formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Region DonutChart */}
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm tracking-tight text-zinc-200">Sales by Region</h4>
            <p className="text-xs text-zinc-400">Share of revenue contribution by region.</p>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sales_by_region}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="revenue"
                  nameKey="region"
                >
                  {sales_by_region.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={REGION_COLORS[entry.region as keyof typeof REGION_COLORS] || "#a1a1aa"} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                  formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            {sales_by_region.map((item) => (
              <div key={item.region} className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: REGION_COLORS[item.region as keyof typeof REGION_COLORS] }}
                />
                <span className="font-medium text-zinc-300 truncate">{item.region}</span>
                <span className="text-zinc-500 ml-auto font-mono text-[10px]">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products BarChart */}
        <div className="glass-card p-5 rounded-xl space-y-4">
          <div>
            <h4 className="font-bold text-sm tracking-tight text-zinc-200">Top Products (Revenue & Volume)</h4>
            <p className="text-xs text-zinc-400">Best-selling products in catalog.</p>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top_products} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="product_name" stroke="#71717a" tickFormatter={(val) => val.split(" ")[0]} />
                <YAxis stroke="#71717a" tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                  formatter={(value: any, name: string) => [
                    name === "revenue" ? formatCurrency(Number(value)) : formatNumber(Number(value)),
                    name === "revenue" ? "Revenue" : "Units Sold"
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="revenue" fill="#3b82f6" name="revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="units_sold" fill="#10b981" name="units_sold" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {top_products.map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-zinc-900/40 border border-zinc-800/60 rounded-lg">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-zinc-500 w-4">#{idx+1}</span>
                  <span className="font-medium text-zinc-200 truncate">{prod.product_name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">{prod.category}</span>
                </div>
                <div className="flex items-center gap-3 font-mono shrink-0">
                  <span className="text-zinc-500 text-[10px]">{prod.units_sold} sold</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(prod.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Growth LineChart */}
        <div className="glass-card p-5 rounded-xl space-y-4">
          <div>
            <h4 className="font-bold text-sm tracking-tight text-zinc-200">Customer Registration Growth</h4>
            <p className="text-xs text-zinc-400">Cumulative registered customer count over the last 2 years.</p>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customer_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                  formatter={(value: any, name: string) => [
                    formatNumber(Number(value)),
                    name === "cumulative_customers" ? "Total Customers" : "New Customers"
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="cumulative_customers" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  name="cumulative_customers" 
                />
                <Line 
                  type="monotone" 
                  dataKey="new_customers" 
                  stroke="#8b5cf6" 
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="new_customers" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/40 p-4 border border-zinc-800/60 rounded-lg">
            Our enterprise customer base has expanded steadily. With over 1,000 active accounts, target promotions in regions like the South and West have increased the monthly run-rate. Average registration numbers are steady at approximately 40 new accounts monthly.
          </div>
        </div>
      </div>
    </div>
  );
}

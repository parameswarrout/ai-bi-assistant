from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    message: str

class OllamaToggleRequest(BaseModel):
    prefer_ollama: bool

class ChatResponse(BaseModel):
    answer: str
    sql: str
    data: List[Dict[str, Any]]
    error: Optional[str] = None
    model_used: Optional[str] = None

class KPICards(BaseModel):
    total_customers: int
    total_orders: int
    total_revenue: float
    average_order_value: float
    customer_growth_rate: float # % change in last 30 days

class MonthlyRevenue(BaseModel):
    month: str
    revenue: float
    orders_count: int

class RegionalSales(BaseModel):
    region: str
    revenue: float
    percentage: float

class TopProductItem(BaseModel):
    product_name: str
    category: str
    units_sold: int
    revenue: float

class CustomerGrowthItem(BaseModel):
    month: str
    new_customers: int
    cumulative_customers: int

class DashboardData(BaseModel):
    kpis: KPICards
    revenue_trend: List[MonthlyRevenue]
    sales_by_region: List[RegionalSales]
    top_products: List[TopProductItem]
    customer_growth: List[CustomerGrowthItem]

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta

from database import get_db
from models import Customer, Order, Product, Payment
from schemas import (
    DashboardData, KPICards, MonthlyRevenue, 
    RegionalSales, TopProductItem, CustomerGrowthItem
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("", response_model=DashboardData)
def get_dashboard(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    region: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    try:
        # Build base filter params
        params = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if region:
            params["region"] = region

        # 1. Calculate KPI Metrics - Total Customers
        cust_query = db.query(Customer)
        if start_date:
            cust_query = cust_query.filter(Customer.registration_date >= start_date)
        if end_date:
            cust_query = cust_query.filter(Customer.registration_date <= end_date)
        total_customers = cust_query.count()

        # Total Orders
        orders_query = db.query(Order)
        if start_date:
            orders_query = orders_query.filter(Order.order_date >= start_date)
        if end_date:
            orders_query = orders_query.filter(Order.order_date <= end_date)
        if region:
            orders_query = orders_query.filter(Order.region == region)
        total_orders = orders_query.count()
        
        # Total Revenue
        rev_sql = "SELECT SUM(p.amount) FROM payments p JOIN orders o ON p.order_id = o.order_id"
        where_clauses = []
        if start_date:
            where_clauses.append("o.order_date >= :start_date")
        if end_date:
            where_clauses.append("o.order_date <= :end_date")
        if region:
            where_clauses.append("o.region = :region")
        if where_clauses:
            rev_sql += " WHERE " + " AND ".join(where_clauses)
            
        total_revenue_res = db.execute(text(rev_sql), params).scalar()
        total_revenue = float(total_revenue_res) if total_revenue_res else 0.0
        
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0.0
        
        # Customer growth rate in the last 30 days
        max_reg_date_str = db.execute(text("SELECT MAX(registration_date) FROM customers")).scalar()
        if max_reg_date_str:
            max_reg_date = datetime.strptime(max_reg_date_str, "%Y-%m-%d").date() if isinstance(max_reg_date_str, str) else max_reg_date_str
            cutoff_date = max_reg_date - timedelta(days=30)
            new_cust_30_days = db.query(Customer).filter(Customer.registration_date > cutoff_date).count()
            cust_before = total_customers - new_cust_30_days
            growth_rate = (new_cust_30_days / cust_before * 100) if cust_before > 0 else 0.0
        else:
            growth_rate = 0.0

        kpis = KPICards(
            total_customers=total_customers,
            total_orders=total_orders,
            total_revenue=round(total_revenue, 2),
            average_order_value=round(avg_order_value, 2),
            customer_growth_rate=round(growth_rate, 2)
        )

        # 2. Revenue Trend (last 12 months)
        trend_sql = """
            SELECT strftime('%Y-%m', p.payment_date) as month, SUM(p.amount) as revenue, COUNT(p.order_id) as orders_count
            FROM payments p
            JOIN orders o ON p.order_id = o.order_id
        """
        trend_where = []
        if start_date:
            trend_where.append("o.order_date >= :start_date")
        if end_date:
            trend_where.append("o.order_date <= :end_date")
        if region:
            trend_where.append("o.region = :region")
        if trend_where:
            trend_sql += " WHERE " + " AND ".join(trend_where)
        trend_sql += " GROUP BY month ORDER BY month DESC LIMIT 12"
        
        trend_res = db.execute(text(trend_sql), params).fetchall()
        revenue_trend = []
        for row in reversed(trend_res):  # Chronological order
            revenue_trend.append(MonthlyRevenue(
                month=row[0],
                revenue=round(float(row[1]), 2) if row[1] is not None else 0.0,
                orders_count=int(row[2])
              ))

        # 3. Sales by Region
        region_sql = """
            SELECT o.region, SUM(p.amount) as revenue
            FROM orders o
            JOIN payments p ON o.order_id = p.order_id
        """
        region_where = []
        if start_date:
            region_where.append("o.order_date >= :start_date")
        if end_date:
            region_where.append("o.order_date <= :end_date")
        if region:
            region_where.append("o.region = :region")
        if region_where:
            region_sql += " WHERE " + " AND ".join(region_where)
        region_sql += " GROUP BY o.region ORDER BY revenue DESC"
        
        region_res = db.execute(text(region_sql), params).fetchall()
        total_region_revenue = sum(float(r[1]) for r in region_res if r[1] is not None)
        sales_by_region = []
        for row in region_res:
            rev_val = float(row[1]) if row[1] is not None else 0.0
            pct = (rev_val / total_region_revenue * 100) if total_region_revenue > 0 else 0.0
            sales_by_region.append(RegionalSales(
                region=row[0],
                revenue=round(rev_val, 2),
                percentage=round(pct, 1)
            ))

        # 4. Top Products (Top 5)
        product_sql = """
            SELECT pr.product_name, pr.category, SUM(o.quantity) as units_sold, SUM(pay.amount) as revenue
            FROM products pr
            JOIN orders o ON pr.product_id = o.product_id
            JOIN payments pay ON o.order_id = pay.order_id
        """
        product_where = []
        if start_date:
            product_where.append("o.order_date >= :start_date")
        if end_date:
            product_where.append("o.order_date <= :end_date")
        if region:
            product_where.append("o.region = :region")
        if product_where:
            product_sql += " WHERE " + " AND ".join(product_where)
        product_sql += " GROUP BY pr.product_id, pr.product_name, pr.category ORDER BY revenue DESC LIMIT 5"
        
        product_res = db.execute(text(product_sql), params).fetchall()
        top_products = []
        for row in product_res:
            top_products.append(TopProductItem(
                product_name=row[0],
                category=row[1],
                units_sold=int(row[2]),
                revenue=round(float(row[3]), 2) if row[3] is not None else 0.0
            ))

        # 5. Customer Growth (Cumulative over time)
        growth_sql = """
            SELECT strftime('%Y-%m', registration_date) as month, COUNT(customer_id) as new_customers
            FROM customers
        """
        growth_where = []
        if start_date:
            growth_where.append("registration_date >= :start_date")
        if end_date:
            growth_where.append("registration_date <= :end_date")
        if growth_where:
            growth_sql += " WHERE " + " AND ".join(growth_where)
        growth_sql += " GROUP BY month ORDER BY month ASC"
        
        growth_res = db.execute(text(growth_sql), params).fetchall()
        customer_growth = []
        cumulative = 0
        for row in growth_res:
            new_custs = int(row[1])
            cumulative += new_custs
            customer_growth.append(CustomerGrowthItem(
                month=row[0],
                new_customers=new_custs,
                cumulative_customers=cumulative
            ))

        return DashboardData(
            kpis=kpis,
            revenue_trend=revenue_trend,
            sales_by_region=sales_by_region,
            top_products=top_products,
            customer_growth=customer_growth
        )

    except Exception as e:
        print(f"Error compiling dashboard data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling dashboard data: {str(e)}"
        )

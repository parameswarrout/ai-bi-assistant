import re
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta

from database import engine, Base, get_db
from models import Customer, Order, Product, Payment, Employee
from seed import generate_db_data
from schemas import ChatRequest, ChatResponse, DashboardData, KPICards, MonthlyRevenue, RegionalSales, TopProductItem, CustomerGrowthItem, OllamaToggleRequest
from bedrock_service import BedrockService

app = FastAPI(title="AI Business Intelligence Assistant API")

# Configure CORS so our Next.js frontend can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Amazon Bedrock / Local Fallback Service
bedrock = BedrockService()

@app.on_event("startup")
def startup_event():
    print("Database initialization starting...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal = next(get_db())
    try:
        generate_db_data(db)
    finally:
        db.close()
    print("Database initialized and verified.")

def validate_sql_readonly(sql: str) -> bool:
    """
    Checks if a query is a read-only query.
    Prevents SQL injection modifying statements like INSERT, UPDATE, DELETE, DROP, ALTER, etc.
    """
    # Remove single-line comments
    clean_sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE).strip().upper()
    
    # Check starts with SELECT or WITH
    if not (clean_sql.startswith("SELECT") or clean_sql.startswith("WITH")):
        return False
        
    # Forbidden keywords to prevent mutation
    forbidden_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "REPLACE", "TRUNCATE", "GRANT", "REVOKE", "INTO"]
    for kw in forbidden_keywords:
        if re.search(r'\b' + kw + r'\b', clean_sql):
            return False
            
    return True

@app.get("/api/dashboard", response_model=DashboardData)
def get_dashboard(db: Session = Depends(get_db)):
    try:
        # 1. Calculate KPI Metrics
        total_customers = db.query(Customer).count()
        total_orders = db.query(Order).count()
        
        total_revenue_res = db.execute(text("SELECT SUM(amount) FROM payments")).scalar()
        total_revenue = float(total_revenue_res) if total_revenue_res else 0.0
        
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0.0
        
        # Customer growth rate in the last 30 days
        # Since our mock dates cover the last 2 years, we calculate growth based on the latest 30 days in the database.
        # Find the max registration date
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
        trend_query = text("""
            SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as revenue, COUNT(order_id) as orders_count
            FROM payments
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        """)
        trend_res = db.execute(trend_query).fetchall()
        revenue_trend = []
        for row in reversed(trend_res):  # Chronological order
            revenue_trend.append(MonthlyRevenue(
                month=row[0],
                revenue=round(float(row[1]), 2) if row[1] is not None else 0.0,
                orders_count=int(row[2])
            ))

        # 3. Sales by Region
        region_query = text("""
            SELECT o.region, SUM(p.amount) as revenue
            FROM orders o
            JOIN payments p ON o.order_id = p.order_id
            GROUP BY o.region
            ORDER BY revenue DESC
        """)
        region_res = db.execute(region_query).fetchall()
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
        product_query = text("""
            SELECT p.product_name, p.category, SUM(o.quantity) as units_sold, SUM(pay.amount) as revenue
            FROM products p
            JOIN orders o ON p.product_id = o.product_id
            JOIN payments pay ON o.order_id = pay.order_id
            GROUP BY p.product_id, p.product_name, p.category
            ORDER BY revenue DESC
            LIMIT 5
        """)
        product_res = db.execute(product_query).fetchall()
        top_products = []
        for row in product_res:
            top_products.append(TopProductItem(
                product_name=row[0],
                category=row[1],
                units_sold=int(row[2]),
                revenue=round(float(row[3]), 2) if row[3] is not None else 0.0
            ))

        # 5. Customer Growth (Cumulative over time)
        growth_query = text("""
            SELECT strftime('%Y-%m', registration_date) as month, COUNT(customer_id) as new_customers
            FROM customers
            GROUP BY month
            ORDER BY month ASC
        """)
        growth_res = db.execute(growth_query).fetchall()
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
            status_code=status.HTTP_500_INTERNAL_SERVER_SERVER_ERROR,
            detail=f"Error compiling dashboard data: {str(e)}"
        )

@app.post("/api/chat", response_model=ChatResponse)
def post_chat(req: ChatRequest, db: Session = Depends(get_db)):
    question = req.message.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty."
        )

    try:
        # Step 1: Generate SQL query from question (using Bedrock or fallback)
        sql_query = bedrock.generate_sql(question)
        print(f"Generated SQL for '{question}': {sql_query}")

        # Step 2: Validate SQL query safety (must be READ-ONLY)
        if not validate_sql_readonly(sql_query):
            # Fallback to default safe query if Bedrock returned something unsafe or invalid
            print(f"SQL validation failed for query: {sql_query}. Executing default safe query.")
            sql_query = (
                "SELECT o.order_id, c.name as customer_name, p.product_name, o.quantity, pay.amount, o.order_date "
                "FROM orders o "
                "JOIN customers c ON o.customer_id = c.customer_id "
                "JOIN products p ON o.product_id = p.product_id "
                "JOIN payments pay ON o.order_id = pay.order_id "
                "LIMIT 5"
            )
            explanation = "The requested query was blocked by safety filters because it appeared to perform write actions or was invalid. I've retrieved the latest orders instead."
            
            # Execute safe default
            result = db.execute(text(sql_query))
            headers = list(result.keys())
            rows = result.fetchall()
            data = [dict(zip(headers, row)) for row in rows]
            
            return ChatResponse(
                answer=explanation,
                sql=sql_query,
                data=data,
                error="SQL query validation failed. Executed safe fallback query instead.",
                model_used=bedrock.get_active_model_name()
            )

        # Step 3: Run SQL query safely against SQLite
        result = db.execute(text(sql_query))
        headers = list(result.keys())
        rows = result.fetchall()
        
        # Convert SQLAlchemy row results into standard list of dictionaries
        data = []
        for r in rows:
            row_dict = {}
            for header, val in zip(headers, r):
                # Ensure date objects are converted to strings for JSON serialization
                if hasattr(val, "isoformat"):
                    row_dict[header] = val.isoformat()
                else:
                    row_dict[header] = val
            data.append(row_dict)

        # Step 4: Generate a natural business explanation of the query results
        explanation = bedrock.generate_explanation(question, sql_query, data)

        return ChatResponse(
            answer=explanation,
            sql=sql_query,
            data=data,
            model_used=bedrock.get_active_model_name()
        )

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        # Return partial response or error code
        return ChatResponse(
            answer=f"Sorry, I encountered an error while processing your request: {str(e)}",
            sql="",
            data=[],
            error=str(e),
            model_used=bedrock.get_active_model_name()
        )

@app.get("/api/ollama/status")
def get_ollama_status():
    bedrock._check_ollama_status()
    return {
        "running": bedrock.use_ollama,
        "prefer_ollama": bedrock.prefer_local_ollama,
        "model": bedrock.ollama_model
    }

@app.post("/api/ollama/toggle")
def toggle_ollama(req: OllamaToggleRequest):
    bedrock.prefer_local_ollama = req.prefer_ollama
    return {
        "status": "success",
        "prefer_ollama": bedrock.prefer_local_ollama
    }

@app.post("/api/ollama/start")
def start_ollama():
    success = bedrock.start_ollama_server()
    return {
        "status": "success" if success else "failed",
        "running": success
    }

@app.get("/api/explorer/{table_name}")
def get_explorer_table(table_name: str, db: Session = Depends(get_db)):
    # Validate table name to prevent SQL injection
    valid_tables = ["customers", "products", "orders", "employees", "payments"]
    if table_name not in valid_tables:
        raise HTTPException(status_code=400, detail="Invalid table name")
        
    try:
        query = f"SELECT * FROM {table_name} LIMIT 100"
        result = db.execute(text(query))
        headers = list(result.keys())
        rows = result.fetchall()
        
        data = []
        for r in rows:
            row_dict = {}
            for header, val in zip(headers, r):
                if hasattr(val, "isoformat"):
                    row_dict[header] = val.isoformat()
                else:
                    row_dict[header] = val
            data.append(row_dict)
            
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

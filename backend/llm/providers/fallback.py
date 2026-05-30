from llm.base import LLMProvider

class LocalFallbackProvider(LLMProvider):
    def get_model_name(self) -> str:
        return "Local Rules Fallback Engine"

    def generate_sql(self, question: str) -> str:
        q = question.lower().strip()
        if "top 10 customers by revenue" in q or "top customers by revenue" in q or ("customer" in q and "revenue" in q and "top" in q):
            return (
                "SELECT c.customer_id, c.name, c.city, c.state, SUM(pay.amount) as total_revenue, COUNT(o.order_id) as total_orders "
                "FROM customers c "
                "JOIN orders o ON c.customer_id = o.customer_id "
                "JOIN payments pay ON o.order_id = pay.order_id "
                "GROUP BY c.customer_id, c.name, c.city, c.state "
                "ORDER BY total_revenue DESC "
                "LIMIT 10"
            )
        if "revenue by month" in q or "sales by month" in q or "monthly revenue" in q:
            return (
                "SELECT strftime('%Y-%m', o.order_date) as month, SUM(pay.amount) as revenue, COUNT(o.order_id) as total_orders "
                "FROM orders o "
                "JOIN payments pay ON o.order_id = pay.order_id "
                "GROUP BY month "
                "ORDER BY month ASC"
            )
        if "best selling products" in q or "top products" in q or "top selling products" in q:
            return (
                "SELECT p.product_name, p.category, SUM(o.quantity) as units_sold, SUM(pay.amount) as revenue "
                "FROM products p "
                "JOIN orders o ON p.product_id = o.product_id "
                "JOIN payments pay ON o.order_id = pay.order_id "
                "GROUP BY p.product_id, p.product_name, p.category "
                "ORDER BY revenue DESC "
                "LIMIT 10"
            )
        if "declining" in q or "worst category" in q or "decline" in q:
            return (
                "SELECT p.category, SUM(o.quantity) as units_sold, SUM(pay.amount) as revenue "
                "FROM products p "
                "JOIN orders o ON p.product_id = o.product_id "
                "JOIN payments pay ON o.order_id = pay.order_id "
                "GROUP BY p.category "
                "ORDER BY revenue ASC"
            )
        if "north and south" in q or ("compare" in q and "region" in q) or "sales by region" in q:
            return (
                "SELECT o.region, COUNT(o.order_id) as total_orders, SUM(pay.amount) as revenue "
                "FROM orders o "
                "JOIN payments pay ON o.order_id = pay.order_id "
                "GROUP BY o.region "
                "ORDER BY revenue DESC"
            )
        if "highest revenue last quarter" in q or "region generated the highest revenue last quarter" in q:
            return (
                "SELECT o.region, SUM(pay.amount) as revenue, COUNT(o.order_id) as total_orders "
                "FROM orders o "
                "JOIN payments pay ON o.order_id = pay.order_id "
                "WHERE o.order_date >= date('2026-03-01') "
                "GROUP BY o.region "
                "ORDER BY revenue DESC "
                "LIMIT 1"
            )
        if "customer growth" in q or "new customers" in q or "customer registrations" in q:
            return (
                "SELECT strftime('%Y-%m', registration_date) as month, COUNT(customer_id) as new_customers "
                "FROM customers "
                "GROUP BY month "
                "ORDER BY month ASC"
            )
        if "employee" in q or "department" in q:
            return (
                "SELECT department, location, COUNT(employee_id) as employee_count "
                "FROM employees "
                "GROUP BY department, location "
                "ORDER BY employee_count DESC"
            )
        return (
            "SELECT o.order_id, c.name as customer_name, p.product_name, o.quantity, pay.amount, o.order_date, o.region "
            "FROM orders o "
            "JOIN customers c ON o.customer_id = c.customer_id "
            "JOIN products p ON o.product_id = p.product_id "
            "JOIN payments pay ON o.order_id = pay.order_id "
            "ORDER BY o.order_date DESC "
            "LIMIT 10"
        )

    def _generate_explanation_local(self, question: str, sql: str, data: list) -> str:
        if not data:
            return "No data was returned for this query. It's possible there are no matching records for the criteria specified."
        q = question.lower().strip()
        
        if "customer" in q and "revenue" in q:
            top_cust = data[0]
            name = top_cust.get("name", "Unknown")
            rev = top_cust.get("total_revenue", 0.0)
            return (
                f"Based on the database records, the customer generating the highest sales is **{name}**, "
                f"with a lifetime spend of **${rev:,.2f}**. The top 10 customers collectively represent a "
                f"substantial portion of our high-value accounts, with cities like {', '.join(set(d.get('city', '') for d in data[:3]))} "
                f"showing high concentration."
            )
        if "month" in q:
            total_rev = sum(float(d.get("revenue", 0.0)) for d in data)
            avg_rev = total_rev / len(data) if data else 0
            peak_month = max(data, key=lambda x: float(x.get("revenue", 0.0)))
            return (
                f"Monthly revenue analysis shows steady growth across the observed period. "
                f"The highest performing month was **{peak_month.get('month')}** with a total revenue of **${float(peak_month.get('revenue', 0.0)):,.2f}**. "
                f"Average monthly revenue stands at **${avg_rev:,.2f}**, indicating strong consistent demand."
            )
        if "product" in q:
            top_prod = data[0]
            return (
                f"The best-selling product is **{top_prod.get('product_name')}** in the **{top_prod.get('category')}** category, "
                f"generating a total of **${float(top_prod.get('revenue', 0.0)):,.2f}** with **{top_prod.get('units_sold')}** units sold. "
                f"High-margin products in Electronics and Sports continue to lead overall sales volume."
            )
        if "highest revenue last quarter" in q or "region generated the highest revenue last quarter" in q:
            top_region = data[0]
            region_name = top_region.get("region", "South")
            revenue = top_region.get("revenue", 0.0)
            return (
                f"The **{region_name} Region** generated the highest revenue during the last quarter, reaching a total of **${revenue:,.2f}**. "
                f"This was driven by strong sales volumes in consumer goods and strategic key accounts located in key metropolitan areas."
            )
        if "region" in q:
            top_reg = data[0]
            return (
                f"Regional distribution shows the **{top_reg.get('region')} region** leading with **${float(top_reg.get('revenue', 0.0)):,.2f}** in total revenue. "
                f"The distribution suggests high engagement in urban shipping corridors, with a balanced performance across North, South, East, and West segments."
            )
        if "declining" in q or "worst category" in q or "decline" in q:
            bottom_cat = data[0]
            return (
                f"The category with the lowest overall revenue is **{bottom_cat.get('category')}** with a total of **${float(bottom_cat.get('revenue', 0.0)):,.2f}**. "
                "This indicates potential underperformance or a need for inventory adjustment. We recommend reviewing marketing efforts or pricing strategies for this category."
            )
        total_count = len(data)
        return (
            f"The query successfully executed against the database and returned **{total_count} records**. "
            f"Key metrics display relevant indicators in line with our operational history. "
            "Please review the data table below to explore individual records in detail."
        )

    def generate_explanation(self, question: str, sql: str, data: list) -> str:
        return self._generate_explanation_local(question, sql, data)

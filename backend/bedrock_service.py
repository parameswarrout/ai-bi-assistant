import os
import json
import re
import urllib.request
import urllib.error
import boto3
from botocore.exceptions import BotoCoreError, ClientError

# Schema details to inject into LLM prompts
SCHEMA_CONTEXT = """
Database Schema:

1. Table: customers
   Columns:
   - customer_id (INTEGER PRIMARY KEY)
   - name (TEXT)
   - email (TEXT)
   - city (TEXT)
   - state (TEXT)
   - registration_date (DATE)

2. Table: products
   Columns:
   - product_id (INTEGER PRIMARY KEY)
   - product_name (TEXT)
   - category (TEXT)
   - price (REAL)

3. Table: orders
   Columns:
   - order_id (INTEGER PRIMARY KEY)
   - customer_id (INTEGER, FK to customers.customer_id)
   - product_id (INTEGER, FK to products.product_id)
   - quantity (INTEGER)
   - order_date (DATE)
   - region (TEXT)

4. Table: employees
   Columns:
   - employee_id (INTEGER PRIMARY KEY)
   - employee_name (TEXT)
   - department (TEXT)
   - location (TEXT)

5. Table: payments
   Columns:
   - payment_id (INTEGER PRIMARY KEY)
   - order_id (INTEGER, FK to orders.order_id)
   - amount (REAL)
   - payment_method (TEXT)
   - payment_date (DATE)
"""

class BedrockService:
    def __init__(self):
        # 1. AWS Bedrock Config
        self.aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        self.aws_session_token = os.environ.get("AWS_SESSION_TOKEN")
        self.aws_region = os.environ.get("AWS_REGION", "us-east-1")
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        
        # 2. Ollama Local LLM Config
        self.ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        # Recommend qwen2.5:3b (best for coding/SQL under 4B) or llama3.2:3b
        self.ollama_model = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
        
        self.use_bedrock = False
        self.use_ollama = False
        self.prefer_local_ollama = False

        # Attempt to initialize Bedrock
        if self.aws_access_key and self.aws_secret_key:
            try:
                self.client = boto3.client(
                    "bedrock-runtime",
                    aws_access_key_id=self.aws_access_key,
                    aws_secret_access_key=self.aws_secret_key,
                    aws_session_token=self.aws_session_token,
                    region_name=self.aws_region
                )
                self.use_bedrock = True
                print("Amazon Bedrock client initialized successfully.")
            except Exception as e:
                print(f"Error initializing Bedrock client: {e}.")
        
        # If Bedrock is not available, check for Ollama local server
        if not self.use_bedrock:
            self._check_ollama_status()
            
        if not self.use_bedrock and not self.use_ollama:
            print("Both Bedrock and Ollama are unavailable. Using built-in local SQL rules fallback engine.")

    def _check_ollama_status(self):
        """
        Pings Ollama server status endpoint to see if it is running.
        """
        try:
            url = f"{self.ollama_base_url}/api/tags"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=1.5) as response:
                if response.status == 200:
                    self.use_ollama = True
                    print(f"Ollama server detected at {self.ollama_base_url}. Using local model '{self.ollama_model}'.")
                else:
                    self.use_ollama = False
        except Exception:
            self.use_ollama = False

    def start_ollama_server(self) -> bool:
        """
        Starts the Ollama server in the background if it's not already running.
        """
        self._check_ollama_status()
        if self.use_ollama:
            return True
            
        import subprocess
        try:
            # CREATE_NO_WINDOW on Windows avoids popping up a cmd terminal
            creation_flags = 0
            if os.name == 'nt':
                # subprocess.CREATE_NO_WINDOW is 0x08000000
                creation_flags = 0x08000000
                
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=creation_flags
            )
            return True
        except Exception as e:
            print(f"Failed to launch Ollama server: {e}")
            return False

    def get_active_model_name(self) -> str:
        """
        Returns the friendly name of the active model engine being used.
        """
        if self.prefer_local_ollama:
            self._check_ollama_status()
            if self.use_ollama:
                return f"Ollama ({self.ollama_model})"
        if self.use_bedrock:
            return "AWS Bedrock (Claude 3 Sonnet)"
        
        self._check_ollama_status()
        if self.use_ollama:
            return f"Ollama ({self.ollama_model})"
        
        return "Local Rules Fallback Engine"

    def generate_sql(self, question: str) -> str:
        """
        Translates a natural language question into an SQLite query.
        """
        if self.prefer_local_ollama:
            self._check_ollama_status()
            if self.use_ollama:
                return self._generate_sql_ollama(question)

        if self.use_bedrock:
            return self._generate_sql_bedrock(question)
        elif self.use_ollama:
            return self._generate_sql_ollama(question)
        else:
            return self._generate_sql_local(question)

    def generate_explanation(self, question: str, sql: str, data: list) -> str:
        """
        Generates a natural language business explanation for the retrieved dataset.
        """
        if self.prefer_local_ollama:
            self._check_ollama_status()
            if self.use_ollama:
                return self._generate_explanation_ollama(question, sql, data)

        if self.use_bedrock:
            return self._generate_explanation_bedrock(question, sql, data)
        elif self.use_ollama:
            return self._generate_explanation_ollama(question, sql, data)
        else:
            return self._generate_explanation_local(question, sql, data)

    # =========================================================================
    # AWS BEDROCK IMPLEMENTATIONS
    # =========================================================================
    def _generate_sql_bedrock(self, question: str) -> str:
        system_prompt = (
            "You are a business analyst and SQL expert.\n"
            "Convert the user's natural language question into a single valid SQLite SQL query.\n"
            "Only use the tables and columns defined in the schema below. "
            "Do not assume any tables or columns not mentioned.\n"
            "Return ONLY the SQL query. Do not include markdown code block formatting (such as ```sql), "
            "do not include explanations, and do not include semi-colons.\n\n"
            f"{SCHEMA_CONTEXT}"
        )
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": [{"type": "text", "text": question}]}
                ],
                "temperature": 0.0
            })
            response = self.client.invoke_model(
                modelId=self.model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            response_body = json.loads(response.get("body").read())
            sql = response_body["content"][0]["text"].strip()
            return self._clean_sql(sql)
        except Exception as e:
            print(f"Bedrock SQL generation error: {e}. Falling back to Ollama or local rules.")
            self._check_ollama_status()
            if self.use_ollama:
                return self._generate_sql_ollama(question)
            return self._generate_sql_local(question)

    def _generate_explanation_bedrock(self, question: str, sql: str, data: list) -> str:
        data_summary = json.dumps(data[:20])
        system_prompt = (
            "You are a senior business intelligence analyst.\n"
            "Explain the SQL query results in a clear, concise, and professional business tone.\n"
            "Do not detail the SQL syntax in your explanation. Focus on the core business insights, "
            "trends, or top performers shown in the data.\n"
            "Keep the response to 3-5 sentences. You can use markdown bullet points for key takeaways."
        )
        prompt = (
            f"User Question: {question}\n"
            f"SQL Query Executed: {sql}\n"
            f"Query Results (first 20 rows): {data_summary}\n\n"
            "Provide the business explanation now:"
        )
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 800,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": [{"type": "text", "text": prompt}]}
                ],
                "temperature": 0.3
            })
            response = self.client.invoke_model(
                modelId=self.model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            response_body = json.loads(response.get("body").read())
            return response_body["content"][0]["text"].strip()
        except Exception as e:
            print(f"Bedrock explanation error: {e}. Falling back to Ollama or local explainer.")
            if self.use_ollama:
                return self._generate_explanation_ollama(question, sql, data)
            return self._generate_explanation_local(question, sql, data)

    # =========================================================================
    # OLLAMA (LOCAL LLM) IMPLEMENTATIONS
    # =========================================================================
    def _generate_sql_ollama(self, question: str) -> str:
        prompt = (
            "You are an expert SQL generator. Write a single SQLite SQL query to answer this question: "
            f"'{question}'\n\n"
            "CRITICAL: Only output the executable SQL query. Do not write explanations, "
            "do not use markdown formatting (like ```sql), do not use semicolons.\n"
            f"{SCHEMA_CONTEXT}"
        )
        try:
            url = f"{self.ollama_base_url}/api/generate"
            payload = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.0,
                    "stop": [";", "```", "\n\n"]
                }
            }
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url, 
                data=data_bytes, 
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10.0) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                sql = res_body.get("response", "").strip()
                return self._clean_sql(sql)
        except Exception as e:
            print(f"Ollama SQL generation error: {e}. Falling back to local rules engine.")
            return self._generate_sql_local(question)

    def _generate_explanation_ollama(self, question: str, sql: str, data: list) -> str:
        data_summary = json.dumps(data[:15])
        prompt = (
            "You are a business intelligence analyst.\n"
            f"Explain the following SQL query results for the user's question: '{question}'\n"
            f"SQL Executed: {sql}\n"
            f"Data Rows: {data_summary}\n\n"
            "Explain in 3-5 sentences focusing on business value. Do not explain SQL commands. Use bullet points."
        )
        try:
            url = f"{self.ollama_base_url}/api/generate"
            payload = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3
                }
            }
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url, 
                data=data_bytes, 
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15.0) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                return res_body.get("response", "").strip()
        except Exception as e:
            print(f"Ollama explanation error: {e}. Falling back to local explainer.")
            return self._generate_explanation_local(question, sql, data)

    # =========================================================================
    # CORE CLEANUP & LOCAL FALLBACKS
    # =========================================================================
    def _clean_sql(self, sql: str) -> str:
        if sql.startswith("```"):
            sql = re.sub(r"^```(sql)?\n", "", sql)
            sql = re.sub(r"\n```$", "", sql)
        sql = sql.replace(";", "").strip()
        return sql

    def _generate_sql_local(self, question: str) -> str:
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

import re
from abc import ABC, abstractmethod

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

SQL Generation Rules:
1. Ensure all columns referenced in SELECT, WHERE, GROUP BY, or ORDER BY exist in the tables specified in the FROM/JOIN clauses. For instance, if you reference 'state' in a GROUP BY, you MUST join the 'customers' table in the query.
2. For regional analysis (such as comparing North vs South regions), use the 'region' column in the 'orders' table (which contains 'North', 'South', 'East', 'West'). Do not confuse regions with customer states.
3. For sales, revenue, or payment amounts, join 'orders' with the 'payments' table on 'order_id' and sum the 'payments.amount' column.
4. NEVER reference the 'price' column on the 'payments' table. The 'payments' table has NO 'price' column; it has 'amount'. The 'products' table has 'price'. To calculate total revenue from the payments table, sum the 'amount' column (e.g. SUM(payments.amount)).
"""

def clean_sql(sql: str) -> str:
    if sql.startswith("```"):
        sql = re.sub(r"^```(sql)?\n", "", sql)
        sql = re.sub(r"\n```$", "", sql)
    sql = sql.replace(";", "").strip()
    return sql

class LLMProvider(ABC):
    @abstractmethod
    def generate_sql(self, question: str) -> str:
        pass

    @abstractmethod
    def generate_explanation(self, question: str, sql: str, data: list) -> str:
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        pass

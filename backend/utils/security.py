import re

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

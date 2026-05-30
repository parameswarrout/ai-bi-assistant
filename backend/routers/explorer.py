from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db

router = APIRouter(prefix="/api/explorer", tags=["explorer"])

@router.get("/{table_name}")
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

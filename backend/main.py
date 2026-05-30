from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, get_db
from seed import generate_db_data

# Import Modular Routers
from routers.dashboard import router as dashboard_router
from routers.chat import router as chat_router
from routers.ollama import router as ollama_router
from routers.explorer import router as explorer_router

app = FastAPI(title="AI Business Intelligence Assistant API")

# Configure CORS so our Next.js frontend can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup Database Seeder Event
@app.on_event("startup")
def startup_event():
    print("Database initialization starting...")
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        generate_db_data(db)
    finally:
        db.close()
    print("Database initialized and verified.")

# Register sub-routes
app.include_router(dashboard_router)
app.include_router(chat_router)
app.include_router(ollama_router)
app.include_router(explorer_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

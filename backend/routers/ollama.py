from fastapi import APIRouter
from schemas import OllamaToggleRequest, SelectModelRequest
from llm import llm_service

router = APIRouter(prefix="/api/ollama", tags=["ollama"])

@router.get("/status")
def get_ollama_status():
    llm_service._check_ollama_status()
    return {
        "running": llm_service.use_ollama,
        "prefer_ollama": llm_service.prefer_local_ollama,
        "model": llm_service.ollama_model
    }

@router.post("/toggle")
def toggle_ollama(req: OllamaToggleRequest):
    llm_service.prefer_local_ollama = req.prefer_ollama
    return {
        "status": "success",
        "prefer_ollama": llm_service.prefer_local_ollama
    }

@router.post("/start")
def start_ollama():
    success = llm_service.start_ollama_server()
    return {
        "status": "success" if success else "failed",
        "running": success
    }

@router.get("/models")
def get_ollama_models():
    models = llm_service.get_available_ollama_models()
    return {"models": models}

@router.post("/select_model")
def select_ollama_model(req: SelectModelRequest):
    llm_service.ollama_model = req.model_name
    return {"status": "success", "selected_model": llm_service.ollama_model}

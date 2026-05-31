from pydantic import BaseModel

class OllamaToggleRequest(BaseModel):
    prefer_ollama: bool

class SelectModelRequest(BaseModel):
    model_name: str

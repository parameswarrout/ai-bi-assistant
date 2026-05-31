from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    region: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None

class RunSQLRequest(BaseModel):
    session_id: str
    sql: str
    question: str

class ChatResponse(BaseModel):
    answer: str
    sql: str
    data: List[Dict[str, Any]]
    error: Optional[str] = None
    model_used: Optional[str] = None

class ChatMessageResponse(BaseModel):
    message_id: int
    sender: str
    text: str
    sql: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    model_used: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    session_id: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True

class CreateSessionRequest(BaseModel):
    session_id: str
    title: str

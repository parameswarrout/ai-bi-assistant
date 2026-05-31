from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class AgentLog(BaseModel):
    agent_name: str
    avatar: str
    role: str
    message: str
    timestamp: str

class AgentWorkspaceResponse(BaseModel):
    dialogue: List[AgentLog]
    sql: str
    data: List[Dict[str, Any]]
    chart_type: str  # "AREA", "BAR", "PIE", or "NONE"
    x_axis_key: Optional[str] = None
    y_axis_key: Optional[str] = None
    answer: str
    error: Optional[str] = None
    model_used: Optional[str] = None

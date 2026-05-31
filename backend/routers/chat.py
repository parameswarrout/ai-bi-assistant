import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from models import ChatSession, ChatMessage
from schemas import (
    ChatRequest, ChatResponse, ChatMessageResponse, 
    ChatSessionResponse, CreateSessionRequest, RunSQLRequest
)
from llm import llm_service
from utils.security import validate_sql_readonly

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("", response_model=ChatResponse)
def post_chat(req: ChatRequest, db: Session = Depends(get_db)):
    question = req.message.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty."
        )

    # Load previous history context from db and automatically create session if it doesn't exist
    history_context = ""
    if req.session_id:
        session = db.query(ChatSession).filter(ChatSession.session_id == req.session_id).first()
        if not session:
            session = ChatSession(
                session_id=req.session_id,
                title=question[:35] + "..." if len(question) > 35 else question
            )
            db.add(session)
            db.commit()
        else:
            # Load the last 4 messages of this session
            past_messages = db.query(ChatMessage).filter(
                ChatMessage.session_id == req.session_id
            ).order_by(ChatMessage.created_at.desc()).limit(4).all()
            past_messages = past_messages[::-1]
            if past_messages:
                history_context = "\n".join([f"{m.sender}: {m.text}" for m in past_messages])
        
        # Save user message
        user_msg = ChatMessage(
            session_id=req.session_id,
            sender="user",
            text=question
        )
        db.add(user_msg)
        db.commit()

    model_used = llm_service.get_active_model_name()

    try:
        # Construct dynamic question with date & region constraints for LLM SQL generation
        llm_question = question
        constraints = []
        if req.start_date:
            constraints.append(f"on or after {req.start_date}")
        if req.end_date:
            constraints.append(f"on or before {req.end_date}")
        if constraints:
            llm_question += f" (Strictly filter the SQL query to include dates { ' and '.join(constraints) })"
        
        if req.region and req.region.strip():
            llm_question += f" (Strictly filter the SQL query to only include data for the region '{req.region.strip()}')"

        # Prepend history context if available
        if history_context:
            llm_question = (
                f"Previous Conversation History:\n{history_context}\n\n"
                f"User Follow-up Question: {llm_question}\n\n"
                f"Generate a valid SQLite query for the follow-up question. Return ONLY the valid SQL query."
            )

        # Step 1: Generate SQL query from question (using Bedrock/Ollama/fallback)
        sql_query = llm_service.generate_sql(llm_question)
        print(f"Generated SQL for '{llm_question}': {sql_query}")

        # Step 2: Validate SQL query safety (must be READ-ONLY)
        if not validate_sql_readonly(sql_query):
            # Fallback to default safe query if Bedrock returned something unsafe or invalid
            print(f"SQL validation failed for query: {sql_query}. Executing default safe query.")
            sql_query = (
                "SELECT o.order_id, c.name as customer_name, p.product_name, o.quantity, pay.amount, o.order_date "
                "FROM orders o "
                "JOIN customers c ON o.customer_id = c.customer_id "
                "JOIN products p ON o.product_id = p.product_id "
                "JOIN payments pay ON o.order_id = pay.order_id "
                "LIMIT 5"
            )
            explanation = "The requested query was blocked by safety filters because it appeared to perform write actions or was invalid. I've retrieved the latest orders instead."
            
            # Execute safe default
            result = db.execute(text(sql_query))
            headers = list(result.keys())
            rows = result.fetchall()
            data = [dict(zip(headers, row)) for row in rows]
            
            if req.session_id:
                assistant_msg = ChatMessage(
                    session_id=req.session_id,
                    sender="assistant",
                    text=explanation,
                    sql=sql_query,
                    data_json=json.dumps(data) if data else None,
                    model_used=model_used
                )
                db.add(assistant_msg)
                db.commit()

            return ChatResponse(
                answer=explanation,
                sql=sql_query,
                data=data,
                error="SQL query validation failed. Executed safe fallback query instead.",
                model_used=model_used
            )

        # Step 3: Run SQL query safely against SQLite
        try:
            result = db.execute(text(sql_query))
            headers = list(result.keys())
            rows = result.fetchall()
        except Exception as db_err:
            print(f"Database execution failed for LLM generated SQL: {db_err}. Trying local fallback query...")
            # Fall back to local rules fallback query
            fallback_sql = llm_service.fallback_provider.generate_sql(question)
            print(f"Executing fallback SQL: {fallback_sql}")
            result = db.execute(text(fallback_sql))
            headers = list(result.keys())
            rows = result.fetchall()
            sql_query = fallback_sql
        
        # Convert SQLAlchemy row results into standard list of dictionaries
        data = []
        for r in rows:
            row_dict = {}
            for header, val in zip(headers, r):
                # Ensure date objects are converted to strings for JSON serialization
                if hasattr(val, "isoformat"):
                    row_dict[header] = val.isoformat()
                else:
                    row_dict[header] = val
            data.append(row_dict)

        # Step 4: Generate a natural business explanation of the query results
        exp_question = question
        if history_context:
            exp_question = f"Previous Conversation History:\n{history_context}\n\nFollow-up Question: {question}"
        explanation = llm_service.generate_explanation(exp_question, sql_query, data)

        if req.session_id:
            assistant_msg = ChatMessage(
                session_id=req.session_id,
                sender="assistant",
                text=explanation,
                sql=sql_query,
                data_json=json.dumps(data) if data else None,
                model_used=model_used
            )
            db.add(assistant_msg)
            db.commit()

        return ChatResponse(
            answer=explanation,
            sql=sql_query,
            data=data,
            model_used=model_used
        )

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        err_msg = f"Sorry, I encountered an error while processing your request: {str(e)}"
        
        if req.session_id:
            assistant_msg = ChatMessage(
                session_id=req.session_id,
                sender="assistant",
                text=err_msg,
                model_used=model_used
            )
            db.add(assistant_msg)
            db.commit()

        # Return partial response or error code
        return ChatResponse(
            answer=err_msg,
            sql="",
            data=[],
            error=str(e),
            model_used=model_used
        )

@router.post("/run_sql", response_model=ChatResponse)
def run_sql(req: RunSQLRequest, db: Session = Depends(get_db)):
    sql_query = req.sql.strip()
    session_id = req.session_id.strip()
    question = req.question.strip()
    
    # 1. Validate SQL query safety (must be READ-ONLY)
    if not validate_sql_readonly(sql_query):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The SQL query failed safety validation (must be a read-only SELECT or WITH statement)."
        )
        
    model_used = llm_service.get_active_model_name()
    
    try:
        # 2. Run SQL query safely against SQLite
        result = db.execute(text(sql_query))
        headers = list(result.keys())
        rows = result.fetchall()
        
        # Convert row results into standard list of dictionaries
        data = []
        for r in rows:
            row_dict = {}
            for header, val in zip(headers, r):
                if hasattr(val, "isoformat"):
                    row_dict[header] = val.isoformat()
                else:
                    row_dict[header] = val
            data.append(row_dict)

        # 3. Generate explanation
        explanation = llm_service.generate_explanation(question, sql_query, data)
        
        # 4. Save custom query explanation message into the chat session
        if session_id:
            assistant_msg = ChatMessage(
                session_id=session_id,
                sender="assistant",
                text=explanation,
                sql=sql_query,
                data_json=json.dumps(data) if data else None,
                model_used=f"{model_used} (Console)"
            )
            db.add(assistant_msg)
            db.commit()

        return ChatResponse(
            answer=explanation,
            sql=sql_query,
            data=data,
            model_used=f"{model_used} (Console)"
        )
    except Exception as e:
        print(f"Error running manual SQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database execution error: {str(e)}"
        )

@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_chat_sessions(db: Session = Depends(get_db)):
    return db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()

@router.post("/sessions", response_model=ChatSessionResponse)
def create_chat_session(req: CreateSessionRequest, db: Session = Depends(get_db)):
    existing = db.query(ChatSession).filter(ChatSession.session_id == req.session_id).first()
    if existing:
        return existing
    session = ChatSession(session_id=req.session_id, title=req.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/sessions/{session_id}", response_model=List[ChatMessageResponse])
def get_chat_messages(session_id: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    response_msgs = []
    for msg in messages:
        data = None
        if msg.data_json:
            try:
                data = json.loads(msg.data_json)
            except Exception:
                pass
        response_msgs.append(ChatMessageResponse(
            message_id=msg.message_id,
            sender=msg.sender,
            text=msg.text,
            sql=msg.sql,
            data=data,
            model_used=msg.model_used,
            created_at=msg.created_at
        ))
    return response_msgs

@router.delete("/sessions/{session_id}")
def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "success", "message": "Session deleted"}

# --- NEW MULTI-AGENT COLLABORATION ADD-ON ---
from schemas.agents import AgentWorkspaceResponse
from agent_team import agent_team

@router.post("/collaborative", response_model=AgentWorkspaceResponse)
def post_collaborative_chat(req: ChatRequest, db: Session = Depends(get_db)):
    question = req.message.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty."
        )
    return agent_team.run_collaborative_analysis(question, db, req.history)

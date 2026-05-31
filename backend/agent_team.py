from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from llm import llm_service
from utils.security import validate_sql_readonly
from schemas.agents import AgentLog, AgentWorkspaceResponse

class AgentTeamOrchestrator:
    def __init__(self):
        pass

    def run_collaborative_analysis(self, question: str, db: Session, history: Optional[List[Dict[str, str]]] = None) -> AgentWorkspaceResponse:
        dialogue: List[AgentLog] = []
        model_name = llm_service.get_active_model_name()
        
        # Helper to log messages
        def log_agent(name: str, avatar: str, role: str, msg: str):
            dialogue.append(AgentLog(
                agent_name=name,
                avatar=avatar,
                role=role,
                message=msg,
                timestamp=datetime.now().strftime("%H:%M:%S")
            ))

        sql_query = ""
        data = []
        headers = []
        max_attempts = 3
        attempt = 0
        error_context = ""
        explanation = ""

        # Build conversation history context
        history_context = ""
        if history:
            history_context = "\n".join([f"{h.get('sender', 'user')}: {h.get('text', '') or h.get('message', '')}" for h in history[-4:]])

        # --- STEP 1 & 2: SQL ENGINEER & RISK AUDITOR WITH RETRY LOOP ---
        scan_msg = f"Scanning database schema context. Translating user question: '{question}' into SQLite query syntax..."
        if history_context:
            scan_msg = f"Scanning database schema context. Resolving follow-up question: '{question}' with active conversation memory..."
            
        log_agent(
            "SQL Engineer 🛠️", 
            "engineer", 
            "Data & Query Specialist",
            scan_msg
        )

        while attempt < max_attempts:
            attempt += 1
            try:
                current_question = question
                if history_context:
                    current_question = (
                        f"Previous Conversation History:\n{history_context}\n\n"
                        f"User Follow-up Question: {question}\n\n"
                        f"Generate a valid SQLite query for the follow-up question. Return ONLY the valid SQL query."
                    )
                if error_context:
                    current_question = (
                        f"{question}\n\n"
                        f"[SYSTEM EXCEPTION NOTICE]\n"
                        f"Your previous attempt generated an invalid query that threw the following database error:\n"
                        f"\"{error_context}\"\n\n"
                        f"Please analyze the schema and correct the SQL syntax to ensure it runs correctly against SQLite. "
                        f"Do not repeat the error. Return ONLY the valid SQL query."
                    )
                    log_agent(
                        "SQL Engineer 🛠️", 
                        "engineer", 
                        "Data & Query Specialist",
                        f"Previous database run failed. Initiating query self-correction loop (Attempt {attempt}/{max_attempts})..."
                    )

                sql_query = llm_service.generate_sql(current_question)
                
                log_agent(
                    "SQL Engineer 🛠️", 
                    "engineer", 
                    "Data & Query Specialist",
                    f"Generated SQL candidate query:\n```sql\n{sql_query}\n```\nRequesting security safety clearance from Risk Auditor..."
                )

                log_agent(
                    "Risk Auditor 🛡️", 
                    "auditor", 
                    "Security & Optimization Auditor",
                    "Audit started. Inspecting SQL syntax for write-permission requests or mutating queries (INSERT/DELETE/UPDATE/ALTER)..."
                )
                
                # Audit safety
                is_safe = validate_sql_readonly(sql_query)
                if not is_safe:
                    raise ValueError("SECURITY EXCEPTION: Query failed read-only safety rules! Unsafe construct detected.")
                
                log_agent(
                    "Risk Auditor 🛡️", 
                    "auditor", 
                    "Security & Optimization Auditor",
                    "Validation SUCCESS. SQL query is verified as read-only. Commencing SQLite database execution..."
                )
                
                # Execute
                result = db.execute(text(sql_query))
                headers = list(result.keys())
                rows = result.fetchall()
                
                # Parse output
                data = []
                for r in rows:
                    row_dict = {}
                    for header, val in zip(headers, r):
                        if hasattr(val, "isoformat"):
                            row_dict[header] = val.isoformat()
                        else:
                            row_dict[header] = val
                    data.append(row_dict)
                
                log_agent(
                    "Risk Auditor 🛡️", 
                    "auditor", 
                    "Security & Optimization Auditor",
                    f"SQLite execution completed successfully. Retrieved {len(data)} record(s). Passing to performance analyzer."
                )
                break  # Successful execution, exit loop
                
            except Exception as e:
                error_context = str(e)
                if attempt == max_attempts:
                    log_agent(
                        "Risk Auditor 🛡️", 
                        "auditor", 
                        "Security & Optimization Auditor",
                        f"Database execution failed repeatedly: {error_context}. Forcing safe read-only fallback query."
                    )
                    sql_query = (
                        "SELECT o.order_id, c.name as customer_name, p.product_name, o.quantity, pay.amount, o.order_date "
                        "FROM orders o "
                        "JOIN customers c ON o.customer_id = c.customer_id "
                        "JOIN products p ON o.product_id = p.product_id "
                        "JOIN payments pay ON o.order_id = pay.order_id "
                        "LIMIT 10"
                    )
                    try:
                        result = db.execute(text(sql_query))
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
                    except Exception as fe:
                        return AgentWorkspaceResponse(
                            dialogue=dialogue,
                            sql=sql_query,
                            data=[],
                            chart_type="NONE",
                            answer="Collaboration aborted: database connection failure.",
                            error=str(fe),
                            model_used=model_name
                        )

        # --- STEP 3: PERFORMANCE DBA AGENT ---
        log_agent(
            "Performance DBA ⚡",
            "dba",
            "Database Operations Architect",
            "Evaluating execution indices and scanning query planner optimization logs..."
        )
        try:
            explain_result = db.execute(text(f"EXPLAIN QUERY PLAN {sql_query}"))
            explain_rows = explain_result.fetchall()
            plan_lines = []
            for r in explain_rows:
                if len(r) >= 4:
                    plan_lines.append(f"- Select {r[0]}, Order {r[1]}, From {r[2]}: {r[3]}")
                else:
                    plan_lines.append(f"- {r[-1]}")
            plan_text = "\n".join(plan_lines)
            
            dba_report = llm_service.generate_dba_plan(sql_query, plan_text)
            log_agent(
                "Performance DBA ⚡",
                "dba",
                "Database Operations Architect",
                f"SQLite EXPLAIN plan:\n```text\n{plan_text}\n```\nPerformance summary:\n{dba_report}"
            )
        except Exception as e:
            log_agent(
                "Performance DBA ⚡",
                "dba",
                "Database Operations Architect",
                f"Query plan extraction skipped: {str(e)}."
            )

        # --- STEP 4: QUALITY CONTROL AGENT ---
        log_agent(
            "Quality Control 🔍",
            "qc",
            "Data Quality & Integrity Analyst",
            "Validating dataset row counts, numerical variance, and value ranges..."
        )
        try:
            qc_report = llm_service.generate_qc_report(question, data)
            log_agent(
                "Quality Control 🔍",
                "qc",
                "Data Quality & Integrity Analyst",
                f"Sanity Check Report:\n{qc_report}"
            )
        except Exception as e:
            log_agent(
                "Quality Control 🔍",
                "qc",
                "Data Quality & Integrity Analyst",
                f"Failed to generate quality verification: {str(e)}"
            )

        # --- STEP 5: DATA DESIGNER AGENT ---
        log_agent(
            "Design Agent 🎨", 
            "designer", 
            "UI & Data Visualizer",
            "Scanning columns and row density to determine ideal visualization mapping..."
        )
        
        chart_type, x_axis_key, y_axis_key = self._determine_visualization(headers, data)
        
        if chart_type == "NONE":
            log_agent(
                "Design Agent 🎨", 
                "designer", 
                "UI & Data Visualizer",
                "The dataset does not contain matching numerical-categorical fields. Recommending raw Grid Table display."
            )
        else:
            log_agent(
                "Design Agent 🎨", 
                "designer", 
                "UI & Data Visualizer",
                f"Matched visualization criteria! Recommending a **{chart_type} Chart**.\n"
                f"* X-Axis (Label): `{x_axis_key}`\n"
                f"* Y-Axis (Value): `{y_axis_key}`"
            )

        # --- STEP 6: BUSINESS STRATEGIST AGENT ---
        log_agent(
            "Strategist Agent 📈", 
            "strategist", 
            "Business Strategy Director",
            "Evaluating SQL records to synthesize high-level corporate insights and draft strategic takeaways..."
        )
        try:
            explanation = llm_service.generate_explanation(question, sql_query, data)
            log_agent(
                "Strategist Agent 📈", 
                "strategist", 
                "Business Strategy Director",
                "Analysis complete. Sharing final executive summary."
            )
        except Exception as e:
            explanation = f"Query completed. Retrieved {len(data)} rows. Failed to generate detailed insights: {str(e)}"
            log_agent(
                "Strategist Agent 📈", 
                "strategist", 
                "Business Strategy Director",
                "Strategic brief drafting failed. Outputting raw metric summary."
            )

        # --- STEP 7: TREND FORECASTER AGENT ---
        log_agent(
            "Trend Forecaster 🔮",
            "forecaster",
            "Predictive Insights Analyst",
            "Analyzing historical transaction sequences to compile forecasting trends..."
        )
        try:
            forecast_report = llm_service.generate_forecast(question, data)
            log_agent(
                "Trend Forecaster 🔮",
                "forecaster",
                "Predictive Insights Analyst",
                f"Forecasting Projection:\n{forecast_report}"
            )
        except Exception as e:
            log_agent(
                "Trend Forecaster 🔮",
                "forecaster",
                "Predictive Insights Analyst",
                f"Forecast model skipped: {str(e)}"
            )

        # --- STEP 8: ACTION PLANNER AGENT ---
        log_agent(
            "Action Planner 🎯",
            "action",
            "Operational Business Planner",
            "Converting executive summary and forecasts into 3 concrete, immediate next steps..."
        )
        try:
            action_plan = llm_service.generate_action_plan(question, explanation, data)
            log_agent(
                "Action Planner 🎯",
                "action",
                "Operational Business Planner",
                f"Strategic action items proposed:\n{action_plan}"
            )
        except Exception as e:
            log_agent(
                "Action Planner 🎯",
                "action",
                "Operational Business Planner",
                f"Action planning aborted: {str(e)}"
            )

        return AgentWorkspaceResponse(
            dialogue=dialogue,
            sql=sql_query,
            data=data,
            chart_type=chart_type,
            x_axis_key=x_axis_key,
            y_axis_key=y_axis_key,
            answer=explanation,
            model_used=model_name
        )

    def _determine_visualization(self, headers: List[str], data: List[Dict]) -> Tuple[str, Optional[str], Optional[str]]:
        """
        Determines the best charting option based on dataset structure.
        """
        if not data or not headers:
            return "NONE", None, None

        # Convert headers to lowercase for uniform scanning
        headers_lower = [h.lower() for h in headers]
        
        # 1. Identify Y-Axis key (usually numeric representation of revenue, sales, quantity, count)
        numeric_candidates = ["revenue", "amount", "total_revenue", "sales", "quantity", "units_sold", "employee_count", "new_customers", "cumulative_customers", "price"]
        y_axis_key = None
        for cand in numeric_candidates:
            if cand in headers_lower:
                idx = headers_lower.index(cand)
                y_axis_key = headers[idx]
                break
                
        # If no strict name matches, check for any float/int values in the first row
        if not y_axis_key:
            first_row = data[0]
            for key, val in first_row.items():
                if isinstance(val, (int, float)) and key.lower() not in ["id", "customer_id", "product_id", "order_id", "employee_id", "payment_id"]:
                    y_axis_key = key
                    break

        if not y_axis_key:
            return "NONE", None, None

        # 2. Identify X-Axis key (categorical key representing month, region, category, product_name, state, city)
        time_candidates = ["month", "date", "order_date", "payment_date", "registration_date", "year"]
        cat_candidates = ["region", "category", "product_name", "department", "state", "city", "name", "employee_name"]
        
        x_axis_key = None
        is_time_series = False
        
        # Check time series candidates first (optimal for AREA/LINE)
        for cand in time_candidates:
            if cand in headers_lower:
                idx = headers_lower.index(cand)
                x_axis_key = headers[idx]
                is_time_series = True
                break
                
        # Check categorical candidates
        if not x_axis_key:
            for cand in cat_candidates:
                if cand in headers_lower:
                    idx = headers_lower.index(cand)
                    x_axis_key = headers[idx]
                    break

        # If still no key, select any string value column
        if not x_axis_key:
            first_row = data[0]
            for key, val in first_row.items():
                if key != y_axis_key and isinstance(val, str):
                    x_axis_key = key
                    break

        if not x_axis_key:
            return "NONE", None, None

        # 3. Determine Chart Type
        if is_time_series:
            return "AREA", x_axis_key, y_axis_key
            
        # For categorical, count unique values in the set
        unique_values = set(str(row.get(x_axis_key, "")) for row in data)
        unique_count = len(unique_values)
        
        # If unique count is small (e.g. 4 or fewer segments, like regions), PIE chart is great
        if unique_count > 1 and unique_count <= 4:
            return "PIE", x_axis_key, y_axis_key
            
        # If unique count is larger (e.g. 5 or more, like products or categories), BAR chart is perfect
        if unique_count > 1:
            return "BAR", x_axis_key, y_axis_key
            
        return "NONE", x_axis_key, y_axis_key

agent_team = AgentTeamOrchestrator()

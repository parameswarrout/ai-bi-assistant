import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from database import SessionLocal
from agent_team import agent_team

def run_test():
    # Enforce UTF-8 printing for Windows consoles to support emojis
    sys.stdout.reconfigure(encoding='utf-8')
    print("=== Multi-Agent Collaborative pipeline Tester ===")
    
    db = SessionLocal()
    try:
        # Prompt the agents with a regional comparison query
        question = "Compare sales between North and South regions"
        print(f"User Query: '{question}'\n")
        
        response = agent_team.run_collaborative_analysis(question, db)
        
        print("--- Dialogue Transcript ---")
        for log in response.dialogue:
            print(f"[{log.agent_name}] -> {log.message}\n")
            
        print("--- Outputs Summary ---")
        print(f"Executed SQL: {response.sql}")
        print(f"Data rows returned: {len(response.data)}")
        print(f"Chart Recommendation: {response.chart_type}")
        print(f"X-Axis: {response.x_axis_key} | Y-Axis: {response.y_axis_key}")
        print(f"Strategist Summary: {response.answer}")
        print("==================================================")
        
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()

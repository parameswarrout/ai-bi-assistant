import os
import sys

# Add backend directory to path so we can import bedrock_service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from bedrock_service import BedrockService

def test():
    print("--- Amazon Bedrock BI Assistant Tester ---")
    print(f"AWS_ACCESS_KEY_ID: {os.environ.get('AWS_ACCESS_KEY_ID', 'Missing')}")
    print(f"AWS_REGION: {os.environ.get('AWS_REGION', 'us-east-1')}")
    print("------------------------------------------")
    
    print("Initializing Bedrock service...")
    service = BedrockService()
    
    print(f"Bedrock Enabled: {service.use_bedrock}")
    print(f"Ollama Enabled: {service.use_ollama} (Model: {service.ollama_model if service.use_ollama else 'N/A'})")
    if not service.use_bedrock and not service.use_ollama:
        print("NOTE: Both Bedrock and Ollama are offline. Running in local rule-based mock generator mode.")
    
    sample_question = "What are the top 10 customers by revenue?"
    print(f"\nTranslating question: '{sample_question}'")
    
    sql = service.generate_sql(sample_question)
    print("\n--- Generated SQL ---")
    print(sql)
    
    dummy_data = [
        {"name": "James Smith", "total_revenue": 14500.50, "total_orders": 24},
        {"name": "Mary Johnson", "total_revenue": 12430.20, "total_orders": 19}
    ]
    
    print("\nGenerating explanation with dummy dataset...")
    explanation = service.generate_explanation(sample_question, sql, dummy_data)
    
    print("\n--- Business Explanation ---")
    print(explanation)
    print("----------------------------")

if __name__ == "__main__":
    test()

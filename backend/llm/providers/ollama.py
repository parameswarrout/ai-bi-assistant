import json
import urllib.request
import urllib.error
from llm.base import LLMProvider, SCHEMA_CONTEXT, clean_sql

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str, model_name: str):
        self.base_url = base_url
        self.model_name = model_name

    def get_model_name(self) -> str:
        return f"Ollama ({self.model_name})"

    def generate_sql(self, question: str) -> str:
        prompt = (
            "You are an expert SQL generator. Write a single SQLite SQL query to answer this question: "
            f"'{question}'\n\n"
            "CRITICAL: Only output the executable SQL query. Do not write explanations, "
            "do not use markdown formatting (like ```sql), do not use semicolons.\n"
            f"{SCHEMA_CONTEXT}"
        )
        try:
            url = f"{self.base_url}/api/generate"
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.0,
                    "stop": [";", "```", "\n\n"]
                }
            }
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url, 
                data=data_bytes, 
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10.0) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                sql = res_body.get("response", "").strip()
                return clean_sql(sql)
        except Exception as e:
            print(f"Ollama SQL generation error: {e}")
            raise e

    def generate_explanation(self, question: str, sql: str, data: list) -> str:
        data_summary = json.dumps(data[:15])
        prompt = (
            "You are a business intelligence analyst.\n"
            f"Explain the following SQL query results for the user's question: '{question}'\n"
            f"SQL Executed: {sql}\n"
            f"Data Rows: {data_summary}\n\n"
            "Explain in 3-5 sentences focusing on business value. Do not explain SQL commands. Use bullet points."
        )
        try:
            url = f"{self.base_url}/api/generate"
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3
                }
            }
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url, 
                data=data_bytes, 
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15.0) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                return res_body.get("response", "").strip()
        except Exception as e:
            print(f"Ollama explanation error: {e}")
            raise e

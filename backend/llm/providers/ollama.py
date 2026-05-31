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

    def generate_dba_plan(self, sql: str, plan_text: str) -> str:
        prompt = (
            "You are a database performance tuner. Analyze this SQLite query and its EXPLAIN QUERY PLAN output:\n"
            f"Query: {sql}\n"
            f"Explain Plan:\n{plan_text}\n\n"
            "Summarize the performance (explain table scans, index usage) in 2-3 sentences. Suggest indexes if needed."
        )
        return self._generate_raw_prompt(prompt)

    def generate_qc_report(self, question: str, data: list) -> str:
        data_summary = json.dumps(data[:15])
        prompt = (
            "You are a data quality analyst. Scan this summary of query results:\n"
            f"User Question: {question}\n"
            f"Data Preview: {data_summary}\n\n"
            "State if the dataset is clean, describe the range of values (min, max, average) or keys, and confirm verification success in 2-3 sentences."
        )
        return self._generate_raw_prompt(prompt)

    def generate_forecast(self, question: str, data: list) -> str:
        data_summary = json.dumps(data[:15])
        prompt = (
            "You are a predictive data analyst. Based on this historical data:\n"
            f"Data: {data_summary}\n\n"
            "Project future trends or quarterly growth rates in 2-3 sentences. Be realistic and state specific percentages if applicable."
        )
        return self._generate_raw_prompt(prompt)

    def generate_action_plan(self, question: str, explanation: str, data: list) -> str:
        data_summary = json.dumps(data[:10])
        prompt = (
            "You are a business strategist. Provide exactly 3 short bullet-point operational action items based on this analysis:\n"
            f"User Question: {question}\n"
            f"Data Summary: {data_summary}\n"
            f"Analysis Brief: {explanation}\n\n"
            "Format as exactly 3 short bullet points starting with a hyphen. Start each bullet point with a strong verb."
        )
        return self._generate_raw_prompt(prompt)

    def _generate_raw_prompt(self, prompt: str) -> str:
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
            with urllib.request.urlopen(req, timeout=12.0) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                return res_body.get("response", "").strip()
        except Exception as e:
            print(f"Ollama raw prompt generation error: {e}")
            return "Unable to compile agent feedback due to local provider constraints."

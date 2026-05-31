import json
from typing import Optional
import boto3
from llm.base import LLMProvider, SCHEMA_CONTEXT, clean_sql

class AWSBedrockProvider(LLMProvider):
    def __init__(self, aws_access_key: Optional[str], aws_secret_key: Optional[str], aws_session_token: Optional[str], aws_region: str):
        self.aws_access_key = aws_access_key
        self.aws_secret_key = aws_secret_key
        self.aws_session_token = aws_session_token
        self.aws_region = aws_region
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        self.client = None
        self.available = False
        
        if self.aws_access_key and self.aws_secret_key:
            try:
                self.client = boto3.client(
                    "bedrock-runtime",
                    aws_access_key_id=self.aws_access_key,
                    aws_secret_access_key=self.aws_secret_key,
                    aws_session_token=self.aws_session_token,
                    region_name=self.aws_region
                )
                self.available = True
                print("AWS Bedrock LLM Provider initialized successfully.")
            except Exception as e:
                print(f"Error initializing AWS Bedrock client: {e}.")

    def get_model_name(self) -> str:
        return "AWS Bedrock (Claude 3 Sonnet)"

    def generate_sql(self, question: str) -> str:
        system_prompt = (
            "You are a business analyst and SQL expert.\n"
            "Convert the user's natural language question into a single valid SQLite SQL query.\n"
            "Only use the tables and columns defined in the schema below. "
            "Do not assume any tables or columns not mentioned.\n"
            "Return ONLY the SQL query. Do not include markdown code block formatting (such as ```sql), "
            "do not include explanations, and do not include semi-colons.\n\n"
            f"{SCHEMA_CONTEXT}"
        )
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": [{"type": "text", "text": question}]}
                ],
                "temperature": 0.0
            })
            response = self.client.invoke_model(
                modelId=self.model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            response_body = json.loads(response.get("body").read())
            sql = response_body["content"][0]["text"].strip()
            return clean_sql(sql)
        except Exception as e:
            print(f"Bedrock SQL generation error: {e}")
            raise e

    def generate_explanation(self, question: str, sql: str, data: list) -> str:
        data_summary = json.dumps(data[:20])
        system_prompt = (
            "You are a senior business intelligence analyst.\n"
            "Explain the SQL query results in a clear, concise, and professional business tone.\n"
            "Do not detail the SQL syntax in your explanation. Focus on the core business insights, "
            "trends, or top performers shown in the data.\n"
            "Keep the response to 3-5 sentences. You can use markdown bullet points for key takeaways."
        )
        prompt = (
            f"User Question: {question}\n"
            f"SQL Query Executed: {sql}\n"
            f"Query Results (first 20 rows): {data_summary}\n\n"
            "Provide the business explanation now:"
        )
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 800,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": [{"type": "text", "text": prompt}]}
                ],
                "temperature": 0.3
            })
            response = self.client.invoke_model(
                modelId=self.model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            response_body = json.loads(response.get("body").read())
            return response_body["content"][0]["text"].strip()
        except Exception as e:
            print(f"Bedrock explanation error: {e}")
            raise e

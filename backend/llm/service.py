import os
import json
import urllib.request
import urllib.error

from llm.base import LLMProvider
from llm.providers.bedrock import AWSBedrockProvider
from llm.providers.ollama import OllamaProvider
from llm.providers.fallback import LocalFallbackProvider

class LLMService:
    def __init__(self):
        # 1. AWS Configuration
        self.aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        self.aws_session_token = os.environ.get("AWS_SESSION_TOKEN")
        self.aws_region = os.environ.get("AWS_REGION", "us-east-1")
        
        # 2. Ollama Configuration
        self.ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self._ollama_model = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
        
        # Options
        self.prefer_local_ollama = False
        self.use_ollama = False
        
        # Initialize providers
        self.bedrock_provider = AWSBedrockProvider(
            self.aws_access_key, self.aws_secret_key, self.aws_session_token, self.aws_region
        )
        self.ollama_provider = OllamaProvider(self.ollama_base_url, self._ollama_model)
        self.fallback_provider = LocalFallbackProvider()

        # Initial check for Ollama status
        self._check_ollama_status()
        
        if not self.bedrock_provider.available and not self.use_ollama:
            print("Both Bedrock and Ollama are unavailable. Using built-in local SQL rules fallback engine.")

    def _check_ollama_status(self):
        """
        Pings Ollama server status endpoint to see if it is running.
        """
        try:
            url = f"{self.ollama_base_url}/api/tags"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=1.5) as response:
                if response.status == 200:
                    self.use_ollama = True
                    # Sync concrete provider model name
                    self.ollama_provider.model_name = self._ollama_model
                else:
                    self.use_ollama = False
        except Exception:
            self.use_ollama = False

    @property
    def ollama_model(self) -> str:
        return self._ollama_model

    @ollama_model.setter
    def ollama_model(self, val: str):
        self._ollama_model = val
        if hasattr(self, 'ollama_provider'):
            self.ollama_provider.model_name = val

    def get_available_ollama_models(self) -> list:
        """
        Queries Ollama server for downloaded local models.
        """
        self._check_ollama_status()
        if not self.use_ollama:
            return []
        try:
            url = f"{self.ollama_base_url}/api/tags"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=1.5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    return [m["name"] for m in data.get("models", [])]
        except Exception:
            pass
        return []

    def start_ollama_server(self) -> bool:
        """
        Starts the Ollama server in the background if it's not already running.
        """
        self._check_ollama_status()
        if self.use_ollama:
            return True
            
        import subprocess
        try:
            creation_flags = 0
            if os.name == 'nt':
                creation_flags = 0x08000000
                
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=creation_flags
            )
            return True
        except Exception as e:
            print(f"Failed to launch Ollama server: {e}")
            return False

    def get_active_provider(self) -> LLMProvider:
        """
        Returns the concrete provider instance currently active based on preferences and availability.
        """
        if self.prefer_local_ollama:
            self._check_ollama_status()
            if self.use_ollama:
                return self.ollama_provider
                
        if self.bedrock_provider.available:
            return self.bedrock_provider
            
        self._check_ollama_status()
        if self.use_ollama:
            return self.ollama_provider
            
        return self.fallback_provider

    def get_active_model_name(self) -> str:
        """
        Returns the active model provider friendly name.
        """
        return self.get_active_provider().get_model_name()

    def generate_sql(self, question: str) -> str:
        provider = self.get_active_provider()
        try:
            return provider.generate_sql(question)
        except Exception as e:
            print(f"Active provider '{provider.get_model_name()}' failed to generate SQL. Trying fallback...")
            if provider != self.fallback_provider:
                return self.fallback_provider.generate_sql(question)
            raise e

    def generate_explanation(self, question: str, sql: str, data: list) -> str:
        provider = self.get_active_provider()
        try:
            return provider.generate_explanation(question, sql, data)
        except Exception as e:
            print(f"Active provider '{provider.get_model_name()}' failed to generate explanation. Trying fallback...")
            if provider != self.fallback_provider:
                return self.fallback_provider.generate_explanation(question, sql, data)
            raise e

    def generate_dba_plan(self, sql: str, plan_text: str) -> str:
        provider = self.get_active_provider()
        try:
            return provider.generate_dba_plan(sql, plan_text)
        except Exception as e:
            print(f"Active provider '{provider.get_model_name()}' failed to generate DBA plan. Trying fallback...")
            if provider != self.fallback_provider:
                return self.fallback_provider.generate_dba_plan(sql, plan_text)
            raise e

    def generate_qc_report(self, question: str, data: list) -> str:
        provider = self.get_active_provider()
        try:
            return provider.generate_qc_report(question, data)
        except Exception as e:
            print(f"Active provider '{provider.get_model_name()}' failed to generate QC report. Trying fallback...")
            if provider != self.fallback_provider:
                return self.fallback_provider.generate_qc_report(question, data)
            raise e

    def generate_forecast(self, question: str, data: list) -> str:
        provider = self.get_active_provider()
        try:
            return provider.generate_forecast(question, data)
        except Exception as e:
            print(f"Active provider '{provider.get_model_name()}' failed to generate forecast. Trying fallback...")
            if provider != self.fallback_provider:
                return self.fallback_provider.generate_forecast(question, data)
            raise e

    def generate_action_plan(self, question: str, explanation: str, data: list) -> str:
        provider = self.get_active_provider()
        try:
            return provider.generate_action_plan(question, explanation, data)
        except Exception as e:
            print(f"Active provider '{provider.get_model_name()}' failed to generate action plan. Trying fallback...")
            if provider != self.fallback_provider:
                return self.fallback_provider.generate_action_plan(question, explanation, data)
            raise e

# Shared Singleton Instance
llm_service = LLMService()

# AI Business Intelligence Assistant (Proof of Concept)

A modern, full-stack enterprise analytics platform that allows users to ask business questions in natural language, automatically translates them into SQL queries executed against an SQLite database, and generates business-oriented summaries.

---

## 🚀 Tech Stack
* **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS, Recharts (Modern Dark Theme with glassmorphism)
* **Backend**: FastAPI, SQLAlchemy (ORM)
* **Database**: SQLite (10,000 orders, 1,000 customers, 100 products, payments, and employees)
* **AI Engine**: Abstracted multi-provider layer supporting Amazon Bedrock Claude 3 Sonnet & Local Ollama (e.g. `qwen2.5:3b`) with zero-config local rules fallback engine.

---

## ✨ Advanced Features
* **📅 Dynamic Dashboard Filters**: Curved liquid glassmorphic date pickers (`DatePicker.tsx`) and region selectors (`RegionSelect.tsx`) situated at the top of the Executive Summary Dashboard.
  - Clicking on the date fields programmatically triggers the native browser calendar popup.
  - All dashboard filter constraints are automatically forwarded to subsequent AI Chat queries to limit the generated SQL scope.
* **💾 Chat History Persistence (SQLite)**: Saves users' conversation history in the SQLite database automatically. Conversations are persistent across page reloads. Includes sidebar options to delete sessions or start new chats.
* **📝 Edit & Re-run SQL Console**: Expandable SQL panels feature a "pencil" edit button that transforms the codeblock into a custom textarea SQL editor, allowing business developers to tweak queries and execute them against the database.
* **📥 CSV Dataset Exporter**: Buttons next to generated chat result tables and direct inspector grids let users instantly download analytical outputs in a standard CSV format.
* **🎛️ Local LLM Sidebar Toggle**: Control the Local Model (Ollama) directly from the sidebar. Features a live status indicator showing:
  - 🟢 **Ollama Active**: Server is up and queries are routed locally.
  - ⚪ **Ollama Offline**: Local server is stopped.
  - 🟣 **Starting...**: Spinner showing the background server booting.
* **Auto-Booting Ollama Service**: Toggling "ON" when Ollama is offline automatically launches `ollama serve` in the background (using a headless Windows/Unix subprocess) and polls the status until connected.
* **Dynamic Engine Attribution**: Each message in the chat panel displays an explicit badge (e.g., `Answered by Ollama (qwen2.5:3b)` or `Answered by AWS Bedrock`), and the header dynamically tracks the last active engine.
* **Direct Database Explorer (Bypass LLM)**: Optimized explorer screen queries the database directly (`/api/explorer/*`) to display data instantly, saving token cost and avoiding unnecessary LLM roundtrips.

---

## 📁 Directory Structure
```
ai_bi_assistant/
├── docker-compose.yml
├── README.md
├── .gitignore
├── .env
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py (FastAPI App Entry Point)
│   ├── database.py (SQLAlchemy Session Factory)
│   ├── seed.py (DB Data Generator)
│   ├── models/ (Database Models Package)
│   │   ├── __init__.py
│   │   ├── business.py
│   │   └── chat.py
│   ├── schemas/ (Pydantic Validation Models Package)
│   │   ├── __init__.py
│   │   ├── chat.py
│   │   ├── dashboard.py
│   │   └── ollama.py
│   ├── llm/ (Modular LLM Service Package)
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── service.py
│   │   └── providers/
│   │       ├── bedrock.py
│   │       ├── ollama.py
│   │       └── fallback.py
│   ├── routers/ (APIRouters Package)
│   │   ├── chat.py
│   │   ├── dashboard.py
│   │   ├── explorer.py
│   │   └── ollama.py
│   └── utils/ (Utility Modules Package)
│       └── security.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/ (layout, page, globals.css)
│   │   ├── components/ (Dashboard, ChatPanel, Sidebar, Explorer, DatePicker, RegionSelect)
│   │   └── lib/ (utils)
└── scripts/
    └── test_bedrock.py
```

---

## 🔌 Multi-Mode AI Translation Engine
The backend supports three distinct translation layers (checked in order):

1. **Amazon Bedrock Mode (Cloud LLM)**: If AWS keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are supplied, the app defaults to **Claude 3 Sonnet** to generate database-compliant SQL queries and write summaries.
2. **Ollama Local LLM Mode (Local LLM)**: Toggled dynamically in the UI. If enabled, the system boots/polls the local Ollama server (listening at `http://localhost:11434`) and uses the lightweight **`qwen2.5:3b`** (or **`llama3.2:3b`**).
3. **Built-in Local SQL Engine (Mock Fallback)**: If neither AWS Bedrock nor Ollama is configured or reachable, it triggers an intelligent, zero-config local rule engine mapping queries directly to valid SQLite operations.

### 🦙 Quick Local LLM Setup (Ollama <4B)
1. Download and install Ollama from [ollama.com](https://ollama.com).
2. Pull the lightweight Qwen 2.5 3B model (excellent for SQL tasks):
   ```bash
   ollama pull qwen2.5:3b
   ```
3. Set your variables in the root `.env` file:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=qwen2.5:3b
   ```

---

## 🐳 Running with Docker Compose (Recommended)

1. Open your terminal in the `ai_bi_assistant` directory.
2. (Optional) Define your AWS credentials in your environment variables:
   ```bash
   # Windows (PowerShell)
   $env:AWS_ACCESS_KEY_ID="your_access_key"
   $env:AWS_SECRET_ACCESS_KEY="your_secret_key"
   $env:AWS_REGION="us-east-1"
   
   # Linux/macOS
   export AWS_ACCESS_KEY_ID="your_access_key"
   export AWS_SECRET_ACCESS_KEY="your_secret_key"
   export AWS_REGION="us-east-1"
   ```
3. Run the services:
   ```bash
   docker-compose up --build
   ```
4. Access the applications:
   * **Frontend UI**: `http://localhost:3001`
   * **FastAPI Docs**: `http://localhost:8000/docs`

---

## 💻 Running Locally (Manual Setup)

### 1. Backend Setup
Activate the virtual environment inside the `backend` folder (or root) and install dependencies.
```bash
# In e:/ai_bi_assistant/
# Activate venv (Windows)
.venv\Scripts\activate

# Install requirements
pip install -r backend/requirements.txt

# Launch FastAPI server
python backend/main.py
```
*Backend will run on `http://localhost:8000`*

### 2. Frontend Setup
Install npm packages and start Next.js in development mode.
```bash
cd frontend
npm install
npm run dev
```
*Frontend will run on `http://localhost:3001`*

---

## 💡 Example Queries to Try in AI Chat
* "What are the top 10 customers by revenue?"
* "Show me monthly revenue for the last year."
* "Compare sales between North and South regions"
* "Which region generated the highest revenue last quarter?"
* "What are the best selling products?"
* "Which product category is declining?"

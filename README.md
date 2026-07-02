# ComplAI Sales Orchestrator

<video src="https://raw.githubusercontent.com/ramveer93/sales-orchestrator/master/assets/sales_email_orchestrator.mp4" autoplay loop muted playsinline width="100%"></video>

This project is an AI-powered sales email generator for **ComplAI**, a SaaS tool that simplifies SOC2 compliance and audit preparation. 

Instead of a single AI generating an email, this project uses an **Agent Orchestration** pattern (via `openai-agents`) where multiple AI "Sales Agents" with different personalities write distinct drafts. A "Sales Manager" AI then evaluates the drafts, selects the best one, and automatically sends it to the target via the Resend API.

The backend is built with **FastAPI** and uses Server-Sent Events (SSE) to stream the orchestration process back to a client in real-time.

## How it Works (Agent Orchestration)

When a request comes in (e.g., "Write a cold sales email to a startup CEO"), the system triggers the **Sales Manager Agent**. The Manager acts as the orchestrator and has access to several tools. 

```mermaid
graph TD
    User([User Request]) --> Manager[Sales Manager Agent]
    
    subgraph Agent Tools
        Agent1[Professional Sales Agent]
        Agent2[Humorous Sales Agent]
        Agent3[Executive Sales Agent]
    end
    
    Manager -- "Draft 1" --> Agent1
    Manager -- "Draft 2" --> Agent2
    Manager -- "Draft 3" --> Agent3
    
    Agent1 -. "Returns Draft" .-> Manager
    Agent2 -. "Returns Draft" .-> Manager
    Agent3 -. "Returns Draft" .-> Manager
    
    Manager -- "Evaluates Drafts" --> Manager
    Manager -- "Selects Best & Sends" --> EmailTool[Send Email Tool]
    
    EmailTool -- "Resend API" --> Target([Client Inbox])
```

### 1. Generation Phase
The Sales Manager invokes three different sub-agents (exposed as tools) to generate three distinct drafts:
- **Professional Agent**: Writes with gravitas, seriousness, and credibility.
- **Humorous Agent**: Writes in a witty, engaging, and funny style.
- **Executive Agent**: Writes highly concise, to-the-point emails.

### 2. Evaluation Phase
Once all three drafts are generated, the Manager Agent reviews them based on the provided user context and evaluates which one is the most effective. 

### 3. Execution Phase
After selecting the winning draft, the Manager Agent invokes the `send_email_tool`, which dynamically generates the email subject and sends the plain text & HTML bodies via the **Resend API**.

## Getting Started

1. Set up a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```
2. Create a `.env` file in the `backend/` directory with your API keys:
   ```env
   RESEND_API_KEY=your_resend_api_key
   OPENAI_API_KEY=your_openai_api_key
   FROM_EMAIL_ADDRESS=LogSense <no-reply@devorbit.live>
   TO_EMAIL_ADDRESS=target@example.com
   ```
3. Run the backend server:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

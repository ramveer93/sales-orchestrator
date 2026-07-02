from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from agents import Runner, trace
from app_agents.sales_agents import create_sales_manager
from templates.templates import manager_task
import json
import asyncio
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def event_generator(prompt: str, prospect_name: str | None = None, company_name: str | None = None):
    logger.info("[ORCHESTRATOR] Entering event_generator with prompt: %s, prospect: %s, company: %s", prompt, prospect_name, company_name)
    
    # Create a fresh agent with the dynamic context
    sales_manager = create_sales_manager(prospect_name=prospect_name, company_name=company_name)
    
    # We yield the manager task automatically to guide it if the user just says "start"
    # Or we append the user's prompt to the manager_task
    input_text = manager_task + "\n\nUser Context: " + prompt
    pending_tools: list[str] = []
    
    try:
        with trace("sales_orchestrator") as current_trace:
            logger.info(f"[ORCHESTRATOR] Started trace. Trace ID: {current_trace.trace_id}")
            result = Runner.run_streamed(sales_manager, input_text) # type: ignore
            async for event in result.stream_events():
                # Handle standard text deltas
                if hasattr(event, "data") and hasattr(event.data, "delta") and type(event.data).__name__ == "ResponseTextDeltaEvent":
                    yield json.dumps({"type": "text", "content": event.data.delta}) + "\n"
                
                # Handle tool and item events
                elif hasattr(event, "item"):
                    item_type = type(event.item).__name__
                    if item_type == "ToolCallItem":
                        tool_name = getattr(event.item.raw_item, "name", None) or event.item.title or "unknown_tool"
                        pending_tools.append(tool_name)
                        logger.info("[ORCHESTRATOR] ToolCallStarted: %s", tool_name)
                        yield json.dumps({"type": "tool_start", "content": f"Invoking {tool_name}..."}) + "\n"
                        
                        # Extract email details when the send_email_tool is invoked
                        if tool_name == "send_email_tool":
                            try:
                                args = json.loads(event.item.raw_item.arguments)
                                to_address = os.getenv("TO_EMAIL_ADDRESS", "unknown")
                                yield json.dumps({
                                    "type": "email_sent",
                                    "content": {
                                        "subject": args.get("subject", ""),
                                        "text_body": args.get("text_body", ""),
                                        "html_body": args.get("html_body", ""),
                                        "to": to_address,
                                    }
                                }) + "\n"
                                logger.info("[ORCHESTRATOR] Emitted email_sent event to %s", to_address)
                            except Exception as parse_err:
                                logger.warning("[ORCHESTRATOR] Could not parse email args: %s", parse_err)
                        
                    elif item_type == "ToolCallOutputItem":
                        completed_tool = pending_tools.pop(0) if pending_tools else "unknown_tool"
                        logger.info("[ORCHESTRATOR] ToolCallCompleted: %s", completed_tool)
                        yield json.dumps({"type": "tool_end", "content": f"Finished {completed_tool}."}) + "\n"
                        
                        # Emit agent draft content for sales email writers
                        if completed_tool.startswith("sales_email_writer_"):
                            draft_content = getattr(event.item, "output", "") or ""
                            agent_label = {
                                "sales_email_writer_1": "Professional Agent",
                                "sales_email_writer_2": "Humorous Agent",
                                "sales_email_writer_3": "Executive Agent",
                            }.get(completed_tool, completed_tool)
                            yield json.dumps({
                                "type": "agent_draft",
                                "content": {
                                    "agent": agent_label,
                                    "tool": completed_tool,
                                    "draft": draft_content,
                                }
                            }) + "\n"
                            logger.info("[ORCHESTRATOR] Emitted agent_draft for %s", agent_label)
                    
            logger.info("[ORCHESTRATOR] Stream completed successfully. Trace ID: %s", current_trace.trace_id)
            
    except Exception as e:
        logger.error(f"[ORCHESTRATOR] Error in stream: {e}", exc_info=True)
        yield json.dumps({"type": "error", "content": str(e)}) + "\n"
    finally:
        logger.info("[ORCHESTRATOR] Exiting event_generator")

@app.post("/api/chat")
async def chat_endpoint(request: Request):
    logger.info("[API] Received request at /api/chat")
    data = await request.json()
    prompt = data.get("prompt", "Write a cold sales email")
    prospect_name = data.get("prospect_name", None)
    company_name = data.get("company_name", None)
    logger.info("[API] Extracted prompt from request (prospect=%s, company=%s)", prospect_name, company_name)
    return EventSourceResponse(event_generator(prompt, prospect_name=prospect_name, company_name=company_name))

@app.get("/")
def health_check():
    logger.info("[API] Received health check request")
    return {"status": "ok"}

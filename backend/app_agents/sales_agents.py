import os
from dotenv import load_dotenv
from agents import Agent

from templates.templates import (
    get_instructions,
    get_manager_instructions,
    description,
)
from tools.tools import send_email_tool

load_dotenv(override=True)
MODEL_NAME = "gpt-5.4-mini"


def create_sales_manager(prospect_name: str | None = None, company_name: str | None = None) -> Agent:
    """Create a Sales Manager agent with dynamic prospect and company context."""
    instructions1, instructions2, instructions3 = get_instructions(prospect_name, company_name)
    manager_instructions = get_manager_instructions(company_name)

    sales_agent1 = Agent(name="Professional Sales Agent", instructions=instructions1, model=MODEL_NAME)
    sales_agent2 = Agent(name="Humorous Sales Agent", instructions=instructions2, model=MODEL_NAME)
    sales_agent3 = Agent(name="Executive Sales Agent", instructions=instructions3, model=MODEL_NAME)

    tool1 = sales_agent1.as_tool(tool_name="sales_email_writer_1", tool_description=description)
    tool2 = sales_agent2.as_tool(tool_name="sales_email_writer_2", tool_description=description)
    tool3 = sales_agent3.as_tool(tool_name="sales_email_writer_3", tool_description=description)

    tools = [tool1, tool2, tool3, send_email_tool]

    return Agent(name="Sales Manager", instructions=manager_instructions, tools=tools, model=MODEL_NAME)

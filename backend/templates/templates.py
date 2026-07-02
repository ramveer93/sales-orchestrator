import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Dynamic config from environment (used as defaults if user doesn't specify)
SENDER_NAME = os.getenv("SENDER_NAME", "Your Name")
PROSPECT_FIRST_NAME = os.getenv("PROSPECT_FIRST_NAME", "there")
COMPANY_NAME = os.getenv("COMPANY_NAME", "ComplAI")


def get_intro(prospect_name: str | None = None, company_name: str | None = None) -> str:
    name = prospect_name or PROSPECT_FIRST_NAME
    company = company_name or COMPANY_NAME
    return f"""
You are a sales agent working for {company}, 
a company that provides a SaaS tool for ensuring SOC2 compliance and preparing for audits, powered by AI.
You write cold sales emails.

IMPORTANT RULES:
- Address the prospect by their first name: {name}
- Sign off the email with the sender's name: {SENDER_NAME}
- Never use placeholders like [First Name], [Your Name], or [Company]. Always use the actual values provided above.
"""


def get_instructions(prospect_name: str | None = None, company_name: str | None = None) -> tuple:
    intro = get_intro(prospect_name, company_name)
    instr1 = intro + "Your email style is professional, serious, with gravitas and credibility."
    instr2 = intro + "Your email style is witty, engaging, and humorous."
    instr3 = intro + "Your email style is concise, to the point, in the style of a busy senior executive."
    return instr1, instr2, instr3


description = "Use this tool to write a sales email. In the input, just instruct it to write a sales email."


def get_manager_instructions(company_name: str | None = None) -> str:
    company = company_name or COMPANY_NAME
    return f"""
You are a Sales Manager at {company}. Your goal is to find the single best cold sales email using the sales_writer tools.
"""


manager_task = """
Follow these steps:

1. Generate Drafts: Use each of the three sales_email_writer tools to generate different email drafts.
Just instruct each to write a sales email; no further details are needed.
Do not proceed until all three drafts are ready, one from each tool.
 
2. Evaluate and Select: Review the drafts and choose the single best email using your judgment of which one is most effective.
 
3. Use your tool to send the best email (and only the best email) to the user. Only send 1 email.
"""

import os
from typing import Dict
from dotenv import load_dotenv
import resend
from agents import function_tool

load_dotenv(override=True)

FROM_EMAIL_ADDRESS = os.getenv("FROM_EMAIL_ADDRESS", "LogSense <no-reply@devorbit.live>")
TO_EMAIL_ADDRESS = os.getenv("TO_EMAIL_ADDRESS")

def send_email_working(subject: str, text_body: str, html_body: str) -> Dict[str, str]:
    """ Send out an email with both plain text and HTML bodies using Resend """
    resend.api_key = os.environ.get('RESEND_API_KEY')
    
    params = {
        "from": FROM_EMAIL_ADDRESS,
        "to": [TO_EMAIL_ADDRESS],
        "subject": subject,
        "html": html_body,
        "text": text_body
    }
    
    resend.Emails.send(params)
    
    return {"status": "success"}

@function_tool
def send_email_tool(subject: str, text_body: str, html_body: str) -> str:
    """
    Send out an email with the given subject and body to all sales prospects
    
    Args:
        subject: The subject of the email
        text_body: The body of the email as plain text
        html_body: The HTML body of the email
    """
    send_email_working(subject, text_body, html_body)
    return "Email sent successfully"

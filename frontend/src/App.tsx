import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, CheckCircle, Mail, ChevronDown, ChevronUp, FileText, Trophy } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: { name: string; status: 'running' | 'completed' }[];
};

type AgentDraft = {
  id: string;
  agent: string;
  tool: string;
  draft: string;
};

type EmailLog = {
  id: string;
  subject: string;
  to: string;
  textBody: string;
  htmlBody: string;
  status: 'sent' | 'failed';
  timestamp: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I am the ComplAI Sales Manager. I can orchestrate my sales writers to draft and send the perfect cold email for you. Who should we target today?",
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [emailLog, setEmailLog] = useState<EmailLog[]>([]);
  const [agentDrafts, setAgentDrafts] = useState<AgentDraft[]>([]);
  const [prospectName, setProspectName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Clear previous drafts for a fresh run
    setAgentDrafts([]);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', tools: [] }]);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: input,
          prospect_name: prospectName.trim() || undefined,
          company_name: companyName.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace(/^data:\s*/, ''));
            
            if (data.type === 'email_sent') {
              const email = data.content;
              setEmailLog(prev => [...prev, {
                id: Date.now().toString(),
                subject: email.subject,
                to: email.to,
                textBody: email.text_body,
                htmlBody: email.html_body,
                status: 'sent',
                timestamp: new Date().toLocaleString(),
              }]);
              continue;
            }

            if (data.type === 'agent_draft') {
              const draft = data.content;
              setAgentDrafts(prev => [...prev, {
                id: Date.now().toString() + draft.tool,
                agent: draft.agent,
                tool: draft.tool,
                draft: draft.draft,
              }]);
              continue;
            }

            setMessages(prev => prev.map(msg => {
              if (msg.id !== assistantId) return msg;

              if (data.type === 'text') {
                return { ...msg, content: msg.content + data.content };
              } else if (data.type === 'tool_start') {
                const tools = [...(msg.tools || []), { name: data.content, status: 'running' as const }];
                return { ...msg, tools };
              } else if (data.type === 'tool_end') {
                const toolName = data.content.replace('Finished ', '').replace('.', '');
                const tools = (msg.tools || []).map(t => 
                  t.name.includes(toolName) ? { ...t, status: 'completed' as const } : t
                );
                return { ...msg, tools };
              }
              return msg;
            }));
          } catch (e) {
            // Silently ignore empty SSE lines
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId ? { ...msg, content: msg.content + "\n\n[Connection Error]" } : msg
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  const agentColors: Record<string, string> = {
    "Professional Agent": "border-blue-400 bg-blue-50",
    "Humorous Agent": "border-amber-400 bg-amber-50",
    "Executive Agent": "border-purple-400 bg-purple-50",
  };

  const agentBadgeColors: Record<string, string> = {
    "Professional Agent": "bg-blue-100 text-blue-700",
    "Humorous Agent": "bg-amber-100 text-amber-700",
    "Executive Agent": "bg-purple-100 text-purple-700",
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3 shadow-sm z-10">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Sales Orchestrator</h1>
          <p className="text-sm text-gray-500">ComplAI Agentic Framework</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-5 h-5 text-blue-600" />
                    </div>
                  )}

                  <div className={cn(
                    "max-w-[80%] rounded-2xl p-4 shadow-sm",
                    msg.role === 'user' ? "bg-blue-600 text-white" : "bg-white border border-gray-100"
                  )}>
                    {msg.tools && msg.tools.length > 0 && (
                      <div className="mb-4 space-y-2 border-b pb-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Agent Thought Process</p>
                        {msg.tools.map((tool, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-md">
                            {tool.status === 'running' ? (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            <span className="text-gray-700 font-medium">{tool.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.content ? (
                      <div className={cn("prose prose-sm max-w-none whitespace-pre-wrap", msg.role === 'user' ? "text-white" : "text-gray-800")}>
                        {msg.content}
                      </div>
                    ) : (
                      msg.role === 'assistant' && isStreaming && (
                        <div className="flex items-center gap-2 text-gray-400 py-2">
                          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <footer className="bg-white border-t p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  disabled={isStreaming}
                  placeholder="Prospect first name (optional)"
                  className="flex-1 bg-gray-100 text-gray-900 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 transition-all"
                />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isStreaming}
                  placeholder="Company name (optional)"
                  className="flex-1 bg-gray-100 text-gray-900 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 transition-all"
                />
              </div>
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isStreaming}
                  placeholder="Instruct the manager to write a sales email..."
                  className="w-full bg-gray-100 text-gray-900 rounded-full pl-6 pr-14 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-5 h-5 ml-[2px]" />
                </button>
              </form>
            </div>
          </footer>
        </div>

        {/* Right Sidebar: Drafts + Email Log */}
        <aside className="w-[440px] border-l bg-white flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">

            {/* Agent Drafts Section */}
            <div className="border-b">
              <div className="px-5 py-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800">Agent Drafts</h2>
                <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                  {agentDrafts.length}/3
                </span>
              </div>

              {agentDrafts.length === 0 ? (
                <div className="px-5 pb-5 text-sm text-gray-400">
                  {isStreaming ? "Waiting for agents to generate drafts..." : "No drafts yet. Start a conversation to see agent outputs."}
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-3">
                  {agentDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className={cn("border-l-4 rounded-lg p-3 transition-colors", agentColors[draft.agent] || "border-gray-300 bg-gray-50")}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", agentBadgeColors[draft.agent] || "bg-gray-100 text-gray-700")}>
                          {draft.agent}
                        </span>
                        <button
                          onClick={() => setExpandedDraft(expandedDraft === draft.id ? null : draft.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {expandedDraft === draft.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {expandedDraft === draft.id && (
                        <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t pt-2">
                          {draft.draft}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Emails Section */}
            <div>
              <div className="px-5 py-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-800">Sent Emails</h2>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {emailLog.length}
                </span>
              </div>

              {emailLog.length === 0 ? (
                <div className="px-5 pb-5 text-sm text-gray-400">
                  {isStreaming ? "Manager is evaluating drafts..." : "No emails sent yet."}
                </div>
              ) : (
                <div className="divide-y">
                  {emailLog.map((email) => (
                    <div key={email.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{email.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5">To: {email.to}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{email.timestamp}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            email.status === 'sent' 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          )}>
                            {email.status === 'sent' ? '✓ Sent' : '✗ Failed'}
                          </span>
                          <button
                            onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {expandedEmail === email.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedEmail === email.id && (
                        <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {email.textBody}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

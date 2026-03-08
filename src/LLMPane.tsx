import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Settings } from 'lucide-react';

interface LLMPaneProps {
  currentCode: string;
  onUpdateCode: (code: string) => Promise<{success: boolean, error?: string}>;
  systemPrompt: string;
}

type MessagePart = { text: string } | { functionCall: any } | { functionResponse: any };
type Message = { role: 'user' | 'model', parts: MessagePart[] };

const LLMPane: React.FC<LLMPaneProps> = ({ currentCode, onUpdateCode, systemPrompt }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [displayMessages, setDisplayMessages] = useState<{ role: 'user' | 'assistant' | 'system', content: string }[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.0-flash-lite-preview-02-05');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const codeRef = useRef(currentCode);
  useEffect(() => { codeRef.current = currentCode; }, [currentCode]);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
    const savedModel = localStorage.getItem('gemini_model_name');
    if (savedModel) setModelName(savedModel);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, isLoading]);

  const handleSaveSettings = (key: string, model: string) => {
    setApiKey(key);
    setModelName(model);
    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('gemini_model_name', model);
  };

  const addDisplayMsg = (role: 'user' | 'assistant' | 'system', content: string) => {
    setDisplayMessages(prev => [...prev, { role, content }]);
  };

  const callGemini = async (currentMessages: Message[]) => {
    const payload = {
      contents: currentMessages,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      tools: [
        {
          functionDeclarations: [
            {
              name: "update_code",
              description: "Replaces the entire Vult code in the editor with new code, compiles it, and returns the compilation result. ALWAYS provide the COMPLETE code file. Use this to fix errors or implement features.",
              parameters: {
                type: "OBJECT",
                properties: {
                  new_code: {
                    type: "STRING",
                    description: "The complete, updated Vult code."
                  }
                },
                required: ["new_code"]
              }
            },
            {
              name: "get_current_code",
              description: "Retrieves the current Vult code from the editor.",
              parameters: {
                type: "OBJECT",
                properties: {}
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(errorData.error?.message || response.statusText);
    }

    return await response.json();
  };

  const processAgentLoop = async (initialMessages: Message[]) => {
    let currentConversation = [...initialMessages];
    
    try {
      while (true) {
        const data = await callGemini(currentConversation);
        const parts = data.candidates?.[0]?.content?.parts || [];
        
        if (parts.length === 0) {
          addDisplayMsg('assistant', "Model returned empty response.");
          break;
        }

        // Add the model's turn to conversation
        const modelTurn: Message = { role: 'model', parts: parts };
        currentConversation.push(modelTurn);

        let needsAnotherTurn = false;
        let functionResponses: MessagePart[] = [];

        for (const part of parts) {
          if (part.text) {
            addDisplayMsg('assistant', part.text);
          }
          if (part.functionCall) {
            const { name, args } = part.functionCall;
            addDisplayMsg('system', `🛠️ Executing: ${name}`);
            
            let result: any = {};
            if (name === 'get_current_code') {
              result = { code: codeRef.current };
            } else if (name === 'update_code') {
              const res = await onUpdateCode(args.new_code);
              if (res.success) {
                addDisplayMsg('system', `✅ Code updated and compiled.`);
                result = { success: true };
              } else {
                addDisplayMsg('system', `❌ Compilation failed:\n${res.error}`);
                result = { success: false, error: res.error };
              }
            }

            functionResponses.push({
              functionResponse: { name, response: result }
            });
            needsAnotherTurn = true;
          }
        }

        if (needsAnotherTurn) {
          // Add user turn with function results
          const responseTurn: Message = { role: 'user', parts: functionResponses };
          currentConversation.push(responseTurn);
          // Continue loop to let model process the results
        } else {
          break; // Agent is finished
        }
      }
    } catch (err: any) {
      addDisplayMsg('assistant', `⚠️ Agent Error: ${err.message}`);
    }

    setMessages(currentConversation);
    setIsLoading(false);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userInput = input;
    setInput('');
    setIsLoading(true);
    addDisplayMsg('user', userInput);

    if (!apiKey) {
      addDisplayMsg('assistant', "API key missing. Click the Settings icon to configure.");
      setIsLoading(false);
      return;
    }

    const newUserMsg: Message = { role: 'user', parts: [{ text: userInput }] };
    processAgentLoop([...messages, newUserMsg]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #333', background: '#1e1e1e' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '14px', color: '#aaa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Vult AI Assistant</span>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          style={{ background: 'transparent', border: 'none', color: apiKey ? '#00ff00' : '#888', cursor: 'pointer' }}
        >
          <Settings size={14} />
        </button>
      </div>
      
      {showSettings && (
        <div style={{ padding: '12px', background: '#252526', borderBottom: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '10px', color: '#888' }}>GEMINI API KEY</div>
          <input 
            type="password"
            placeholder="Key..."
            value={apiKey}
            onChange={(e) => handleSaveSettings(e.target.value, modelName)}
            style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px' }}
          />
          <div style={{ fontSize: '10px', color: '#888' }}>MODEL</div>
          <input 
            type="text"
            placeholder="Model ID..."
            value={modelName}
            onChange={(e) => handleSaveSettings(apiKey, e.target.value)}
            style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px' }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayMessages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            background: m.role === 'user' ? '#007acc' : (m.role === 'system' ? '#2d2d2d' : '#333'),
            border: m.role === 'system' ? '1px dashed #555' : 'none',
            color: m.role === 'system' ? '#bbb' : '#fff',
            padding: '8px 12px',
            borderRadius: '12px',
            maxWidth: '90%',
            fontSize: m.role === 'system' ? '11px' : '13px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: m.role === 'system' ? 'monospace' : 'inherit'
          }}>
            {m.content}
          </div>
        ))}
        {isLoading && <Loader2 className="animate-spin" size={16} style={{ margin: '8px auto', color: '#aaa' }} />}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: '12px', borderTop: '1px solid #333', display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Code something..."
          style={{ flex: 1, background: '#252526', border: '1px solid #444', borderRadius: '4px', padding: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}
        />
        <button onClick={handleSend} disabled={isLoading} style={{ background: isLoading ? '#444' : '#007acc', border: 'none', borderRadius: '4px', padding: '8px', cursor: isLoading ? 'default' : 'pointer', color: '#fff' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default LLMPane;

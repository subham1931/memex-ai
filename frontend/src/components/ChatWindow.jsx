import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { Send, Plus, Loader2 } from 'lucide-react';

export default function ChatWindow({ 
  messages, 
  onSendMessage, 
  loading, 
  hasFiles,
  onUpload,
  uploading
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle auto-resizing textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-[#f5f5f5]">
      {/* Hidden file input for top-bar button */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".md,.txt,.pdf"
        className="hidden"
      />

      {/* Top Status Bar */}
      <div className="h-12 border-b border-[#222222] px-6 flex items-center justify-between bg-[#0a0a0a] shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          <span className="text-[11px] font-normal text-[#666666]">Vector store ready</span>
        </div>
        
        <button
          onClick={triggerUpload}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-[#666666] hover:text-[#f5f5f5] transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-none p-0"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span>{uploading ? 'Upload notes' : 'Upload notes'}</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto h-full flex flex-col justify-center text-left space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#666666] font-semibold">
                MEMEX INTELLIGENCE
              </span>
              <h2 className="text-xl font-normal text-[#f5f5f5] tracking-tight">
                What would you like to know?
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-normal text-[#555555] bg-[#111111] border border-[#222222] px-2.5 py-1 rounded-full">
                Note Search
              </span>
              <span className="text-[10px] font-normal text-[#555555] bg-[#111111] border border-[#222222] px-2.5 py-1 rounded-full">
                Strict Context Mode
              </span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))}
            
            {loading && (
              <div className="flex gap-3 pl-3 py-2 border-l border-[#7c3aed] text-left animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[#666666] font-semibold">
                    Memex AI
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#666666]">
                    <span className="inline-flex gap-1 shrink-0">
                      <span className="h-1 w-1 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-[10px] text-[#666666]">Composing answer...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form Footer */}
      <div className="p-4 md:p-6 shrink-0 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end bg-[#141414] border border-[#2a2a2a] rounded-lg focus-within:border-[#7c3aed] focus-within:ring-1 focus-within:ring-[#7c3aed] transition-all p-1.5 gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasFiles ? "Ask a question about your notes..." : "Upload notes to start querying..."}
              disabled={!hasFiles || loading}
              className="flex-1 resize-none bg-transparent outline-none border-none py-1.5 px-2.5 text-sm text-[#f5f5f5] placeholder-[#666666] max-h-40 min-h-[36px] font-sans disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !hasFiles}
              className="h-8 w-8 rounded-md bg-[#7c3aed] hover:bg-[#6d28d9] active:bg-[#5b21b6] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:bg-[#1a1a1a] disabled:text-[#555] disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-[#666666] mt-2">
            Memex answers from your notes only
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { Send, Plus, Loader2, Sun, Moon } from 'lucide-react';

export default function ChatWindow({ 
  messages, 
  onSendMessage, 
  onEditMessage,
  loading, 
  hasFiles,
  onUpload,
  uploading,
  theme,
  onToggleTheme
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
    <div className="flex-1 flex flex-col h-full bg-app-bg text-text-primary transition-colors duration-150">
      {/* Hidden file input for top-bar button */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".md,.txt,.pdf"
        className="hidden"
      />

      {/* Top Status Bar */}
      <div className="h-12 border-b border-border-subtle px-6 flex items-center justify-between bg-app-bg shrink-0 select-none transition-colors duration-150">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-[11px] font-normal text-text-muted">Vector store ready</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md hover:bg-item-hover text-text-muted hover:text-text-primary transition-all cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-purple-600" />}
          </button>

          <button
            onClick={triggerUpload}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-none p-0 outline-none"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>{uploading ? 'Upload notes' : 'Upload notes'}</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto h-full flex flex-col justify-center text-left space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-muted font-semibold">
                MEMEX INTELLIGENCE
              </span>
              <h2 className="text-xl font-normal text-text-primary tracking-tight">
                What would you like to know?
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-normal text-text-label bg-sidebar-bg border border-border-subtle px-2.5 py-1 rounded-full">
                Note Search
              </span>
              <span className="text-[10px] font-normal text-text-label bg-sidebar-bg border border-border-subtle px-2.5 py-1 rounded-full">
                Strict Context Mode
              </span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, index) => (
              <MessageBubble 
                key={msg.id || index} 
                message={msg} 
                onEditMessage={onEditMessage} 
                loading={loading}
              />
            ))}
            
            {loading && (
              <div className="flex gap-3 pl-3 py-2 border-l border-accent text-left animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold">
                    Memex AI
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span className="inline-flex gap-1 shrink-0">
                      <span className="h-1 w-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-[10px] text-text-muted">Composing answer...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form Footer */}
      <div className="p-4 md:p-6 shrink-0 bg-app-bg transition-colors duration-150">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end bg-input-bg border border-border-subtle rounded-lg focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all p-1.5 gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasFiles ? "Ask a question about your notes..." : "Upload notes to start querying..."}
              disabled={!hasFiles || loading}
              className="flex-1 resize-none bg-transparent outline-none border-none py-1.5 px-2.5 text-sm text-text-primary placeholder-text-muted max-h-40 min-h-[36px] font-sans disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !hasFiles}
              className="h-8 w-8 rounded-md bg-accent hover:bg-accent-hover active:bg-accent text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:bg-sidebar-bg disabled:text-text-label disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-text-muted mt-2">
            Memex answers from your notes only
          </p>
        </div>
      </div>
    </div>
  );
}

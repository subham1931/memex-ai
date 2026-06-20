import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { Send, Plus, Loader2, Sun, Moon, Menu } from 'lucide-react';

export default function ChatWindow({ 
  messages, 
  onSendMessage, 
  onEditMessage,
  loading, 
  hasFiles,
  onUpload,
  uploading,
  theme,
  onToggleTheme,
  onOpenSidebar,
  modelInfo,
  selectedModelId,
  onModelChange,
}) {
  const formatModelName = (name) => (name || '').replace(/^nvidia\//, '');

  const modelOptions = modelInfo?.models ?? [
    { id: 'groq', provider: 'Groq', model: 'llama-3.3-70b-versatile' },
    { id: 'nvidia', provider: 'NVIDIA', model: 'nvidia/nv-embedcode-7b-v1' },
  ];
  const activeModelId = selectedModelId || modelInfo?.default_model_id || 'groq';
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
    <div className="flex-1 flex flex-col h-full min-h-0 bg-app-bg text-text-primary transition-colors duration-150">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".md,.txt,.pdf"
        className="hidden"
      />

      {/* Top Navbar */}
      <div className="h-14 border-b border-border-subtle px-3 sm:px-4 md:px-6 flex items-center justify-between bg-app-bg shrink-0 select-none transition-colors duration-150">
        {/* Left side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hamburger - mobile only */}
          <button
            onClick={onOpenSidebar}
            className="h-8 w-8 rounded-md hover:bg-item-hover text-text-muted hover:text-text-primary transition-all cursor-pointer border-none bg-transparent flex items-center justify-center outline-none md:hidden"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] font-normal text-text-muted hidden sm:inline">Vector store ready</span>
          </div>
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleTheme}
            className="h-8 w-8 rounded-md hover:bg-item-hover text-text-muted hover:text-text-primary transition-all cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-500" />}
          </button>

          <button
            onClick={triggerUpload}
            disabled={uploading}
            className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border border-border-subtle hover:border-border-focus rounded-md px-2 sm:px-3 py-1.5 outline-none"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload'}</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 min-h-0">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto h-full flex flex-col justify-center text-left space-y-4 sm:space-y-6 px-2">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-muted font-semibold">
                MEMEX INTELLIGENCE
              </span>
              <h2 className="text-lg sm:text-xl font-normal text-text-primary tracking-tight">
                What would you like to know?
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-normal text-text-label bg-sidebar-bg border border-border-subtle px-2.5 py-1 rounded-full">
                Note Search
              </span>
              <span className="text-[10px] font-normal text-text-label bg-sidebar-bg border border-border-subtle px-2.5 py-1 rounded-full">
                Strict Context Mode
              </span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
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
      <div className="p-3 sm:p-4 md:p-6 shrink-0 bg-app-bg transition-colors duration-150">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end bg-input-bg border border-border-subtle rounded-lg focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all p-1.5 gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasFiles ? "Ask about your notes..." : "Upload notes to start..."}
              disabled={!hasFiles || loading}
              className="flex-1 resize-none bg-transparent outline-none border-none py-1.5 px-2 sm:px-2.5 text-sm text-text-primary placeholder-text-muted max-h-40 min-h-[36px] font-sans disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !hasFiles}
              className="h-8 w-8 rounded-md bg-accent hover:bg-accent-hover active:bg-accent text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:bg-sidebar-bg disabled:text-text-label disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-col items-center gap-1.5 mt-2">
            <p className="text-center text-[10px] text-text-muted">
              Memex answers from your notes only
            </p>
            <select
              value={activeModelId}
              onChange={(e) => onModelChange?.(e.target.value)}
              disabled={loading}
              className="text-[10px] bg-sidebar-bg border border-border-subtle text-text-primary rounded-full px-3 py-1.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none text-center min-w-[220px] max-w-full"
              aria-label="Select model"
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.provider} · {formatModelName(option.model)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, ChevronDown, ChevronUp, Copy, Check, Edit, X, Save } from 'lucide-react';

export default function MessageBubble({ message, onEditMessage, loading }) {
  const { id, role, text, sources, created_at } = message;
  const isAssistant = role === 'assistant';
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [time] = useState(() => {
    if (created_at) {
      return new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    setEditText(text);
  }, [text]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== text && onEditMessage && id) {
      onEditMessage(id, editText.trim());
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(text);
    setIsEditing(false);
  };

  if (!isAssistant) {
    if (isEditing) {
      return (
        <div className="flex flex-col items-end w-full py-2 select-none">
          <div className="w-full max-w-[85%] sm:max-w-[75%] md:max-w-[65%] bg-input-bg border border-accent rounded-[8px] p-3 flex flex-col gap-3.5 shadow-md">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full resize-none bg-transparent outline-none border-none text-text-primary text-[13px] leading-relaxed font-sans min-h-[60px]"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-[10px]">
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border-subtle bg-sidebar-bg text-text-muted hover:text-text-primary cursor-pointer transition-colors duration-150"
              >
                <X className="h-3 w-3" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim() || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent hover:bg-accent-hover text-white cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-3 w-3" />
                <span>Save & Submit</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-end w-full group py-1">
        <div className="relative bg-message-user-bg border border-message-user-border rounded-[8px] px-3.5 py-2.5 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] text-text-primary text-[13px] leading-relaxed shadow-sm transition-colors duration-150">
          <p className="whitespace-pre-wrap">{text}</p>
          <span className="absolute -left-12 top-3 text-[9px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none hidden sm:block">
            {time}
          </span>
        </div>
        <div className="mt-1 mr-1 flex items-center justify-end gap-2.5 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none">
          {id && !loading && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors duration-150 cursor-pointer"
            >
              <Edit className="h-3 w-3" />
              <span>Edit</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors duration-150 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success animate-fade-in" />
                <span className="text-success font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex justify-start w-full group py-2">
      <div className="relative pl-3 border-l border-accent w-full text-left">
        <div className="text-[9px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-1 select-none">
          Memex AI
        </div>
        
        <div className="text-text-primary text-[13px] leading-relaxed font-normal break-words max-w-[90%]">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-text-primary/90">{children}</li>,
              h1: ({ children }) => <h1 className="text-sm font-medium text-text-primary mt-3 mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xs font-medium text-text-primary mt-2 mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[11px] font-medium text-text-primary mt-1.5 mb-0.5">{children}</h3>,
              code: ({ children, className, node, ...props }) => {
                const isInline = !className && !String(children).includes('\n');
                return isInline ? (
                  <code className="bg-card-bg border border-border-subtle text-accent px-1 py-0.2 rounded text-[11px] font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <pre className="bg-input-bg border border-border-subtle p-3 rounded overflow-x-auto my-2 text-[11px] font-mono text-text-primary">
                    <code>{children}</code>
                  </pre>
                );
              },
              strong: ({ children }) => <strong className="font-medium text-accent">{children}</strong>,
              em: ({ children }) => <em className="italic text-text-muted">{children}</em>,
              a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{children}</a>
            }}
          >
            {text}
          </ReactMarkdown>
        </div>

        {/* Action Row: Copy option and Sources button */}
        <div className="mt-3 flex items-center gap-2 select-none">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-[10px] text-text-muted hover:text-accent transition-colors duration-150 cursor-pointer border border-border-subtle bg-sidebar-bg/50 px-2.5 py-0.5 rounded-full"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success animate-fade-in" />
                <span className="text-success font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy answer</span>
              </>
            )}
          </button>

          {sources && sources.length > 0 && (
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary transition-colors cursor-pointer border border-border-subtle bg-sidebar-bg/50 px-2.5 py-0.5 rounded-full"
            >
              <span>{sources.length} {sources.length === 1 ? 'source' : 'sources'}</span>
              {sourcesOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            </button>
          )}
        </div>

        {/* Collapsible Sources Section Content */}
        {sources && sources.length > 0 && sourcesOpen && (
          <div className="mt-2 space-y-1.5 animate-fade-in max-w-2xl">
            {sources.map((source, index) => (
              <div 
                key={index}
                className="p-2.5 bg-sidebar-bg border border-border-subtle rounded text-[11px]"
              >
                <div className="flex items-center gap-1.5 text-text-muted font-normal mb-1">
                  <FileText className="h-3 w-3" />
                  <span>{source.source}</span>
                  <span className="text-[8px] bg-card-bg text-text-label px-1.5 py-0.2 rounded border border-border-subtle font-mono ml-auto">
                    Chunk {index + 1}
                  </span>
                </div>
                <p className="text-text-muted font-mono text-[10px] leading-relaxed whitespace-pre-wrap pl-2 border-l border-border-subtle">
                  {source.text}
                </p>
              </div>
            ))}
          </div>
        )}

        <span className="absolute right-0 top-3 text-[9px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none">
          {time}
        </span>
      </div>
    </div>
  );
}

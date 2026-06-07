import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function MessageBubble({ message }) {
  const { role, text, sources } = message;
  const isAssistant = role === 'assistant';
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [time] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  if (!isAssistant) {
    return (
      <div className="flex justify-end w-full group py-1">
        <div className="relative bg-[#1e1329] border border-[#2a1b3d] rounded-[8px] px-3.5 py-2.5 max-w-[65%] text-[#f5f5f5] text-[13px] leading-relaxed shadow-sm">
          <p className="whitespace-pre-wrap">{text}</p>
          <span className="absolute -left-12 top-3 text-[9px] text-[#666666] opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none">
            {time}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start w-full group py-2">
      <div className="relative pl-3 border-l border-[#7c3aed] w-full text-left">
        <div className="text-[9px] uppercase tracking-[0.15em] text-[#666666] font-semibold mb-1 select-none">
          Memex AI
        </div>
        
        <div className="text-[#f5f5f5] text-[13px] leading-relaxed font-normal break-words max-w-[90%]">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-[#f5f5f5]/90">{children}</li>,
              h1: ({ children }) => <h1 className="text-sm font-medium text-[#f5f5f5] mt-3 mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xs font-medium text-[#f5f5f5] mt-2 mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[11px] font-medium text-[#f5f5f5] mt-1.5 mb-0.5">{children}</h3>,
              code: ({ inline, children, ...props }) => {
                return inline ? (
                  <code className="bg-[#1a1a1a] border border-[#222222] text-[#7c3aed] px-1 py-0.2 rounded text-[11px] font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <pre className="bg-[#141414] border border-[#222222] p-3 rounded overflow-x-auto my-2 text-[11px] font-mono text-[#f5f5f5]">
                    <code>{children}</code>
                  </pre>
                );
              },
              strong: ({ children }) => <strong className="font-medium text-[#7c3aed]">{children}</strong>,
              em: ({ children }) => <em className="italic text-[#f5f5f5]/80">{children}</em>,
              a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] hover:underline">{children}</a>
            }}
          >
            {text}
          </ReactMarkdown>
        </div>

        {/* Collapsible Sources Section */}
        {sources && sources.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="inline-flex items-center gap-1 text-[10px] text-[#666666] hover:text-[#f5f5f5] transition-colors cursor-pointer border border-[#222222] bg-[#111111]/30 px-2 py-0.5 rounded-full"
            >
              <span>{sources.length} {sources.length === 1 ? 'source' : 'sources'}</span>
              {sourcesOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            </button>

            {sourcesOpen && (
              <div className="mt-2 space-y-1.5 animate-fade-in max-w-2xl">
                {sources.map((source, index) => (
                  <div 
                    key={index}
                    className="p-2.5 bg-[#111111] border border-[#222222] rounded text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 text-[#666666] font-normal mb-1">
                      <FileText className="h-3 w-3" />
                      <span>{source.source}</span>
                      <span className="text-[8px] bg-[#1a1a1a] text-[#555] px-1.5 py-0.2 rounded border border-[#222222] font-mono ml-auto">
                        Chunk {index + 1}
                      </span>
                    </div>
                    <p className="text-[#666666] font-mono text-[10px] leading-relaxed whitespace-pre-wrap pl-2 border-l border-[#222222]">
                      {source.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <span className="absolute right-0 top-3 text-[9px] text-[#666666] opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none">
          {time}
        </span>
      </div>
    </div>
  );
}

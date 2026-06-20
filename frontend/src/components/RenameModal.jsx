import { useState, useEffect, useRef } from 'react';
import { Edit, X } from 'lucide-react';

export default function RenameModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Rename", 
  currentName = "",
  placeholder = "Enter new name..."
}) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue(currentName);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) {
      onConfirm(trimmed);
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div 
          className="w-full max-w-sm bg-[#141416] border border-white/10 rounded-xl shadow-2xl shadow-black/50 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Edit className="h-4 w-4 text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="h-7 w-7 rounded-md hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Input */}
          <div className="px-5 py-4">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-white/5 border border-white/10 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all font-sans"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 px-5 pb-5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || value.trim() === currentName}
              className="px-4 py-2 text-xs font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-all cursor-pointer shadow-lg shadow-purple-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Rename
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

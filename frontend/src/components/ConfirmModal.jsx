import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger" // "danger" | "warning"
}) {
  if (!isOpen) return null;

  const confirmStyles = variant === "danger"
    ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20"
    : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20";

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
          <div className="flex items-start justify-between p-5 pb-0">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                variant === "danger" ? "bg-red-600/10 border border-red-500/20" : "bg-amber-600/10 border border-amber-500/20"
              }`}>
                <AlertTriangle className={`h-4.5 w-4.5 ${variant === "danger" ? "text-red-400" : "text-amber-400"}`} />
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

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 px-5 pb-5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${confirmStyles}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

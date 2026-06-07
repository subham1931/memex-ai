import { useRef } from 'react';
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react';

export default function Sidebar({
  files,
  onUpload,
  onDeleteFile,
  onClearChat,
  uploading,
  chatLength
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="w-[280px] min-w-[280px] bg-[#111111] border-r border-[#222222] flex flex-col h-full text-[#f5f5f5] select-none">
      {/* App Branding */}
      <div className="p-5 flex flex-col gap-0.5 border-b border-[#222222]">
        <h1 className="text-sm font-medium tracking-tight text-[#f5f5f5]">
          Memex
        </h1>
        <p className="text-[9px] uppercase tracking-[0.15em] text-[#666666] font-medium">
          Notes Intelligence
        </p>
      </div>

      {/* Upload Zone */}
      <div className="p-4 border-b border-[#222222]">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".md,.txt,.pdf"
          className="hidden"
        />
        <button
          onClick={triggerFileInput}
          disabled={uploading}
          className="w-full py-5 border border-[#222222] rounded-md flex flex-col items-center justify-center gap-2 bg-[#161616] hover:bg-[#1a1a1a] hover:border-[#333333] transition-all duration-150 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 text-[#7c3aed] animate-spin" />
          ) : (
            <Upload className="h-4 w-4 text-[#666666] group-hover:text-[#f5f5f5] transition-colors duration-150" />
          )}
          <span className="text-xs font-normal text-[#f5f5f5]">
            {uploading ? 'Uploading...' : 'Upload notes'}
          </span>
        </button>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[9px] uppercase tracking-[0.15em] text-[#555555] font-semibold">
            Indexed Files ({files.length})
          </span>
        </div>
        
        {files.length === 0 ? (
          <div className="text-left py-4 px-2">
            <p className="text-xs text-[#666666]">No files indexed.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((filename) => {
              const ext = filename.split('.').pop().toUpperCase();
              return (
                <div
                  key={filename}
                  className="group flex items-center justify-between p-2 rounded-md hover:bg-[#161616] transition-all duration-150"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-3.5 w-3.5 text-[#666666] shrink-0" />
                    <span className="text-xs text-[#f5f5f5] truncate font-normal">
                      {filename}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.2 bg-[#222222] text-[#666666] rounded border border-[#2d2d2d] shrink-0">
                      {ext}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteFile(filename)}
                    className="p-1 rounded text-[#666666] hover:text-[#f5f5f5] hover:bg-[#222222] opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    title={`Delete ${filename}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-[#222222] bg-[#111111]">
        <button
          onClick={onClearChat}
          disabled={chatLength === 0}
          className="text-xs text-[#666666] hover:text-[#f5f5f5] font-normal transition-colors duration-150 bg-transparent border-none p-0 cursor-pointer text-left disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Clear Chat
        </button>
      </div>
    </div>
  );
}

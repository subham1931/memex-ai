import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

const API_BASE = 'http://localhost:8000';

export default function App() {
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch list of files on load
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/files`);
      if (!res.ok) throw new Error('Failed to fetch file list.');
      const data = await res.json();
      setFiles(data.files || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to Memex-AI server. Please ensure the backend is running.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      // Defer execution to guarantee it runs asynchronously
      await Promise.resolve();
      if (active) {
        await fetchFiles();
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchFiles]);

  // Handle file uploads
  const handleUpload = async (file) => {
    if (!file) return;
    
    // Client-side extension validation
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'txt' && ext !== 'md' && ext !== 'pdf') {
      alert('Only .md (markdown), .txt (text), and .pdf (PDF) files are supported.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Upload failed.');
      }

      await fetchFiles(); // Refresh files list
    } catch (err) {
      console.error(err);
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle file deletions
  const handleDeleteFile = async (filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This will remove all its text chunks from the vector store.`)) {
      return;
    }

    setError(null);
    try {
      const res = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Delete failed.');
      }

      await fetchFiles(); // Refresh list
    } catch (err) {
      console.error(err);
      alert(`Failed to delete file: ${err.message}`);
    }
  };

  // Handle sending chat messages
  const handleSendMessage = async (text) => {
    if (!text.trim() || loading) return;

    // Add user message to state
    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: text }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Request failed.');
      }

      const data = await res.json();
      
      // Add assistant response to state
      const assistantMsg = {
        role: 'assistant',
        text: data.answer,
        sources: data.sources || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        role: 'assistant',
        text: `⚠️ **Error calling RAG assistant:** ${err.message}. Please check that the server is online and your Gemini API Key is configured in backend/.env.`,
        sources: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
      {/* Sidebar (File list & uploads) */}
      <Sidebar
        files={files}
        onUpload={handleUpload}
        onDeleteFile={handleDeleteFile}
        onClearChat={handleClearChat}
        uploading={uploading}
        chatLength={messages.length}
      />

      {/* Main chat window container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {error && (
          <div className="bg-red-950/40 border-b border-red-900/50 text-red-300 text-xs px-6 py-2.5 flex items-center justify-between">
            <span className="font-medium">{error}</span>
            <button 
              onClick={fetchFiles}
              className="bg-red-900/40 hover:bg-red-900/60 active:bg-red-900 px-3 py-1 rounded transition-colors text-[10px] font-semibold tracking-wide uppercase cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}
        
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loading}
          hasFiles={files.length > 0}
          onUpload={handleUpload}
          uploading={uploading}
        />
      </div>
    </div>
  );
}

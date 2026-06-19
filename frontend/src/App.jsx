import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { supabase } from './supabaseClient';
import { fetchWithAuth } from './utils/fetchWithAuth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Supabase Sessions State
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Theme State (Dark Mode default)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load user profile details
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch list of files on load
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/files`);
      if (!res.ok) throw new Error('Failed to fetch file list.');
      const data = await res.json();
      setFiles(data.files || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to Memex-AI server. Please ensure the backend is running.');
    }
  }, []);

  // Fetch list of sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/sessions`);
      if (!res.ok) throw new Error('Failed to fetch sessions.');
      const data = await res.json();
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  }, []);

  // Create a new session
  const createNewSession = useCallback(async (title = "New Chat", makeActive = true) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('Failed to create session.');
      const newSession = await res.json();
      
      setSessions(prev => [newSession, ...prev]);
      if (makeActive) {
        setActiveSessionId(newSession.id);
        setMessages([]);
      }
      return newSession;
    } catch (err) {
      console.error('Error creating new session:', err);
      alert('Could not create new session.');
    }
  }, []);

  // Load messages for a given session
  const loadSessionMessages = useCallback(async (sessionId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/sessions/${sessionId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages for session.');
      const data = await res.json();
      const formatted = (data || []).map(m => ({
        id: m.id,
        role: m.role,
        text: m.content,
        sources: m.sources || [],
        created_at: m.created_at
      }));
      setMessages(formatted);
    } catch (err) {
      console.error('Error loading session messages:', err);
    }
  }, []);

  // Initialize App files & sessions when user session changes
  useEffect(() => {
    if (!user) return;
    
    let active = true;
    const init = async () => {
      await fetchFiles();
      try {
        const res = await fetchWithAuth(`${API_BASE}/sessions`);
        if (!res.ok) throw new Error('Failed to fetch sessions.');
        const data = await res.json();
        if (active) {
          setSessions(data || []);
          if (!data || data.length === 0) {
            // Automatically create a new empty session on fresh load
            await createNewSession("New Chat", true);
          } else {
            // Set first session active
            setActiveSessionId(data[0].id);
            await loadSessionMessages(data[0].id);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [user, fetchFiles, createNewSession, loadSessionMessages]);

  // Handle switching sessions
  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    await loadSessionMessages(sessionId);
  };

  // Handle deleting a session
  const handleDeleteSession = async (sessionId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete session.');

      // Update state using callback form to avoid stale closure
      setSessions(prev => {
        const remaining = prev.filter(s => s.id !== sessionId);

        if (activeSessionId === sessionId) {
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
            loadSessionMessages(remaining[0].id);
          } else {
            // If no sessions left, create a new one
            createNewSession("New Chat", true);
          }
        }

        return remaining;
      });
    } catch (err) {
      console.error(err);
      alert('Could not delete session.');
    }
  };

  // Handle renaming a session
  const handleRenameSession = async (sessionId, newTitle) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/sessions/${sessionId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (!res.ok) throw new Error('Failed to rename session.');
      const updated = await res.json();
      
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: updated.title } : s));
    } catch (err) {
      console.error(err);
      alert('Could not rename session.');
    }
  };

  // Save message to Supabase
  const saveMessageToSupabase = async (sessionId, role, content, sources = null) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content, sources })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Failed to save message to Supabase:', err);
    }
    return null;
  };

  // Handle file uploads
  const handleUpload = async (file) => {
    if (!file) return;
    
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
      const res = await fetchWithAuth(`${API_BASE}/upload`, {
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
      const res = await fetchWithAuth(`${API_BASE}/files/${encodeURIComponent(filename)}`, {
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

    let currentSessionId = activeSessionId;
    
    // Safety fallback: if no session exists, create one
    if (!currentSessionId) {
      const session = await createNewSession("New Chat", true);
      if (session) {
        currentSessionId = session.id;
      } else {
        return;
      }
    }

    // Add user message to state
    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    // 1. Save user message to Supabase
    const savedUserMsg = await saveMessageToSupabase(currentSessionId, 'user', text);
    if (savedUserMsg && savedUserMsg.id) {
      setMessages((prev) =>
        prev.map(m => m === userMsg ? { ...m, id: savedUserMsg.id } : m)
      );
      userMsg.id = savedUserMsg.id;
    }

    // 2. Auto-generate title if it's the first message of "New Chat"
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (currentSession && (currentSession.title === "New Chat" || currentSession.title === "Untitled Chat")) {
      let newTitle = text.slice(0, 40).trim();
      newTitle = newTitle.replace(/[.,#!$%^&*;:{}=\-_`~()?\s]+$/, ""); // Remove trailing punctuation
      if (!newTitle) newTitle = "Untitled Chat";
      await handleRenameSession(currentSessionId, newTitle);
    }

    // 3. Fetch RAG response
    try {
      // Build conversation history (last 6 messages for context)
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.text
      }));

      const res = await fetchWithAuth(`${API_BASE}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: text, history }),
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

      // 4. Save assistant response to Supabase
      const savedAssistantMsg = await saveMessageToSupabase(currentSessionId, 'assistant', data.answer, data.sources || []);
      if (savedAssistantMsg && savedAssistantMsg.id) {
        assistantMsg.id = savedAssistantMsg.id;
      }
      
      setMessages((prev) => [...prev, assistantMsg]);

      // 5. Refresh sessions list to bubble active session to the top (new updated_at)
      await fetchSessions();
    } catch (err) {
      console.error(err);
      const errorMsg = {
        role: 'assistant',
        text: `⚠️ **Error calling RAG assistant:** ${err.message}. Please check that the server is online and your Gemini API Key is configured in backend/.env.`,
        sources: [],
      };
      const savedErrorMsg = await saveMessageToSupabase(currentSessionId, 'assistant', errorMsg.text, []);
      if (savedErrorMsg && savedErrorMsg.id) {
        errorMsg.id = savedErrorMsg.id;
      }
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Handle editing user questions and regenerating response
  const handleEditMessage = async (messageId, newText) => {
    if (!newText.trim() || loading || !activeSessionId) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Call PATCH endpoint on backend to update the question text in DB
      const updateRes = await fetchWithAuth(`${API_BASE}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newText })
      });
      
      if (!updateRes.ok) {
        throw new Error('Failed to update message.');
      }

      // 2. Call DELETE endpoint to delete all subsequent messages in the session from DB
      const deleteRes = await fetchWithAuth(`${API_BASE}/messages/${messageId}/subsequent`, {
        method: 'DELETE'
      });

      if (!deleteRes.ok) {
        throw new Error('Failed to delete subsequent messages.');
      }

      // 3. Immediately update the local state to remove subsequent messages and update the edited message text
      setMessages((prev) => {
        const idx = prev.findIndex(m => m.id === messageId);
        if (idx === -1) return prev;
        return [
          ...prev.slice(0, idx),
          { ...prev[idx], text: newText }
        ];
      });

      // 4. Fetch the regenerated response from `/ask`
      const askRes = await fetchWithAuth(`${API_BASE}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: newText }),
      });

      if (!askRes.ok) {
        const errData = await askRes.json();
        throw new Error(errData.detail || 'Request failed.');
      }

      const data = await askRes.json();

      // 5. Add assistant response to state
      const assistantMsg = {
        role: 'assistant',
        text: data.answer,
        sources: data.sources || [],
      };
      
      // 6. Save the new assistant message to Supabase
      const savedAssistantMsg = await saveMessageToSupabase(activeSessionId, 'assistant', data.answer, data.sources || []);
      if (savedAssistantMsg && savedAssistantMsg.id) {
        assistantMsg.id = savedAssistantMsg.id;
      }

      setMessages((prev) => [...prev, assistantMsg]);

      // 7. Refresh sessions list to update active session order
      await fetchSessions();
    } catch (err) {
      console.error(err);
      const errorMsg = {
        role: 'assistant',
        text: `⚠️ **Error regenerating RAG assistant response:** ${err.message}.`,
        sources: [],
      };
      const savedErrorMsg = await saveMessageToSupabase(activeSessionId, 'assistant', errorMsg.text, []);
      if (savedErrorMsg && savedErrorMsg.id) {
        errorMsg.id = savedErrorMsg.id;
      }
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Clear all messages from active session (keeps the session intact)
  const handleClearChat = async (sessionId) => {
    if (!sessionId) return;
    try {
      // Delete the session and create a fresh one (simplest approach with current API)
      const res = await fetchWithAuth(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to clear chat.');
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      await createNewSession("New Chat", true);
    } catch (err) {
      console.error(err);
      alert('Could not clear chat.');
    }
  };

  // Sign out of Google session
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSessions([]);
      setMessages([]);
      setFiles([]);
      setActiveSessionId(null);
    } catch (err) {
      console.error('Sign out error:', err.message);
      alert(`Failed to sign out: ${err.message}`);
    }
  };

  return (
    <div className="flex fixed inset-0 overflow-hidden bg-app-bg font-sans text-text-primary antialiased">
      {/* Sidebar (File list, uploads & Recents history) */}
      <Sidebar
        files={files}
        onUpload={handleUpload}
        onDeleteFile={handleDeleteFile}
        uploading={uploading}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onCreateSession={() => createNewSession("New Chat", true)}
        onClearChat={handleClearChat}
        user={user}
        onSignOut={handleSignOut}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat window container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full relative">
        {error && (
          <div className="bg-red-950/40 border-b border-red-900/50 text-red-300 text-xs px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
            <span className="font-medium text-[11px] sm:text-xs truncate">{error}</span>
            <button 
              onClick={fetchFiles}
              className="bg-red-900/40 hover:bg-red-900/60 active:bg-red-900 px-3 py-1 rounded transition-colors text-[10px] font-semibold tracking-wide uppercase cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}
        
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          loading={loading}
          hasFiles={files.length > 0}
          onUpload={handleUpload}
          uploading={uploading}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, FileText, Loader2, Plus, MoreHorizontal, MessageSquare, Edit } from 'lucide-react';

export default function Sidebar({
  files,
  onUpload,
  onDeleteFile,
  uploading,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onCreateSession,
  onClearChat,
  user,
  onSignOut
}) {
  const fileInputRef = useRef(null);
  
  // Session UI states
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingIds, setDeletingIds] = useState([]);
  
  const menuRef = useRef(null);

  // Close three-dot menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Grouping helper
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: []
  };

  sessions.forEach(session => {
    const sDate = new Date(session.updated_at || session.created_at);
    const sDay = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());

    if (sDay.getTime() === today.getTime()) {
      groups.Today.push(session);
    } else if (sDay.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(session);
    } else if (sDay.getTime() >= sevenDaysAgo.getTime()) {
      groups['Previous 7 Days'].push(session);
    } else {
      groups.Older.push(session);
    }
  });

  const startEditing = (session) => {
    setEditingSessionId(session.id);
    setEditingText(session.title);
    setOpenMenuId(null);
  };

  const saveRename = (id) => {
    if (editingText.trim()) {
      onRenameSession(id, editingText.trim());
    }
    setEditingSessionId(null);
  };

  const handleDeleteClick = (id) => {
    setOpenMenuId(null);
    setDeletingIds(prev => [...prev, id]);
    // Smooth transition
    setTimeout(() => {
      onDeleteSession(id);
      setDeletingIds(prev => prev.filter(item => item !== id));
    }, 150);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="w-[280px] min-w-[280px] bg-sidebar-bg border-r border-border-subtle flex flex-col h-full min-h-0 text-text-primary select-none transition-colors duration-150">
      {/* App Branding */}
      <div className="p-5 flex flex-col gap-0.5 border-b border-border-subtle">
        <h1 className="text-sm font-medium tracking-tight text-text-primary">
          Memex
        </h1>
        <p className="text-[9px] uppercase tracking-[0.15em] text-text-muted font-medium">
          Notes Intelligence
        </p>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-border-subtle">
        <button
          onClick={onCreateSession}
          className="w-full py-2 px-3 border border-border-subtle hover:border-border-focus hover:bg-card-bg rounded-md flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-normal text-text-primary">New Chat</span>
        </button>
      </div>

      {/* Recents Chat Sessions History */}
      <div className="flex-1 overflow-y-auto px-2 py-4 border-b border-border-subtle flex flex-col gap-4 min-h-0">
        <div className="px-3 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.15em] text-text-label font-semibold">
            Recents
          </span>
        </div>

        <div className="space-y-4">
          {Object.entries(groups).map(([groupName, groupList]) => {
            if (groupList.length === 0) return null;
            return (
              <div key={groupName} className="space-y-1">
                <div className="px-3 text-[8px] uppercase tracking-[0.15em] text-text-label font-bold">
                  {groupName}
                </div>
                <div className="space-y-0.5">
                  {groupList.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const isDeleting = deletingIds.includes(session.id);
                    const isEditing = editingSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        onDoubleClick={() => startEditing(session)}
                        className={`group relative flex items-center justify-between rounded-md mx-1 transition-all duration-150 cursor-pointer ${
                          isActive 
                            ? 'bg-message-user-bg border-l-2 border-accent pl-2 pr-2 py-1.5' 
                            : 'hover:bg-item-hover pl-2.5 pr-2 py-1.5'
                        } ${
                          isDeleting ? 'opacity-0 scale-95 h-0 py-0 overflow-hidden' : 'h-[34px]'
                        }`}
                      >
                        <div 
                          className="flex items-center gap-2 min-w-0 flex-1 h-full"
                          onClick={() => !isEditing && onSelectSession(session.id)}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-text-muted shrink-0" />
                          
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onBlur={() => saveRename(session.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRename(session.id);
                                if (e.key === 'Escape') setEditingSessionId(null);
                              }}
                              autoFocus
                              className="bg-input-bg border border-border-focus text-xs text-text-primary rounded px-1.5 py-0.5 outline-none w-full font-sans"
                            />
                          ) : (
                            <span className="text-xs text-text-primary truncate font-normal select-none">
                              {session.title || "New Chat"}
                            </span>
                          )}
                        </div>

                        {/* Three dot actions */}
                        {!isEditing && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === session.id ? null : session.id);
                              }}
                              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-item-hover cursor-pointer"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {openMenuId === session.id && (
                              <div 
                                ref={menuRef}
                                className="absolute right-2 top-8 bg-card-bg border border-border-subtle rounded shadow-lg z-50 py-1 w-24 text-left animate-fade-in"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(session);
                                  }}
                                  className="w-full px-3 py-1.5 text-[11px] text-text-primary hover:bg-item-hover flex items-center gap-1.5 text-left border-none bg-transparent cursor-pointer"
                                >
                                  <Edit className="h-3 w-3 text-text-muted" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(session.id);
                                  }}
                                  className="w-full px-3 py-1.5 text-[11px] text-red-400 hover:bg-item-hover flex items-center gap-1.5 text-left border-none bg-transparent cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3 text-red-500/80" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Files List Section */}
      <div className="h-44 overflow-y-auto px-2 py-4 border-b border-border-subtle">
        <div className="px-3 flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase tracking-[0.15em] text-text-label font-semibold">
            Indexed Files ({files.length})
          </span>
        </div>
        
        {files.length === 0 ? (
          <div className="text-left px-3">
            <p className="text-xs text-text-muted">No files indexed.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {files.map((filename) => {
              const ext = filename.split('.').pop().toUpperCase();
              return (
                <div
                  key={filename}
                  className="group flex items-center justify-between p-2 rounded-md hover:bg-item-hover transition-all duration-150"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="text-[11px] text-text-primary truncate font-normal">
                      {filename}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.2 bg-border-subtle text-text-muted rounded border border-border-subtle shrink-0">
                      {ext}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteFile(filename)}
                    className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-item-hover opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
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

      {/* Upload Zone */}
      <div className="p-3 border-b border-border-subtle">
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
          className="w-full py-3 border border-border-subtle rounded-md flex flex-col items-center justify-center gap-1.5 bg-item-hover hover:bg-card-bg hover:border-border-focus transition-all duration-150 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 text-text-muted group-hover:text-text-primary transition-colors duration-150" />
          )}
          <span className="text-[11px] font-normal text-text-primary">
            {uploading ? 'Uploading...' : 'Upload notes'}
          </span>
        </button>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-sidebar-bg border-t border-border-subtle flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => activeSession && onClearChat(activeSession.id)}
            disabled={!activeSession}
            className="text-xs text-text-muted hover:text-text-primary font-normal transition-colors duration-150 bg-transparent border-none p-0 cursor-pointer text-left disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear Chat
          </button>
        </div>

        {user && (
          <div className="relative group/user pt-2 border-t border-border-subtle/50">
            <div className="flex items-center gap-2.5 p-1 rounded-md hover:bg-item-hover transition-all duration-150 cursor-pointer">
              <img
                src={user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user=s96-c'}
                alt="Google Avatar"
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-full border border-border-subtle"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-text-muted truncate font-normal">
                  {user.email}
                </p>
              </div>
            </div>
            
            {/* Dropdown Menu on Hover */}
            <div className="absolute bottom-full left-0 mb-1.5 w-full bg-card-bg border border-border-subtle rounded shadow-lg opacity-0 pointer-events-none group-hover/user:opacity-100 group-hover/user:pointer-events-auto transition-all duration-150 z-50 p-1">
              <button
                onClick={onSignOut}
                className="w-full text-left px-3 py-2 text-xs text-text-muted hover:text-red-400 hover:bg-item-hover rounded transition-colors bg-transparent border-none cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

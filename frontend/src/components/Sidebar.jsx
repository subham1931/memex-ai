import { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, FileText, Loader2, Plus, MoreHorizontal, MessageSquare, Edit, X } from 'lucide-react';

export default function Sidebar({
  files,
  onUpload,
  onDeleteFile,
  onRenameFile,
  uploading,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onCreateSession,
  onClearChat,
  user,
  onSignOut,
  isOpen,
  onClose
}) {
  const fileInputRef = useRef(null);
  
  // Session UI states
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingIds, setDeletingIds] = useState([]);

  // File rename state
  const startFileRename = (filename) => {
    onRenameFile(filename);
  };
  
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

  // Handle session select on mobile (close sidebar after)
  const handleSessionClick = (sessionId) => {
    onSelectSession(sessionId);
    if (onClose) onClose();
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
    setOpenMenuId(null);
    onRenameSession(session.id);
  };

  const handleDeleteClick = (id) => {
    setOpenMenuId(null);
    setDeletingIds(prev => [...prev, id]);
    setTimeout(() => {
      onDeleteSession(id);
      setDeletingIds(prev => prev.filter(item => item !== id));
    }, 150);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[280px] sm:w-[260px]
        md:relative md:z-auto md:w-[260px] md:min-w-[260px]
        bg-sidebar-bg border-r border-border-subtle flex flex-col h-full min-h-0 
        text-text-primary select-none transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* App Branding + New Chat (unified header) */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">M</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[13px] font-semibold tracking-tight text-text-primary leading-tight">
                Memex
              </h1>
              <p className="text-[8px] uppercase tracking-[0.12em] text-text-muted font-medium leading-tight">
                Notes AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCreateSession}
              className="h-7 w-7 rounded-md border border-border-subtle hover:border-border-focus hover:bg-card-bg flex items-center justify-center transition-all duration-150 cursor-pointer"
              title="New Chat"
            >
              <Plus className="h-3.5 w-3.5 text-accent" />
            </button>
            {/* Close button - mobile only */}
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-md hover:bg-card-bg flex items-center justify-center transition-all duration-150 cursor-pointer md:hidden"
            >
              <X className="h-4 w-4 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Recents Chat Sessions History */}
        <div className="flex-1 overflow-y-auto px-2 py-3 border-b border-border-subtle flex flex-col gap-3 min-h-0">
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

                      return (
                        <div
                          key={session.id}
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
                            onClick={() => handleSessionClick(session.id)}
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-text-muted shrink-0" />
                            <span className="text-xs text-text-primary truncate font-normal select-none">
                              {session.title || "New Chat"}
                            </span>
                          </div>

                          {/* Three dot actions */}
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
        <div className="max-h-44 overflow-y-auto px-2 py-3 border-b border-border-subtle">
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
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => startFileRename(filename)}
                        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-item-hover cursor-pointer"
                        title="Rename"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDeleteFile(filename)}
                        className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-item-hover cursor-pointer"
                        title={`Delete ${filename}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Zone */}
        <div className="p-3 border-b border-border-subtle shrink-0">
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
            className="w-full py-2.5 border border-border-subtle rounded-md flex items-center justify-center gap-2 bg-item-hover hover:bg-card-bg hover:border-border-focus transition-all duration-150 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="p-3 bg-sidebar-bg flex flex-col gap-2.5 shrink-0">
          <button
            onClick={() => activeSession && onClearChat(activeSession.id)}
            disabled={!activeSession}
            className="text-[11px] text-text-muted hover:text-text-primary font-normal transition-colors duration-150 bg-transparent border-none p-0 cursor-pointer text-left disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear Chat
          </button>

          {user && (
            <div className="relative group/user pt-2 border-t border-border-subtle/50">
              <div className="flex items-center gap-2.5 p-1 rounded-md hover:bg-item-hover transition-all duration-150 cursor-pointer">
                <img
                  src={user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user=s96-c'}
                  alt="Avatar"
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
              
              {/* Sign out dropdown - pb-2 creates invisible hover bridge */}
              <div className="absolute bottom-full left-0 w-full pb-2 opacity-0 pointer-events-none group-hover/user:opacity-100 group-hover/user:pointer-events-auto transition-all duration-150 z-50">
                <div className="bg-card-bg border border-border-subtle rounded shadow-lg p-1">
                  <button
                    onClick={onSignOut}
                    className="w-full text-left px-3 py-2 text-xs text-text-muted hover:text-red-400 hover:bg-item-hover rounded transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

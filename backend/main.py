import os
from dotenv import load_dotenv
load_dotenv(override=True)

import datetime
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from supabase import create_client, Client

# Initialize Supabase client (service role for auth verification)
supabase_url = os.getenv("SUPABASE_URL")
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase_anon_key = os.getenv("SUPABASE_ANON_KEY") or supabase_service_key
supabase_client: Optional[Client] = None

if supabase_url and supabase_service_key and supabase_url != "your_supabase_project_url":
    try:
        supabase_client = create_client(supabase_url, supabase_service_key)
    except Exception as e:
        print(f"Warning: Failed to initialize Supabase client: {str(e)}")

# Import RAG pipeline functions
from rag import (
    add_document, query_documents, ask_llm, get_uploaded_files, delete_document, rename_document,
    get_model_options, DEFAULT_MODEL_ID,
)

app = FastAPI(title="Memex-AI API", description="Personal Notes Assistant RAG API")

# Enable CORS for frontend integration
frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
cors_origins = [frontend_url] if frontend_url else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependency to verify Supabase JWT
async def get_current_user(authorization: str = Header(None)):
    if not supabase_client:
        raise HTTPException(
            status_code=500, 
            detail="Supabase client is not configured on the server. Please check your backend/.env variables."
        )
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing.")
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Invalid authorization scheme. Must use 'Bearer <JWT>'."
        )
        
    token = authorization.replace("Bearer ", "")
    try:
        # Fetch user profile using token from Supabase
        user_response = supabase_client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired session token.")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# Dependency to create a request-scoped Supabase client authenticated with the user's JWT
def get_supabase_client(authorization: str = Header(None)) -> Client:
    if not supabase_url or not supabase_anon_key or supabase_url == "your_supabase_project_url":
        raise HTTPException(
            status_code=500, 
            detail="Supabase client is not configured on the server. Please check your backend/.env variables."
        )
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing.")
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Invalid authorization scheme. Must use 'Bearer <JWT>'."
        )
    token = authorization.replace("Bearer ", "")
    try:
        # Create request-scoped client with anon key + user JWT for RLS
        client = create_client(supabase_url, supabase_anon_key)
        client.postgrest.auth(token)
        return client
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize authenticated Supabase client: {str(e)}")

class AskRequest(BaseModel):
    question: str
    history: Optional[List[dict]] = None
    model_id: Optional[str] = DEFAULT_MODEL_ID

class SessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class MessageSave(BaseModel):
    role: str
    content: str
    sources: Optional[List[dict]] = None

class TitlePatch(BaseModel):
    title: str

class MessageUpdate(BaseModel):
    content: str

class FileRename(BaseModel):
    new_filename: str

@app.get("/config")
def get_config():
    return {
        "models": get_model_options(),
        "default_model_id": DEFAULT_MODEL_ID,
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user = Depends(get_current_user)):
    """
    Accepts .md, .txt, and .pdf files, chunks them, embeds via NVIDIA API,
    and stores them in Supabase (Storage + pgvector), isolated by user_id.
    """
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")
        
    if not (filename.endswith(".txt") or filename.endswith(".md") or filename.endswith(".pdf")):
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file format. Only .txt, .md, and .pdf files are allowed."
        )

    # Enforce max file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum allowed size is 10MB.")
        if filename.endswith(".pdf"):
            import io
            from pypdf import PdfReader
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            text_content = ""
            for page in reader.pages:
                text_content += page.extract_text() or ""
                text_content += "\n"
            
            if not text_content.strip():
                raise HTTPException(status_code=400, detail="The PDF file does not contain extractable text.")
        else:
            try:
                text_content = content.decode("utf-8")
            except UnicodeDecodeError:
                text_content = content.decode("latin-1")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")
        
    # Process through RAG pipeline, passing user.id
    try:
        result = add_document(filename, text_content, user.id, content)
        return {
            "filename": filename,
            "status": result["status"],
            "chunks_added": result["chunks_added"],
            "message": f"Successfully processed and indexed {result['chunks_added']} chunks."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

@app.post("/ask")
async def ask_question(request: AskRequest, user = Depends(get_current_user)):
    """
    Takes a question, retrieves top 3 relevant chunks via pgvector similarity search
    (filtered by user_id), submits them with context to Groq LLM, and returns the
    answer with sources.
    """
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    try:
        # Retrieve top 3 relevant chunks, passing user.id
        context_chunks = query_documents(question, user.id, n_results=3)
        
        # Get LLM's answer with conversation history
        answer = ask_llm(question, context_chunks, history=request.history, model_id=request.model_id)
        
        return {
            "answer": answer,
            "sources": context_chunks
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in RAG pipeline: {str(e)}")

@app.get("/files")
async def list_files(user = Depends(get_current_user)):
    """
    Returns list of all unique uploaded files, filtered by user_id.
    """
    try:
        files = get_uploaded_files(user.id)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@app.delete("/files/{filename}")
async def delete_file(filename: str, user = Depends(get_current_user)):
    """
    Removes file and its chunks from Supabase, filtered by user_id.
    """
    try:
        # Delete document from DB, passing user.id
        delete_document(filename, user.id)
        return {"status": "success", "message": f"File '{filename}' successfully deleted from database."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file '{filename}': {str(e)}")

@app.patch("/files/{filename}/rename")
async def rename_file(filename: str, body: FileRename, user = Depends(get_current_user)):
    """
    Renames a file (updates documents table and moves storage object).
    """
    new_filename = body.new_filename.strip()
    if not new_filename:
        raise HTTPException(status_code=400, detail="New filename cannot be empty.")
    if not (new_filename.endswith(".txt") or new_filename.endswith(".md") or new_filename.endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Filename must end with .txt, .md, or .pdf")
    try:
        result = rename_document(filename, new_filename, user.id)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename file: {str(e)}")

@app.post("/sessions")
async def create_session(request: SessionCreate = None, user = Depends(get_current_user), db: Client = Depends(get_supabase_client)):
    """
    Creates a new chat session linked to the authenticated user.
    """
    title = request.title if request else "New Chat"
    try:
        res = db.table("sessions").insert({"title": title, "user_id": user.id}).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=500, detail="Failed to create session in Supabase.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/sessions")
async def list_sessions(user = Depends(get_current_user), db: Client = Depends(get_supabase_client)):
    """
    Lists all sessions owned by the authenticated user.
    """
    try:
        res = db.table("sessions").select("*").eq("user_id", user.id).order("updated_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/sessions/{id}/messages")
async def list_session_messages(id: str, user = Depends(get_current_user), db: Client = Depends(get_supabase_client)):
    """
    Lists messages within a session, confirming session ownership.
    """
    try:
        # Ensure session ownership
        session_check = db.table("sessions").select("user_id").eq("id", id).execute()
        if not session_check.data or session_check.data[0]["user_id"] != user.id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this session.")
            
        res = db.table("messages").select("*").eq("session_id", id).eq("user_id", user.id).order("created_at", desc=False).execute()
        return res.data
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/sessions/{id}/messages")
async def save_session_message(id: str, msg: MessageSave, user = Depends(get_current_user), db: Client = Depends(get_supabase_client)):
    """
    Saves a chat message in a session, verifying ownership and updating timestamp.
    """
    try:
        # Ensure session ownership
        session_check = db.table("sessions").select("user_id").eq("id", id).execute()
        if not session_check.data or session_check.data[0]["user_id"] != user.id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this session.")
            
        insert_data = {
            "session_id": id,
            "role": msg.role,
            "content": msg.content,
            "sources": msg.sources,
            "user_id": user.id
        }
        res = db.table("messages").insert(insert_data).execute()
        
        # Touch session updated_at
        now_iso = datetime.datetime.utcnow().isoformat()
        db.table("sessions").update({"updated_at": now_iso}).eq("id", id).eq("user_id", user.id).execute()
        
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=500, detail="Failed to save message in Supabase.")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/sessions/{id}")
async def delete_session(id: str, user = Depends(get_current_user), db: Client = Depends(get_supabase_client)):
    """
    Deletes a session owned by the authenticated user.
    """
    try:
        # Cascade delete is enabled on foreign keys, so messages delete automatically
        res = db.table("sessions").delete().eq("id", id).eq("user_id", user.id).execute()
        return {"status": "success", "message": "Session and its messages deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.patch("/sessions/{id}/title")
async def update_session_title(id: str, patch: TitlePatch, user = Depends(get_current_user), db: Client = Depends(get_supabase_client)):
    """
    Renames a session owned by the authenticated user.
    """
    try:
        res = db.table("sessions").update({"title": patch.title}).eq("id", id).eq("user_id", user.id).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Session not found or not owned by user.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.patch("/messages/{message_id}")
async def update_message(message_id: str, patch: MessageUpdate, user = Depends(get_current_user), db: Client = Depends(get_supabase_client)):
    """
    Updates a message's content if owned by the user.
    """
    try:
        res = db.table("messages").update({"content": patch.content}).eq("id", message_id).eq("user_id", user.id).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Message not found or not owned by user.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/messages/{message_id}/subsequent")
async def delete_subsequent_messages(message_id: str, user = Depends(get_current_user), db: Client = Depends(get_supabase_client)):
    """
    Deletes all messages in the same session that were created after the target message.
    """
    try:
        # 1. Get the target message details (created_at, session_id)
        msg_check = db.table("messages").select("created_at", "session_id").eq("id", message_id).eq("user_id", user.id).execute()
        if not msg_check.data:
            raise HTTPException(status_code=404, detail="Target message not found or not owned by user.")
        
        target_created_at = msg_check.data[0]["created_at"]
        session_id = msg_check.data[0]["session_id"]
        
        # 2. Delete all messages created_at > target_created_at in the same session
        res = db.table("messages").delete().eq("session_id", session_id).eq("user_id", user.id).gt("created_at", target_created_at).execute()
        
        # 3. Touch session updated_at
        now_iso = datetime.datetime.utcnow().isoformat()
        db.table("sessions").update({"updated_at": now_iso}).eq("id", session_id).eq("user_id", user.id).execute()
        
        return {"status": "success", "deleted_count": len(res.data) if res.data else 0}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("ENV", "development") != "production"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)

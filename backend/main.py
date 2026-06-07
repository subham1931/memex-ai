import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# Import RAG pipeline functions
from rag import add_document, query_documents, ask_gemini, get_uploaded_files, delete_document

app = FastAPI(title="Memex-AI API", description="Personal Notes Assistant RAG API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development convenience
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class AskRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts .md, .txt, and .pdf files, chunks them, embeds with sentence-transformers,
    and stores them in ChromaDB.
    """
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")
        
    if not (filename.endswith(".txt") or filename.endswith(".md") or filename.endswith(".pdf")):
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file format. Only .txt, .md, and .pdf files are allowed."
        )
        
    try:
        content = await file.read()
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
        
    # Process through RAG pipeline
    try:
        result = add_document(filename, text_content)
        return {
            "filename": filename,
            "status": result["status"],
            "chunks_added": result["chunks_added"],
            "message": f"Successfully processed and indexed {result['chunks_added']} chunks."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

@app.post("/ask")
async def ask_question(request: AskRequest):
    """
    Takes a question, retrieves top 3 relevant chunks from ChromaDB,
    submits them with context to Gemini 1.5 Flash, and returns the answer with sources.
    """
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    try:
        # Retrieve top 3 relevant chunks
        context_chunks = query_documents(question, n_results=3)
        
        # Get Gemini's answer
        answer = ask_gemini(question, context_chunks)
        
        return {
            "answer": answer,
            "sources": context_chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in RAG pipeline: {str(e)}")

@app.get("/files")
async def list_files():
    """
    Returns list of all unique uploaded files in ChromaDB.
    """
    try:
        files = get_uploaded_files()
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    """
    Removes file and its chunks from ChromaDB.
    """
    try:
        # Delete document from DB
        delete_document(filename)
        return {"status": "success", "message": f"File '{filename}' successfully deleted from database."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file '{filename}': {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

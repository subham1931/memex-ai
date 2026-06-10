import os
import chromadb
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

# Configure Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Set DB Path
DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")

# Initialize SentenceTransformer model (all-MiniLM-L6-v2)
print("Loading sentence-transformers/all-MiniLM-L6-v2 model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded successfully.")

# Initialize ChromaDB Client
print(f"Connecting to ChromaDB at: {DB_PATH}")
chroma_client = chromadb.PersistentClient(path=DB_PATH)
# Get or create collection
collection = chroma_client.get_or_create_collection(name="memex_notes")
print("ChromaDB collection initialized.")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Split text into chunks of chunk_size characters with a specified overlap.
    """
    chunks = []
    text = text.strip()
    if not text:
        return chunks
        
    step = chunk_size - overlap
    if step <= 0:
        step = chunk_size  # Prevent infinite loop
        
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += step
        if start >= len(text):
            break
            
    return chunks

def add_document(filename: str, content: str, user_id: str) -> dict:
    """
    Chunks document content, embeds each chunk, and stores it in ChromaDB, isolated by user_id.
    """
    # Delete existing entries for this file and user to prevent duplicates on re-upload
    delete_document(filename, user_id)
    
    chunks = chunk_text(content)
    if not chunks:
        return {"status": "empty", "chunks_added": 0}
        
    # Generate embeddings
    embeddings = embedding_model.encode(chunks).tolist()
    
    # Generate unique IDs, documents, and metadata for ChromaDB
    ids = [f"{user_id}_{filename}_{i}" for i in range(len(chunks))]
    metadatas = [{"source": filename, "user_id": user_id} for _ in chunks]
    
    # Add to collection
    collection.add(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=chunks
    )
    
    return {"status": "success", "chunks_added": len(chunks)}

def query_documents(question: str, user_id: str, n_results: int = 3) -> list[dict]:
    """
    Embeds the question, retrieves top n_results relevant chunks from ChromaDB for the specified user_id.
    """
    if not question.strip():
        return []
        
    # Embed question
    query_embedding = embedding_model.encode(question).tolist()
    
    # Check current collection size
    count = collection.count()
    if count == 0:
        return []
        
    # n_results cannot be larger than collection size
    query_n = min(n_results, count)
    
    # Query only documents belonging to the user
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=query_n,
        where={"user_id": user_id}
    )
    
    chunks = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if "metadatas" in results and results["metadatas"] else []
        for i in range(len(docs)):
            source = metas[i].get("source", "Unknown") if i < len(metas) else "Unknown"
            chunks.append({
                "text": docs[i],
                "source": source
            })
            
    return chunks

def ask_gemini(question: str, context_chunks: list[dict]) -> str:
    """
    Queries Gemini 3.5 Flash using context chunks and strict system instructions.
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return "Error: Gemini API Key is not configured. Please add your GEMINI_API_KEY to the backend/.env file."
        
    # Format context
    if not context_chunks:
        context_str = "No relevant context found in the notes."
    else:
        context_str = ""
        for i, chunk in enumerate(context_chunks):
            context_str += f"--- Source: {chunk['source']} ---\n{chunk['text']}\n\n"
            
    system_instruction = """
You are Memex, a smart personal notes assistant. Answer questions based ONLY on the user's uploaded notes.

RESPONSE LENGTH RULES:
- Match answer length to question complexity.
- Simple question → 2-3 sentences, direct.
- Explanation question → medium length with details.
- Summary question → full detailed answer with sections.
- Never cut off mid-answer.

FORMATTING RULES (General):
- Use bullet points only when listing multiple items.
- For operators or symbols (e.g., +, -, ==, &&), use a Markdown table.
  Example:
  | Operator | Purpose |
  |----------|---------|
  | +        | Addition |
  | -        | Subtraction |
- Never put inline code like + or == inside a sentence with commas around them.
- Never add commas between code snippets.
- No trailing punctuation after code blocks.
- For short answers → plain conversational text only.

CODE BLOCKS & CODE SNIPPET DETERMINATION (CRITICAL):
- GUIDING PRINCIPLE: You must dynamically evaluate whether an element represents functional, executable, or syntax-based information (which belongs in a code block box) versus descriptive or conversational natural language (which does not). Use your judgment to prevent unnecessary clutter.
- WHAT SHOULD BE IN A CODE BLOCK BOX (using triple backticks: ```):
  * Complete source code, functions, JSX/HTML structures, CSS styles, or DB queries.
  * Shell scripts, terminal commands (e.g. package installations, git commands), and build commands.
  * Formal syntax, mathematical formulas, logic operators, or structural tokens.
  * When writing frontend elements, components, or UI code, you MUST include their accompanying styling (Tailwind classes, inline styles, or CSS rules) directly inside the block to present a fully-styled result.
- WHAT SHOULD NOT BE IN A CODE BLOCK BOX:
  * Do NOT put normal English words, terminology, abbreviations, file extensions, or abstract system concepts in code blocks if they are used in a conversational sentence.
  * Simple, readable references should remain plain conversational text to avoid breaking natural sentence flow.
- FORMATTING RESTRICTIONS:
  * Never use inline backticks (e.g., `code`) inside paragraphs or sentences.
  * All code block items must sit in their own separate, standalone triple-backtick (```) block.
  * If you need to refer to a piece of code or command, refer to it naturally in text (without backticks) or place the reference on its own line after the code block box.

Example of correct formatting:
Here's how to add two numbers in Python:
```python
result = 5 + 3
print(result)
```
This will output 8.

For a simple operator explanation:
The plus operator adds values:
```
+
```
This is used for addition.

TONE:
- Direct, confident, and conversational — like ChatGPT.
- Never say "based on the notes" or "according to context."
- Never pad or repeat yourself.
- If the answer is not in the notes, say exactly: "I couldn't find that in your notes."
"""
    
    try:
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            system_instruction=system_instruction
        )
        
        prompt = f"Context:\n{context_str}\n\nUser Question: {question}"
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error communicating with Gemini API: {str(e)}"

def get_uploaded_files(user_id: str) -> list[str]:
    """
    Returns unique list of filenames uploaded to ChromaDB by the specified user_id.
    """
    data = collection.get(where={"user_id": user_id}, include=["metadatas"])
    metadatas = data.get("metadatas", [])
    
    files = set()
    for meta in metadatas:
        if meta and "source" in meta:
            files.add(meta["source"])
            
    return sorted(list(files))

def delete_document(filename: str, user_id: str) -> None:
    """
    Removes all chunks of a filename for the specified user_id from ChromaDB.
    """
    # Use $and operator to filter by source and user_id
    collection.delete(
        where={
            "$and": [
                {"source": {"$eq": filename}},
                {"user_id": {"$eq": user_id}}
            ]
        }
    )

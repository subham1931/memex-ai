import os
from sentence_transformers import SentenceTransformer
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize Supabase client (service role - bypasses RLS for server-side operations)
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase_client: Client = None

if supabase_url and supabase_key:
    try:
        supabase_client = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Warning: Failed to initialize Supabase client in rag.py: {str(e)}")

# Initialize SentenceTransformer model (all-MiniLM-L6-v2)
print("Loading sentence-transformers/all-MiniLM-L6-v2 model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded successfully.")

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

def add_document(filename: str, content: str, user_id: str, raw_content: bytes) -> dict:
    """
    Saves document to Supabase Storage, chunks content, generates embeddings,
    and indexes them in the public.embeddings and public.documents tables.
    """
    if not supabase_client:
        raise ValueError("Supabase client is not initialized.")

    # 1. Clean up existing document entries for this user & filename
    # This will cascade delete related embeddings in public.embeddings
    delete_document(filename, user_id)

    # 2. Upload raw file to Supabase Storage
    storage_path = f"{user_id}/{filename}"
    try:
        # Upload new file.
        supabase_client.storage.from_("notes").upload(
            path=storage_path,
            file=raw_content,
            file_options={"x-upsert": "true", "content-type": "application/octet-stream"}
        )
    except Exception as e:
        # In case bucket or storage fails, print and retry without file_options
        try:
            supabase_client.storage.from_("notes").remove(storage_path)
        except Exception:
            pass
        supabase_client.storage.from_("notes").upload(path=storage_path, file=raw_content)

    # 3. Create document metadata entry
    doc_res = supabase_client.table("documents").insert({
        "user_id": user_id,
        "filename": filename,
        "file_path": storage_path
    }).execute()

    if not doc_res.data:
        raise ValueError("Failed to save document metadata in Supabase.")
    
    document_id = doc_res.data[0]["id"]

    # 4. Chunk text and generate embeddings
    chunks = chunk_text(content, chunk_size=500, overlap=50)
    if not chunks:
        return {"status": "empty", "chunks_added": 0}

    embeddings = embedding_model.encode(chunks).tolist()

    # 5. Insert chunks and vector embeddings into Supabase
    embeddings_data = []
    for chunk, emb in zip(chunks, embeddings):
        embeddings_data.append({
            "user_id": user_id,
            "document_id": document_id,
            "content": chunk,
            "embedding": emb
        })

    supabase_client.table("embeddings").insert(embeddings_data).execute()

    return {"status": "success", "chunks_added": len(chunks)}

def query_documents(question: str, user_id: str, n_results: int = 3) -> list[dict]:
    """
    Embeds the question, calls public.match_embeddings RPC vector similarity search,
    and returns top matching chunks with their source file names.
    """
    if not question.strip() or not supabase_client:
        return []

    # 1. Embed question
    query_embedding = embedding_model.encode(question).tolist()

    # 2. Call similarity search RPC function (returns content + filename via join)
    res = supabase_client.rpc("match_embeddings", {
        "query_embedding": query_embedding,
        "match_user_id": user_id,
        "match_count": n_results
    }).execute()

    chunks = []
    if res.data:
        for item in res.data:
            chunks.append({
                "text": item["content"],
                "source": item.get("filename", "Unknown")
            })

    return chunks

def get_llm_response(prompt, system_instruction=None, history=None):
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    if history:
        # Include recent conversation history (last 6 messages max to stay within token limits)
        for msg in history[-6:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": prompt})
    
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1000
    )
    return response.choices[0].message.content

def ask_llm(question: str, context_chunks: list[dict], history: list[dict] = None) -> str:
    """
    Queries LLM (via Groq) using context chunks and strict system instructions.
    """
    if not os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") == "your_groq_api_key_here":
        return "Error: Groq API Key is not configured. Please add your GROQ_API_KEY to the backend/.env file."
        
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
- Simple question -> 2-3 sentences, direct.
- Explanation question -> medium length with details.
- Summary question -> full detailed answer with sections.
- Never cut off mid-answer.

FORMATTING RULES (General):
- Use bullet points only when listing multiple items.
- Do NOT use Markdown tables under any circumstances (they are not supported by the frontend renderer).
- For listings, maps, or definitions of operators or symbols (e.g., +, -, ==, &&), always present them inside a code block box (triple backticks) using clean text-based alignment.
  Example:
  ```
  +   -> Addition
  -   -> Subtraction
  *   -> Multiplication
  /   -> Division
  ```
- Never put inline code like + or == inside a sentence with commas around them.
- Never add commas between code snippets.
- No trailing punctuation after code blocks.
- For short answers -> plain conversational text only.

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
- If the answer is not in the notes, say exactly: "This information is not in your notes."
"""
    
    try:
        prompt = f"Context:\n{context_str}\n\nUser Question: {question}"
        return get_llm_response(prompt, system_instruction, history=history)
    except Exception as e:
        return f"Error communicating with Groq LLM API: {str(e)}"

def get_uploaded_files(user_id: str) -> list[str]:
    """
    Returns unique list of filenames uploaded to Supabase by the specified user_id.
    """
    if not supabase_client:
        return []
    res = supabase_client.table("documents").select("filename").eq("user_id", user_id).execute()
    filenames = []
    if res.data:
        for doc in res.data:
            filenames.append(doc["filename"])
    return sorted(list(set(filenames)))

def delete_document(filename: str, user_id: str) -> None:
    """
    Removes all document metadata and chunk vector embeddings for the specified user_id,
    and removes the file from Supabase Storage.
    """
    if not supabase_client:
        return

    # 1. Fetch document metadata to retrieve Storage file_path
    doc_res = supabase_client.table("documents").select("id, file_path").eq("user_id", user_id).eq("filename", filename).execute()
    if doc_res.data:
        for doc in doc_res.data:
            # 2. Delete document row (cascades to delete embeddings)
            supabase_client.table("documents").delete().eq("id", doc["id"]).execute()

            # 3. Delete file from Storage notes bucket
            try:
                supabase_client.storage.from_("notes").remove(doc["file_path"])
            except Exception as e:
                print(f"Warning: Failed to delete Storage file {doc['file_path']}: {str(e)}")

import os
from typing import Optional
from groq import Groq
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(override=True)

# LLM / embedding model identifiers (override via backend/.env)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "Groq")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "NVIDIA")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nvidia/nv-embedcode-7b-v1")
NVIDIA_LLM_MODEL = os.getenv("NVIDIA_LLM_MODEL", "meta/llama-3.1-70b-instruct")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "16"))
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "4096"))
DEFAULT_MODEL_ID = "groq"

def get_model_options() -> list[dict]:
    return [
        {
            "id": "groq",
            "provider": LLM_PROVIDER,
            "model": LLM_MODEL,
        },
        {
            "id": "nvidia",
            "provider": EMBEDDING_PROVIDER,
            "model": EMBEDDING_MODEL,
            "chat_model": NVIDIA_LLM_MODEL,
        },
    ]

def resolve_model_id(model_id: Optional[str]) -> str:
    valid_ids = {option["id"] for option in get_model_options()}
    if model_id in valid_ids:
        return model_id
    return DEFAULT_MODEL_ID

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase_client: Client = None

if supabase_url and supabase_key:
    try:
        supabase_client = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Warning: Failed to initialize Supabase client in rag.py: {str(e)}")

_nvidia_client = None

def get_nvidia_client() -> OpenAI:
    global _nvidia_client
    if _nvidia_client is None:
        api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key or api_key == "your_nvidia_api_key_here":
            raise ValueError("NVIDIA_API_KEY is not configured in backend/.env")
        _nvidia_client = OpenAI(api_key=api_key, base_url=NVIDIA_BASE_URL)
    return _nvidia_client

def embed_texts(texts: list[str], input_type: str = "passage") -> list[list[float]]:
    if not texts:
        return []

    client = get_nvidia_client()
    embeddings: list[list[float]] = []

    for i in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[i:i + EMBEDDING_BATCH_SIZE]
        response = client.embeddings.create(
            input=batch,
            model=EMBEDDING_MODEL,
            encoding_format="float",
            extra_body={"input_type": input_type, "truncate": "NONE"},
        )
        sorted_data = sorted(response.data, key=lambda item: item.index)
        embeddings.extend(item.embedding for item in sorted_data)

    return embeddings

def embed_query(text: str) -> list[float]:
    return embed_texts([text], input_type="query")[0]

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
        step = chunk_size

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

    delete_document(filename, user_id)

    storage_path = f"{user_id}/{filename}"
    try:
        supabase_client.storage.from_("notes").upload(
            path=storage_path,
            file=raw_content,
            file_options={"x-upsert": "true", "content-type": "application/octet-stream"}
        )
    except Exception as e:
        try:
            supabase_client.storage.from_("notes").remove(storage_path)
        except Exception:
            pass
        supabase_client.storage.from_("notes").upload(path=storage_path, file=raw_content)

    doc_res = supabase_client.table("documents").insert({
        "user_id": user_id,
        "filename": filename,
        "file_path": storage_path
    }).execute()

    if not doc_res.data:
        raise ValueError("Failed to save document metadata in Supabase.")

    document_id = doc_res.data[0]["id"]

    chunks = chunk_text(content, chunk_size=500, overlap=50)
    if not chunks:
        return {"status": "empty", "chunks_added": 0}

    embeddings = embed_texts(chunks, input_type="passage")

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

def _embedding_dimension_error(exc: Exception) -> Optional[str]:
    message = str(exc)
    if "different vector dimensions" in message or "22000" in message:
        return (
            f"Embedding dimension mismatch: the database expects vectors compatible with "
            f"{EMBEDDING_DIM} dimensions (NVIDIA {EMBEDDING_MODEL}), but old 384-dim data or "
            f"schema may still exist. Run supabase_migration_embedding_4096.sql in the "
            f"Supabase SQL Editor, then re-upload your notes."
        )
    return None

def query_documents(question: str, user_id: str, n_results: int = 3) -> list[dict]:
    """
    Embeds the question, calls public.match_embeddings RPC vector similarity search,
    and returns top matching chunks with their source file names.
    """
    if not question.strip() or not supabase_client:
        return []

    query_embedding = embed_query(question)

    try:
        res = supabase_client.rpc("match_embeddings", {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "match_count": n_results
        }).execute()
    except Exception as e:
        hint = _embedding_dimension_error(e)
        if hint:
            raise ValueError(hint) from e
        raise

    chunks = []
    if res.data:
        for item in res.data:
            chunks.append({
                "text": item["content"],
                "source": item.get("filename", "Unknown")
            })

    return chunks

def get_llm_response(prompt, system_instruction=None, history=None, model_id: str = DEFAULT_MODEL_ID):
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    if history:
        for msg in history[-6:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": prompt})

    model_id = resolve_model_id(model_id)

    if model_id == "nvidia":
        client = get_nvidia_client()
        response = client.chat.completions.create(
            model=NVIDIA_LLM_MODEL,
            messages=messages,
            max_tokens=1000,
        )
    else:
        response = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            max_tokens=1000,
        )
    return response.choices[0].message.content

def ask_llm(question: str, context_chunks: list[dict], history: list[dict] = None, model_id: str = DEFAULT_MODEL_ID) -> str:
    """
    Queries LLM (via Groq) using context chunks and strict system instructions.
    """
    model_id = resolve_model_id(model_id)
    if model_id == "groq" and (not os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") == "your_groq_api_key_here"):
        return "Error: Groq API Key is not configured. Please add your GROQ_API_KEY to the backend/.env file."
    if model_id == "nvidia" and (not os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY") == "your_nvidia_api_key_here"):
        return "Error: NVIDIA API Key is not configured. Please add your NVIDIA_API_KEY to the backend/.env file."

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
        return get_llm_response(prompt, system_instruction, history=history, model_id=model_id)
    except Exception as e:
        provider = "NVIDIA" if resolve_model_id(model_id) == "nvidia" else "Groq"
        return f"Error communicating with {provider} LLM API: {str(e)}"

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

    doc_res = supabase_client.table("documents").select("id, file_path").eq("user_id", user_id).eq("filename", filename).execute()
    if doc_res.data:
        for doc in doc_res.data:
            supabase_client.table("documents").delete().eq("id", doc["id"]).execute()

            try:
                supabase_client.storage.from_("notes").remove(doc["file_path"])
            except Exception as e:
                print(f"Warning: Failed to delete Storage file {doc['file_path']}: {str(e)}")

def rename_document(old_filename: str, new_filename: str, user_id: str) -> dict:
    """
    Renames a document's filename in the documents table and moves the file in Storage.
    """
    if not supabase_client:
        raise ValueError("Supabase client is not initialized.")

    doc_res = supabase_client.table("documents").select("id, file_path").eq("user_id", user_id).eq("filename", old_filename).execute()
    if not doc_res.data:
        raise ValueError(f"Document '{old_filename}' not found.")

    for doc in doc_res.data:
        old_path = doc["file_path"]
        new_path = f"{user_id}/{new_filename}"

        try:
            supabase_client.storage.from_("notes").move(old_path, new_path)
        except Exception as e:
            try:
                file_data = supabase_client.storage.from_("notes").download(old_path)
                supabase_client.storage.from_("notes").upload(
                    path=new_path,
                    file=file_data,
                    file_options={"x-upsert": "true", "content-type": "application/octet-stream"}
                )
                supabase_client.storage.from_("notes").remove([old_path])
            except Exception as inner_e:
                print(f"Warning: Could not move file in storage: {inner_e}")

        supabase_client.table("documents").update({
            "filename": new_filename,
            "file_path": new_path
        }).eq("id", doc["id"]).execute()

    return {"status": "success", "old_filename": old_filename, "new_filename": new_filename}

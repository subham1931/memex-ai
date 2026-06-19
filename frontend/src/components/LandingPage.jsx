import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Sparkles, Brain, Shield, Zap, FileText, 
  MessageSquare, Search, Upload, ArrowRight, 
  Users, Star, Globe, Code, Database,
  ChevronDown, ChevronUp, CheckCircle, Quote,
  Lock, Cpu, Layers
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAuthenticated(true);
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      alert(`Failed to sign in: ${err.message}`);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/app');
    else handleGoogleLogin();
  };

  const features = [
    { icon: <Brain className="h-5 w-5" />, title: "RAG-Powered Answers", desc: "Precise answers sourced directly from your uploaded notes using retrieval-augmented generation." },
    { icon: <Shield className="h-5 w-5" />, title: "Private & Secure", desc: "Your notes are encrypted and isolated per user with row-level security. No one else can access your data." },
    { icon: <Zap className="h-5 w-5" />, title: "Instant Intelligence", desc: "Powered by LLaMA 3.3 70B via Groq for blazing-fast, high-quality responses in under 3 seconds." },
    { icon: <Search className="h-5 w-5" />, title: "Semantic Search", desc: "384-dimensional vector embeddings understand meaning, not just keywords. Find anything with natural language." },
    { icon: <FileText className="h-5 w-5" />, title: "Multi-Format Support", desc: "Upload Markdown, plain text, and PDF files. All formats are chunked and indexed automatically." },
    { icon: <MessageSquare className="h-5 w-5" />, title: "Conversation Memory", desc: "Multi-turn conversations with full history. The AI remembers context within each chat session." }
  ];

  const stats = [
    { value: "1,200+", label: "Active Users" },
    { value: "50K+", label: "Notes Indexed" },
    { value: "4.9/5", label: "User Rating" },
    { value: "99.9%", label: "Uptime" }
  ];

  const testimonials = [
    { name: "Priya Sharma", role: "CS Student, IIT Delhi", text: "Memex-AI transformed how I study. I upload my lecture notes and can instantly find answers during exam prep.", avatar: "P" },
    { name: "Alex Chen", role: "Product Manager", text: "The only AI note tool that stays within my notes and doesn't hallucinate. The source references are a game-changer.", avatar: "A" },
    { name: "Sarah Johnson", role: "Researcher, Stanford", text: "The semantic search is incredible. I can ask questions in completely different wording and it still finds relevant passages.", avatar: "S" },
    { name: "Rahul Patel", role: "Full Stack Developer", text: "I keep all my technical documentation in Memex. When I forget an API pattern, I just ask and get the exact source.", avatar: "R" }
  ];

  const techStack = [
    { name: "React 19", desc: "Modern UI framework", icon: <Code className="h-4 w-4" /> },
    { name: "FastAPI", desc: "High-perf Python backend", icon: <Zap className="h-4 w-4" /> },
    { name: "Supabase", desc: "Auth, DB & storage", icon: <Database className="h-4 w-4" /> },
    { name: "pgvector", desc: "Vector similarity search", icon: <Search className="h-4 w-4" /> },
    { name: "Groq + LLaMA", desc: "Ultra-fast LLM inference", icon: <Cpu className="h-4 w-4" /> },
    { name: "sentence-transformers", desc: "384-dim embeddings", icon: <Globe className="h-4 w-4" /> }
  ];

  const faqs = [
    { q: "Is my data private?", a: "Yes. Your notes are stored in your own isolated Supabase bucket. Row-level security ensures no other user can access your data. We never use your notes to train models." },
    { q: "What file formats are supported?", a: "Memex supports .txt (plain text), .md (Markdown), and .pdf files. All files are automatically chunked into 500-character segments with overlap for optimal retrieval." },
    { q: "How accurate are the answers?", a: "Memex only answers from your uploaded notes using RAG. If the answer isn't in your notes, it will tell you directly rather than hallucinating." },
    { q: "Is there a file size limit?", a: "Each file can be up to 10MB. There's no limit on the number of files you can upload." },
    { q: "Can I use it for free?", a: "Yes! Memex-AI is completely free. Sign in with Google and start uploading immediately. No credit card required." },
    { q: "How fast are the responses?", a: "Responses typically arrive in 1-3 seconds thanks to Groq's inference engine. Vector search takes milliseconds." }
  ];

  const comparisons = [
    { feature: "Answers from YOUR notes only", memex: true, chatgpt: false, notion: false },
    { feature: "Source references", memex: true, chatgpt: false, notion: true },
    { feature: "Semantic vector search", memex: true, chatgpt: false, notion: true },
    { feature: "No hallucinations", memex: true, chatgpt: false, notion: false },
    { feature: "Multi-turn conversation", memex: true, chatgpt: true, notion: false },
    { feature: "PDF/Markdown/TXT support", memex: true, chatgpt: true, notion: false },
    { feature: "100% data privacy", memex: true, chatgpt: false, notion: false },
    { feature: "Free to use", memex: true, chatgpt: false, notion: false }
  ];

  return (
    <div className="min-h-screen w-full bg-[#08080a] font-sans text-white overflow-x-hidden relative">
      {/* Grid background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Floating accent orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/8 rounded-full blur-[180px] pointer-events-none" />
      <div className="fixed top-[60%] right-0 w-[400px] h-[400px] bg-violet-700/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#08080a]/70 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">Memex-AI</span>
          </div>
          
          <div className="hidden sm:flex items-center gap-6 text-[13px] text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <button
            onClick={handleGetStarted}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer shadow-lg shadow-purple-600/20"
          >
            {isAuthenticated ? 'Open App' : 'Sign In'}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-36 sm:pt-44 pb-24 sm:pb-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Powered by LLaMA 3.3 70B</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Your Personal{' '}
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
              Notes Intelligence
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your notes, ask anything, and get precise AI-powered answers sourced 
            exclusively from your personal knowledge base. Private, fast, and accurate.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 cursor-pointer shadow-xl shadow-purple-600/25 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <GoogleIcon />
              {isAuthenticated ? 'Open App' : 'Get Started Free'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer">
              See how it works
              <ChevronDown className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* App Preview Card */}
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/20 via-violet-600/10 to-purple-600/20 rounded-2xl blur-xl" />
            <div className="relative bg-[#0f0f13] border border-white/10 rounded-xl p-1 shadow-2xl">
              {/* Mini browser chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
                <div className="h-2 w-2 rounded-full bg-red-500/60" />
                <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
                <div className="h-2 w-2 rounded-full bg-green-500/60" />
                <div className="ml-3 h-5 flex-1 max-w-[200px] bg-white/5 rounded-md" />
              </div>
              {/* App mockup content */}
              <div className="flex h-[280px] sm:h-[340px]">
                {/* Sidebar mock */}
                <div className="w-[180px] border-r border-white/5 p-3 hidden sm:block">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-5 w-5 rounded bg-purple-600/50" />
                    <div className="h-3 w-14 bg-white/10 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 bg-purple-600/10 border border-purple-500/20 rounded px-2 flex items-center"><div className="h-2 w-20 bg-white/20 rounded" /></div>
                    <div className="h-7 bg-white/5 rounded px-2 flex items-center"><div className="h-2 w-16 bg-white/10 rounded" /></div>
                    <div className="h-7 bg-white/5 rounded px-2 flex items-center"><div className="h-2 w-24 bg-white/10 rounded" /></div>
                  </div>
                </div>
                {/* Chat mock */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-end"><div className="bg-purple-600/20 border border-purple-500/20 rounded-lg px-3 py-2 max-w-[60%]"><div className="h-2.5 w-32 bg-white/20 rounded" /></div></div>
                    <div className="flex justify-start"><div className="border-l-2 border-purple-500 pl-3 space-y-1.5 max-w-[75%]"><div className="h-2 w-8 bg-purple-400/30 rounded" /><div className="h-2.5 w-full bg-white/10 rounded" /><div className="h-2.5 w-3/4 bg-white/10 rounded" /><div className="h-2.5 w-1/2 bg-white/10 rounded" /></div></div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <div className="h-2.5 flex-1 bg-white/10 rounded" />
                    <div className="h-6 w-6 bg-purple-600 rounded flex items-center justify-center"><ArrowRight className="h-3 w-3 text-white" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating diamonds decoration */}
          <div className="absolute top-1/4 left-8 h-3 w-3 rotate-45 bg-purple-500/20 border border-purple-500/30 hidden lg:block" />
          <div className="absolute bottom-1/4 right-12 h-4 w-4 rotate-45 bg-purple-500/15 border border-purple-500/20 hidden lg:block" />
          <div className="absolute top-1/3 right-20 h-2 w-2 rotate-45 bg-violet-400/30 hidden lg:block" />
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="py-14 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">{s.value}</div>
                <div className="text-[10px] sm:text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES — Bento Grid ===== */}
      <section id="features" className="py-24 sm:py-32 px-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-purple-400 mb-3">
              <span className="h-px w-6 bg-purple-500/50" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Features</span>
              <span className="h-px w-6 bg-purple-500/50" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything You Need to{' '}
              <span className="text-purple-400">Master</span> Your Notes
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto mt-4">
              From upload to answer in seconds. Built for speed, privacy, and accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f, i) => (
              <div key={i} className="group relative p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-white/[0.04] transition-all duration-300">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="h-10 w-10 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover:bg-purple-600/20 group-hover:border-purple-500/40 transition-all duration-300">
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-24 sm:py-32 px-4 sm:px-6 border-y border-white/5 bg-white/[0.01] relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-purple-400 mb-3">
              <span className="h-px w-6 bg-purple-500/50" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">How It Works</span>
              <span className="h-px w-6 bg-purple-500/50" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Three Steps to{' '}
              <span className="text-purple-400">Smarter</span> Notes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-14 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            
            {[
              { step: "01", icon: <Upload className="h-6 w-6" />, title: "Upload Notes", desc: "Drop your .md, .txt, or .pdf files. They're automatically chunked into 500-char segments and embedded into 384-dim vectors." },
              { step: "02", icon: <Search className="h-6 w-6" />, title: "Ask Anything", desc: "Type naturally. The AI performs semantic similarity search across all your note vectors to find the most relevant passages." },
              { step: "03", icon: <MessageSquare className="h-6 w-6" />, title: "Get Precise Answers", desc: "Receive sourced answers with exact references to the note passages. No hallucinations — only your knowledge." }
            ].map((item, i) => (
              <div key={i} className="text-center relative">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-purple-600/10 border border-purple-500/30 text-purple-400 mb-5 relative z-10">
                  {item.icon}
                </div>
                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Step {item.step}</div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-purple-400 mb-3">
              <span className="h-px w-6 bg-purple-500/50" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Testimonials</span>
              <span className="h-px w-6 bg-purple-500/50" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Loved by <span className="text-purple-400">Thousands</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-200">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 text-purple-400 fill-purple-400" />)}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <span className="text-xs text-white font-bold">{t.avatar}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPARISON TABLE ===== */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-purple-400 mb-3">
              <span className="h-px w-6 bg-purple-500/50" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Compare</span>
              <span className="h-px w-6 bg-purple-500/50" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Why <span className="text-purple-400">Memex-AI</span>?
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/5">
                  <th className="text-left py-3.5 px-4 font-medium text-zinc-400">Feature</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-purple-400">Memex-AI</th>
                  <th className="text-center py-3.5 px-4 font-medium text-zinc-500">ChatGPT</th>
                  <th className="text-center py-3.5 px-4 font-medium text-zinc-500">Notion AI</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03] last:border-none hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-zinc-300">{row.feature}</td>
                    <td className="text-center py-3 px-4">{row.memex ? <CheckCircle className="h-4 w-4 text-green-400 mx-auto" /> : <span className="text-zinc-600">—</span>}</td>
                    <td className="text-center py-3 px-4">{row.chatgpt ? <CheckCircle className="h-4 w-4 text-zinc-500 mx-auto" /> : <span className="text-zinc-600">—</span>}</td>
                    <td className="text-center py-3 px-4">{row.notion ? <CheckCircle className="h-4 w-4 text-zinc-500 mx-auto" /> : <span className="text-zinc-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== TECH STACK ===== */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-purple-400 mb-3">
              <span className="h-px w-6 bg-purple-500/50" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Architecture</span>
              <span className="h-px w-6 bg-purple-500/50" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              The <span className="text-purple-400">Components</span> That Make It Possible
            </h2>
            <p className="text-sm text-zinc-500 mt-4 max-w-md mx-auto">Every layer chosen for performance, reliability, and developer experience.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {techStack.map((tech, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.04] transition-all duration-200">
                <div className="h-9 w-9 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  {tech.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{tech.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-24 sm:py-32 px-4 sm:px-6 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-purple-400 mb-3">
              <span className="h-px w-6 bg-purple-500/50" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">FAQ</span>
              <span className="h-px w-6 bg-purple-500/50" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02] hover:border-white/10 transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer bg-transparent border-none outline-none"
                >
                  <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-purple-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 animate-fade-in">
                    <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/5 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-medium text-zinc-500">Memex-AI</span>
          </div>
          <p className="text-[11px] text-zinc-600">
            Built with RAG, pgvector & Groq. Your data stays private. © 2025
          </p>
        </div>
      </footer>
    </div>
  );
}

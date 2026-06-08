import React from 'react';
import { supabase } from '../supabaseClient';
import { Sparkles } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="h-5 w-5 mr-3 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 12-4.52z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Login redirection error:', err.message);
      alert(`Failed to sign in with Google: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#0a0a0a] flex items-center justify-center font-sans relative overflow-hidden">
      {/* Background radial glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-[460px] bg-[#111111] border border-[#222222] rounded-2xl p-12 flex flex-col items-center justify-center shadow-2xl shadow-black relative z-10 mx-4 animate-fade-in">
        {/* Brand Logo */}
        <div className="h-14 w-14 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-6 transition-transform hover:scale-105 duration-300">
          <Sparkles className="h-7 w-7 text-white" />
        </div>

        {/* Title & Tagline */}
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            Memex-AI
          </h1>
          <p className="text-sm text-zinc-400 font-medium">
            Your private notes intelligence
          </p>
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center py-3.5 px-5 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer shadow-lg shadow-black/10 hover:shadow-white/5 hover:scale-[1.01] active:scale-[0.99] border-none outline-none"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        {/* Footer Security Muted Copy */}
        <p className="text-[10px] text-zinc-600 mt-8 font-medium tracking-wide uppercase select-none">
          Your notes never leave your device
        </p>
      </div>
    </div>
  );
}

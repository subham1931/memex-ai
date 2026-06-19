import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let timer = null;
    let subscription = null;

    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          navigate('/app', { replace: true });
        } else if (error) {
          throw error;
        } else {
          // Listen for session established
          const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
              sub.unsubscribe();
              navigate('/app', { replace: true });
            }
          });
          subscription = sub;

          // Timeout fallback of 5 seconds
          timer = setTimeout(() => {
            if (subscription) subscription.unsubscribe();
            navigate('/login', { replace: true });
          }, 5000);
        }
      } catch (err) {
        console.error('Auth callback processing failed:', err);
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();

    return () => {
      if (timer) clearTimeout(timer);
      if (subscription) subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen w-screen bg-[#0a0a0a] flex items-center justify-center font-sans text-zinc-300 relative">
      <div className="flex flex-col items-center gap-4 relative z-10 text-center px-4 animate-pulse">
        <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
        <h2 className="text-lg font-semibold text-white tracking-wide">Completing sign in...</h2>
        <p className="text-xs text-zinc-500 max-w-xs">
          Please wait while we establish your secure session with Google.
        </p>
      </div>
    </div>
  );
}

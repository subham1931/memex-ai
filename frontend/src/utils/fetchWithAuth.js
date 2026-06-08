import { supabase } from '../supabaseClient';

/**
 * Fetch wrapper that automatically appends the Supabase JWT access token 
 * to the Authorization header.
 */
export async function fetchWithAuth(url, options = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    return await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    console.error('Error in fetchWithAuth while retrieving session:', err);
    // Fallback to normal fetch if session retrieval fails
    return await fetch(url, options);
  }
}

export const getBackendUrl = () => {
    // If VITE_BACKEND_URL env is provided, use it
    if (import.meta.env.VITE_BACKEND_URL) {
        return import.meta.env.VITE_BACKEND_URL;
    }
    
    // Otherwise fallback if VITE_API_URL exists
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace('/api', '');
    }

    // Auto-detect localhost vs production Render deployment
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.startsWith('192.168.');
                        
    return isLocalhost 
        ? 'http://localhost:5000' 
        : 'https://export-lanka-eglf.onrender.com';
};

export const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    return `${getBackendUrl()}/api`;
};

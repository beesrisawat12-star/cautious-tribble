// js/config.js
const CONFIG = {
    SUPABASE_URL: "https://oxplceitowvaqencyntg.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_W1EQ8QZCDKLO33LzFwUbA_m0jVP_6h",
    DEFAULT_LAT: 14.8824,
    DEFAULT_LNG: 100.4020,
    EDGE_FUNC_URL: "https://mango-ai-backend2.vercel.app/api"
};

let supabaseClient = typeof supabase !== 'undefined'
    ? supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
    }) : null;

const STATE = {
    user: null, isGuest: true,
    isForcedOffline: localStorage.getItem('mango_forced_offline') === 'true',
    orchards: [], currentOrchardId: null,
    currentLocation: { lat: CONFIG.DEFAULT_LAT, lng: CONFIG.DEFAULT_LNG },
    weather: null, weatherRequestToken: 0, tasks: [], records: [], taskFilter: 'ALL', orchardLoadToken: 0, initialized: false
};

const NETWORK_MODE = {
    isEffectiveOnline: () => !STATE.isForcedOffline && navigator.onLine,
    toggleMode: () => {
        STATE.isForcedOffline = !STATE.isForcedOffline;
        localStorage.setItem('mango_forced_offline', STATE.isForcedOffline);
        updateNetworkStatusUI();
        if (STATE.isForcedOffline) UTILITIES.showToast('สลับเป็นโหมดออฟไลน์เรียบร้อย (ระบบใช้ฐานข้อมูลเครื่อง)', 'info');
        else { UTILITIES.showToast('สลับเป็นโหมดออนไลน์เรียบร้อย พร้อมซิงค์ Cloud', 'success'); if (window.SYNC && typeof SYNC.syncAll === 'function') SYNC.syncAll(); }
    }
};

function updateNetworkStatusUI() {
    const pill = document.getElementById('network-status-btn'), text = document.getElementById('network-status-text'), dot = document.getElementById('network-dot');
    if (pill && text && dot) {
        const online = NETWORK_MODE.isEffectiveOnline();
        pill.className = online ? 'px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1 cursor-pointer hover:opacity-80 transition' : 'px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1 cursor-pointer hover:opacity-80 transition';
        dot.className = online ? 'w-1.5 h-1.5 rounded-full bg-emerald-400' : 'w-1.5 h-1.5 rounded-full bg-amber-400';
        text.innerText = online ? 'Online Mode' : 'Offline Mode';
    }
}

function loadAuthModule() {
    if (window.AUTH) { AUTH.init(); return; }
    const authScript = document.createElement('script'); authScript.src = 'auth.js'; authScript.onload = () => AUTH.init(); authScript.onerror = () => console.error('Unable to load auth module'); document.head.appendChild(authScript);
}
function loadPhotoAnalysisModule() {
    if (window.PHOTO_ANALYSIS) { PHOTO_ANALYSIS.init(); return; }
    const script = document.createElement('script'); script.src = 'photo-analysis.js'; script.onload = () => PHOTO_ANALYSIS.init(); script.onerror = () => console.error('Unable to load photo analysis module'); document.head.appendChild(script);
}
function ensureSupabaseAndAuth() {
    const startAuth = () => {
        if (!supabaseClient && typeof supabase !== 'undefined') supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
        loadAuthModule(); loadPhotoAnalysisModule();
    };
    if (typeof supabase !== 'undefined') { startAuth(); return; }
    const supabaseScript = document.createElement('script'); supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'; supabaseScript.onload = startAuth; supabaseScript.onerror = () => console.error('Unable to load Supabase client'); document.head.appendChild(supabaseScript);
}
ensureSupabaseAndAuth();

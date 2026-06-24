import { useState, useCallback, useEffect } from 'react';

const FILE_NAME   = 'jee_tracker_backup.json';
const REDIRECT_URI = 'https://jee-tracker-ten.vercel.app';

// Buffer: treat token as expired 2 minutes early to avoid edge cases
const EXPIRY_BUFFER_MS = 2 * 60 * 1000;

export function useDriveSync() {
  const [isLoggedIn,     setIsLoggedIn]     = useState(() => {
    // Only consider logged in if token exists AND hasn't expired
    const expiry = parseInt(localStorage.getItem('gdrive_token_expiry') || '0', 10);
    return localStorage.getItem('gdrive_loggedin') === 'true' &&
           localStorage.getItem('gdrive_token') !== null &&
           Date.now() < expiry - EXPIRY_BUFFER_MS;
  });
  const [token,          setToken]          = useState(() => {
    const expiry = parseInt(localStorage.getItem('gdrive_token_expiry') || '0', 10);
    return Date.now() < expiry - EXPIRY_BUFFER_MS
      ? localStorage.getItem('gdrive_token')
      : null;
  });
  const [isSyncing,      setIsSyncing]      = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // ── Token expiry helper ────────────────────────────────────────────────────
  function isTokenExpired() {
    const expiry = parseInt(localStorage.getItem('gdrive_token_expiry') || '0', 10);
    return Date.now() >= expiry - EXPIRY_BUFFER_MS;
  }

  function handleExpired() {
    console.warn('⏰ Google token expired — clearing session');
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expiry');
    localStorage.removeItem('gdrive_loggedin');
    setToken(null);
    setIsLoggedIn(false);
    setSessionExpired(true);
  }

  // ── Guard: call before every Drive request ─────────────────────────────────
  function guardToken(accessToken) {
    if (!accessToken || isTokenExpired()) {
      handleExpired();
      return false;
    }
    return true;
  }

  // ── Handle 401 from any Drive response ────────────────────────────────────
  async function checkResponse(res) {
    if (res.status === 401) {
      handleExpired();
      return null;
    }
    return res;
  }

  // ── Capture token from URL hash on OAuth redirect ─────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return;

    const params      = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');
    const expiresIn   = parseInt(params.get('expires_in') || '3600', 10);

    if (accessToken) {
      const expiryTs = Date.now() + expiresIn * 1000;

      setToken(accessToken);
      setIsLoggedIn(true);
      setSessionExpired(false);
      localStorage.setItem('gdrive_token',        accessToken);
      localStorage.setItem('gdrive_token_expiry', String(expiryTs));
      localStorage.setItem('gdrive_loggedin',     'true');

      window.history.replaceState(null, '', window.location.pathname);
      console.log(`✅ Token captured. Expires in ${expiresIn}s (at ${new Date(expiryTs).toLocaleTimeString()})`);

      fetchDataFromDrive(accessToken);
    }
  }, []);

  // ── Periodic expiry check (every 60s) ─────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      if (isTokenExpired()) handleExpired();
    }, 60_000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // ── Download from Drive ────────────────────────────────────────────────────
  const fetchDataFromDrive = async (accessToken) => {
    if (!guardToken(accessToken)) return;
    setIsSyncing(true);
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const checked = await checkResponse(searchRes);
      if (!checked) return;

      const searchData = await checked.json();

      if (searchData.files && searchData.files.length > 0) {
        const fileId  = searchData.files[0].id;
        const fileRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const fileChecked = await checkResponse(fileRes);
        if (!fileChecked) return;

        const backupData = await fileChecked.json();
        let hasChanges = false;

        Object.keys(backupData).forEach(key => {
          if (localStorage.getItem(key) !== backupData[key]) {
            Storage.prototype.setItem.call(localStorage, key, backupData[key]);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          alert('✅ Cloud Sync Complete! Restoring your JEE Command Center...');
          window.location.reload();
        } else {
          console.log('✅ Drive data already in sync.');
        }
      } else {
        console.log('ℹ️ No backup found on Drive. Starting fresh.');
      }
    } catch (e) {
      console.error('❌ Fetch error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Save to Drive ──────────────────────────────────────────────────────────
  const saveToDrive = useCallback(async (accessToken) => {
    // ⚠️  KEY FIX: guard before every save attempt
    if (!guardToken(accessToken)) {
      console.warn('⚠️ Skipping Drive save — token expired. User needs to reconnect.');
      return;
    }

    setIsSyncing(true);
    try {
      const dataToSave = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tracker-')) {
          dataToSave[key] = localStorage.getItem(key);
        }
      }
      const fileContent = JSON.stringify(dataToSave);

      // Find existing file
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const checked = await checkResponse(searchRes);
      if (!checked) return;

      const searchData = await checked.json();
      let fileId = searchData.files?.[0]?.id || null;

      // Create if not found
      if (!fileId) {
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method:  'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] }),
        });
        const createChecked = await checkResponse(createRes);
        if (!createChecked) return;
        const createData = await createChecked.json();
        fileId = createData.id;
      }

      // Upload content
      if (fileId) {
        const uploadRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method:  'PATCH',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body:    fileContent,
          }
        );

        const uploadChecked = await checkResponse(uploadRes);
        if (!uploadChecked) return;

        if (uploadChecked.ok) {
          console.log(`✅ Synced to Drive. Size: ${fileContent.length} bytes`);
        } else {
          console.error('❌ Upload failed:', await uploadChecked.text());
        }
      }
    } catch (error) {
      console.error('❌ Drive sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const loginWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('❌ Client ID not found! Check Vercel environment variables.');
      return;
    }
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/drive.appdata ' +
      'https://www.googleapis.com/auth/drive.file'
    );
    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${REDIRECT_URI}` +
      `&response_type=token` +
      `&scope=${scope}` +
      `&prompt=consent`;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logoutGoogle = () => {
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expiry');
    localStorage.removeItem('gdrive_loggedin');
    setToken(null);
    setIsLoggedIn(false);
    setSessionExpired(false);
  };

  return {
    isLoggedIn,
    token,
    loginWithGoogle,
    logoutGoogle,
    saveToDrive,
    isSyncing,
    sessionExpired,  // ← NEW: use this in App.jsx to show "Session expired" banner
  };
}

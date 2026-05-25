import { useState, useCallback, useEffect } from 'react';

const FILE_NAME = 'jee_tracker_backup.json';
const REDIRECT_URI = 'https://jee-tracker-ten.vercel.app'; 

export function useDriveSync() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('gdrive_loggedin') === 'true');
  const [token, setToken] = useState(() => localStorage.getItem('gdrive_token') || null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 📥 Drive se data wapas khinchne ka (Download) logic
  const fetchDataFromDrive = async (accessToken) => {
    setIsSyncing(true);
    try {
      // Pehle check karo file Drive me hai ya nahi
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const searchData = await searchRes.json();

      if (searchData.files && searchData.files.length > 0) {
        const fileId = searchData.files[0].id;
        
        // File mil gayi, ab usko download karo (alt=media)
        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const backupData = await fileRes.json();

        let hasChanges = false;
        
        // Loop chalake saara data local storage me wapas daalo
        Object.keys(backupData).forEach(key => {
            if (localStorage.getItem(key) !== backupData[key]) {
                // Using raw Storage API to silently set items without triggering the App.jsx auto-save loop
                Storage.prototype.setItem.call(localStorage, key, backupData[key]);
                hasChanges = true;
            }
        });

        if (hasChanges) {
           alert("✅ Cloud Sync Complete! Restoring your JEE Command Center...");
           window.location.reload(); // Page refresh to show downloaded data
        } else {
           console.log("✅ Drive Data is already in sync with local.");
        }
      } else {
         console.log("ℹ️ No previous backup found on Drive. Starting fresh.");
      }
    } catch (e) {
       console.error("❌ Fetch Error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // 🚀 URL se token catch karna + Auto Restore
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        setToken(accessToken);
        setIsLoggedIn(true);
        localStorage.setItem('gdrive_token', accessToken);
        localStorage.setItem('gdrive_loggedin', 'true');
        
        window.history.replaceState(null, '', window.location.pathname);
        console.log("✅ RAW OAUTH BYPASS SUCCESSFUL!");
        
        // Login hote hi data utha lo!
        fetchDataFromDrive(accessToken);
      }
    }
  }, []);

  const loginWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("❌ Client ID not found! Check Vercel environment variables.");
      return;
    }
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${scope}&prompt=consent`;
    
    window.location.href = authUrl; 
  };

  const logoutGoogle = () => {
    setIsLoggedIn(false);
    setToken(null);
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_loggedin');
    console.log("Logged out of Google Drive.");
  };

  // 📤 Upload Logic (🔥 FIXED: 2-Step Media Upload)
  const saveToDrive = useCallback(async (accessToken) => {
    if (!accessToken) return;
    setIsSyncing(true);

    try {
      // 1. Pura LocalStorage data ekathha karo
      const dataToSave = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('tracker-')) dataToSave[key] = localStorage.getItem(key);
      }
      
      const fileContent = JSON.stringify(dataToSave);

      // 2. Check karo ki GDrive appDataFolder me file pehle se hai ya nahi
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const searchData = await searchRes.json();
      
      let fileId = null;
      if (searchData.files && searchData.files.length > 0) fileId = searchData.files[0].id;

      // 3. Agar file nahi hai, toh pehle khali dabba (metadata) banao
      if (!fileId) {
        const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: FILE_NAME,
            parents: ['appDataFolder']
          })
        });
        const createData = await createRes.json();
        fileId = createData.id;
      }

      // 4. Ab us dabbe me asli data upload karo (uploadType=media)
      if (fileId) {
        const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json' // Actual JSON content type
          },
          body: fileContent
        });

        if (uploadRes.ok) {
           console.log("✅ Data successfully synced to Google Drive! Size:", fileContent.length, "bytes");
        } else {
           console.error("❌ Upload failed at media step:", await uploadRes.text());
        }
      }
    } catch (error) {
      console.error("❌ Drive Sync Catch Error:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { isLoggedIn, token, loginWithGoogle, logoutGoogle, saveToDrive, isSyncing };
}

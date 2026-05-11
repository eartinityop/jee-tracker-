import { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const FILE_NAME = 'jee_tracker_backup.json';

export function useDriveSync() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Google Login Setup
  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("✅ GOOGLE LOGIN SUCCESS! Token received.");
      setToken(tokenResponse.access_token);
      setIsLoggedIn(true); // Ye line teri app me GDrive ko 'Active' dikhayegi
    },
    onError: (error) => {
      console.error('❌ GOOGLE LOGIN FAILED:', error);
      alert("Login failed! Check console for details.");
    },
    // Sirf AppData folder me access mangega (Hidden & Secure)
    scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
  });

  const logoutGoogle = () => {
    setIsLoggedIn(false);
    setToken(null);
    console.log("Logged out of Google Drive.");
  };

  // 2. Drive Sync Logic (Create or Update)
  const saveToDrive = useCallback(async (accessToken) => {
    if (!accessToken) return;
    setIsSyncing(true);

    try {
      // Pura local storage data collect karo
      const dataToSave = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('tracker-')) dataToSave[key] = localStorage.getItem(key);
      }
      
      const fileContent = JSON.stringify(dataToSave);
      const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };

      // Step A: Check if file already exists in Drive
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const searchData = await searchRes.json();
      let fileId = null;
      
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
      }

      // Step B: Prepare upload data
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      // Step C: If file exists, update it (PATCH). If not, create new (POST).
      const url = fileId 
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      
      const method = fileId ? 'PATCH' : 'POST';

      const uploadRes = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form
      });

      if (uploadRes.ok) {
        console.log("✅ Data successfully synced to Google Drive!");
      } else {
        console.error("❌ Sync failed with status:", uploadRes.status);
      }

    } catch (error) {
      console.error("❌ Drive Sync Catch Error:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { isLoggedIn, token, loginWithGoogle, logoutGoogle, saveToDrive, isSyncing };
}

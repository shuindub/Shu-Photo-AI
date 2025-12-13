
import { Logger } from '../utils/logger';
import { HistoryItem, UserProfile } from '../types';

const FOLDER_NAME = 'Shu Photo AI Data';
const FILE_NAME = 'history.json';

let tokenClient: any;
let accessToken: string | null = null;
let tokenExpiration: number = 0;

export const initGoogleAuth = (clientId: string, onUserLoggedIn?: (user: UserProfile) => void) => {
    if (!clientId) return;
    
    // Check if script is loaded
    if (!(window as any).google) {
        Logger.warn("DriveService", "Google Identity Services script not loaded");
        return;
    }

    try {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: async (tokenResponse: any) => {
                if (tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    // Approximate expiration (usually 1 hour)
                    tokenExpiration = Date.now() + (tokenResponse.expires_in * 1000);
                    Logger.success("DriveService", "Access Token received");
                    
                    // Fetch User Profile immediately after auth
                    const user = await fetchUserProfile();
                    if (user && onUserLoggedIn) {
                        onUserLoggedIn(user);
                    }
                }
            },
        });
        Logger.info("DriveService", "Google Auth Initialized");
    } catch (e) {
        Logger.error("DriveService", "Failed to initialize Google Auth", e);
    }
};

export const signIn = () => {
    if (tokenClient) {
        // Force prompt to ensure we get a fresh token if needed, or select account
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        Logger.error("DriveService", "Token Client not initialized");
    }
};

export const signOut = () => {
    if (accessToken && (window as any).google) {
        (window as any).google.accounts.oauth2.revoke(accessToken, () => {
            Logger.info("DriveService", "Token revoked");
        });
    }
    accessToken = null;
    tokenExpiration = 0;
};

export const isConnected = () => {
    return !!accessToken && Date.now() < tokenExpiration;
};

const fetchUserProfile = async (): Promise<UserProfile | null> => {
    if (!accessToken) return null;
    try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        return {
            name: data.name,
            email: data.email,
            picture: data.picture
        };
    } catch (e) {
        Logger.error("DriveService", "Failed to fetch user profile", e);
        return null;
    }
};

// --- Drive Logic ---

const findFile = async (name: string, parents: string[] | null = null) => {
    if (!accessToken) return null;
    let query = `name='${name}' and trashed=false`;
    if (parents) {
        query += ` and '${parents[0]}' in parents`;
    } else {
        // If searching for folder, look in root implicitly or explicitly
    }
    // Only search specifically for folders if looking for the main folder
    if (!parents) query += " and mimeType='application/vnd.google-apps.folder'";

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
};

const createFolder = async (name: string) => {
    if (!accessToken) return null;
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    const data = await res.json();
    return data;
};

const createFile = async (name: string, parentId: string, content: string) => {
    if (!accessToken) return null;
    const metadata = {
        name,
        parents: [parentId],
        mimeType: 'application/json'
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
    });
    return await res.json();
};

const updateFile = async (fileId: string, content: string) => {
    if (!accessToken) return null;
    
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: content
    });
    return await res.json();
};

const downloadFileContent = async (fileId: string): Promise<any> => {
    if (!accessToken) return null;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return await res.json();
};

// --- Synchronization Logic ---

export const syncHistoryWithDrive = async (localHistory: HistoryItem[]): Promise<HistoryItem[]> => {
    if (!isConnected()) {
        Logger.warn("DriveService", "Cannot sync, not connected");
        return localHistory;
    }

    try {
        Logger.info("DriveService", "Starting Sync...");

        // 1. Find or Create Folder
        let folder = await findFile(FOLDER_NAME);
        if (!folder) {
            folder = await createFolder(FOLDER_NAME);
            Logger.info("DriveService", "Created App Folder");
        }

        // 2. Find History File
        let file = await findFile(FILE_NAME, [folder.id]);
        let cloudHistory: HistoryItem[] = [];

        if (file) {
            // 3. Read Cloud Content
            try {
                cloudHistory = await downloadFileContent(file.id);
                if (!Array.isArray(cloudHistory)) cloudHistory = [];
            } catch (e) {
                Logger.warn("DriveService", "Failed to parse cloud history, starting fresh", e);
                cloudHistory = [];
            }
        }

        // 4. Merge (Newest wins, dedup by ID)
        const mergedMap = new Map<string, HistoryItem>();
        
        // Add cloud items first
        cloudHistory.forEach(item => mergedMap.set(item.id, item));
        
        // Add local items (overwrite cloud if ID matches - assuming local is latest during active session, 
        // essentially a basic merge. For true conflict resolution timestamps are needed, but this is sufficient for single user).
        localHistory.forEach(item => mergedMap.set(item.id, item));

        const mergedHistory = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);

        // 5. Write back to Cloud
        const content = JSON.stringify(mergedHistory, null, 2);
        if (file) {
            await updateFile(file.id, content);
            Logger.success("DriveService", `Updated history.json (${mergedHistory.length} items)`);
        } else {
            await createFile(FILE_NAME, folder.id, content);
            Logger.success("DriveService", `Created history.json (${mergedHistory.length} items)`);
        }

        return mergedHistory;

    } catch (e) {
        Logger.error("DriveService", "Sync failed", e);
        throw e;
    }
};

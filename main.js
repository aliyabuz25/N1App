const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec, spawn } = require('child_process');
const { version } = require('./package.json');

/**
 * N1Boost - Production Main Process
 * Refactored for stability and security.
 */

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: true // Development: Enabled for debugging
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open DevTools by default for easier inspection
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    scanLaunchers();
    startSecurityWatchdog();
    checkUpdates();
}

/**
 * Security Watchdog: Anti-Analysis (Detects Fiddler, Wireshark, etc.)
 */
function startSecurityWatchdog() {
    const prohibitedProcesses = [
        'Fiddler', 'Wireshark', 'dumpcap', 'HTTPDebuggerUI', 'Charles',
        'Simple.Data.Sniffer', 'W033_Sniffer', 'Iris', 'WinDump', 'smsniff'
    ];

    setInterval(() => {
        exec('tasklist', (err, stdout) => {
            if (err) return;
            const lines = stdout.split('\n');
            const found = prohibitedProcesses.some(proc =>
                lines.some(line => line.toLowerCase().includes(proc.toLowerCase()))
            );

            if (found) {
                if (mainWindow) {
                    dialog.showMessageBoxSync(mainWindow, {
                        type: 'error',
                        title: 'N1 Security Protocol',
                        message: 'Prohibited analysis tool detected. Closing session for security.',
                        buttons: ['OK']
                    });
                }
                app.quit();
            }
        });
    }, 5000);
}

/**
 * Update System: Checks GitHub for newer versions
 */
function checkUpdates() {
    const remoteUrl = 'https://raw.githubusercontent.com/aliyabuz25/N1App/main/package.json';

    https.get(remoteUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const remotePackage = JSON.parse(data);
                const remoteVersion = remotePackage.version;
                if (isNewerVersion(remoteVersion, version)) {
                    showUpdateNotification(remoteVersion);
                }
            } catch (e) {
                console.log('[DEBUG] Update check bypass (likely first deploy or private repo)');
            }
        });
    }).on('error', (err) => {
        console.error('Update check service error:', err.message);
    });
}

function isNewerVersion(remote, local) {
    const r = remote.split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (r[i] > l[i]) return true;
        if (r[i] < l[i]) return false;
    }
    return false;
}

function showUpdateNotification(newVersion) {
    if (mainWindow) {
        mainWindow.webContents.send('console-log', `[UPDATE] New version available: v${newVersion}. Redirecting to download...`);

        dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'N1App - Update Required',
            message: `A newer version (v${newVersion}) is available. Your version is v${version}. Would you like to update now?`,
            buttons: ['Update Now', 'Later'],
            defaultId: 0,
            cancelId: 1
        }).then(({ response }) => {
            if (response === 0) {
                require('electron').shell.openExternal('https://github.com/aliyabuz25/N1App/releases');
            }
        });
    }
}

/**
 * Launcher Path Scanner: Registry and Config based
 */
function scanLaunchers() {
    const userDataPath = app.getPath('userData');
    const rFile = path.join(userDataPath, 'riotLaunch.txt');
    const sFile = path.join(userDataPath, 'steamLaunch.txt');
    const eFile = path.join(userDataPath, 'EALaunch.txt');

    // Riot Scan
    let riotPath = null;
    const riotConfigs = [
        path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'Riot Games/RiotClientInstalls.json'),
        path.join(process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local', 'Riot Games/RiotClientInstalls.json')
    ];
    riotConfigs.forEach(cp => {
        if (fs.existsSync(cp)) {
            try {
                const data = JSON.parse(fs.readFileSync(cp, 'utf8'));
                if (data.rc_default) riotPath = data.rc_default;
            } catch (e) { }
        }
    });
    if (riotPath) fs.writeFileSync(rFile, riotPath);

    // Steam Scan
    exec('reg query "HKCU\\Software\\Valve\\Steam" /v SteamExe', (err, stdout) => {
        if (!err) {
            const match = stdout.match(/SteamExe\s+REG_SZ\s+(.+)/);
            if (match && match[1]) {
                const sPath = match[1].trim().replace(/\//g, '\\');
                fs.writeFileSync(sFile, sPath);
            }
        }
    });

    // EA Scan
    exec('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop" /v LauncherPath', (err, stdout) => {
        if (!err) {
            const match = stdout.match(/LauncherPath\s+REG_SZ\s+(.+)/);
            if (match && match[1]) {
                const ePath = match[1].trim().replace(/\//g, '\\');
                fs.writeFileSync(eFile, ePath);
            }
        }
    });
}

app.whenReady().then(() => {
    app.setAppUserModelId('tech.n1boost.n1app');
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- API Handlers ---
const API_BASE = "https://api.n1boost.com/v1/n1app";
const API_KEY = "UP5h8LIL5t3PdAFxMw5jinWsT1I7sW3N";

ipcMain.handle('auth-secure', async (event, { email, password }) => {
    try {
        const response = await fetch(`${API_BASE}/claimed-boost-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('get-order-detail', async (event, { orderId, email, password }) => {
    try {
        const response = await fetch(`${API_BASE}/claimed-boost-orders/${orderId}/detail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('select-launcher', async (event, type) => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Executables', extensions: ['exe'] }]
    });

    if (filePaths && filePaths.length > 0) {
        const userDataPath = app.getPath('userData');
        const fileName = (type === 'riot') ? 'riotLaunch.txt' : (type === 'steam' ? 'steamLaunch.txt' : 'EALaunch.txt');
        fs.writeFileSync(path.join(userDataPath, fileName), filePaths[0]);
        return filePaths[0];
    }
    return null;
});

ipcMain.handle('get-launcher-paths', async () => {
    const userDataPath = app.getPath('userData');
    const getPath = (f) => fs.existsSync(path.join(userDataPath, f)) ? fs.readFileSync(path.join(userDataPath, f), 'utf8') : 'OFFLINE';
    return {
        riot: getPath('riotLaunch.txt'),
        steam: getPath('steamLaunch.txt'),
        ea: getPath('EALaunch.txt')
    };
});

// --- Launcher Automation ---

const https = require('https');

// --- Native LCU Automation (Node.js) ---

ipcMain.on('launch-game', (event, { username, password, gameMotor }) => {
    const motor = gameMotor.toLowerCase();
    const launcherPath = path.join(__dirname, 'LauncherTool.exe');

    if (['valorant', 'lol', 'tft', 'apex'].includes(motor)) {
        const type = (motor === 'apex') ? 'ea' : 'riot';
        mainWindow.webContents.send('console-log', `[STEP] Dispatching External Automation Tool (${type.toUpperCase()})...`);

        const child = spawn(launcherPath, [type, username, password], {
            detached: true,
            stdio: 'pipe'
        });

        child.stdout.on('data', (data) => {
            mainWindow.webContents.send('console-log', data.toString().trim());
        });

        child.stderr.on('data', (data) => {
            mainWindow.webContents.send('console-log', `[ERROR] ${data.toString().trim()}`);
        });

        child.unref();
    } else if (['steam', 'cs2', 'dota2', 'rust', 'pubg'].includes(motor)) {
        automateSteamLogin(username, password);
    }
});

async function nativeRiotLogin(username, password) {
    // Deprecated: Logic moved to LauncherTool.exe for better UI automation
}

// --- Other Launchers ---

function automateEALogin(username, password) {
    // Deprecated in favor of LauncherTool.exe but kept for reference if needed
    // The main entry point now calls LauncherTool.exe directly for EA/Apex
}

function automateSteamLogin(username, password) {
    if (mainWindow) mainWindow.webContents.send('console-log', `[DEBUG] Identity: ${username} | Hash: ${password}`);

    const userDataPath = app.getPath('userData');
    const sFile = path.join(userDataPath, 'steamLaunch.txt');

    if (fs.existsSync(sFile)) {
        const steamPath = fs.readFileSync(sFile, 'utf8').trim();
        if (steamPath && steamPath !== 'OFFLINE') {
            exec('taskkill /F /IM steam.exe /IM steamwebhelper.exe /T', () => {
                setTimeout(() => {
                    spawn(steamPath, ["-login", username, password, "-remember-password", "-noreactlogin"], {
                        detached: true,
                        stdio: 'ignore'
                    }).unref();
                    if (mainWindow) mainWindow.webContents.send('console-log', '[SUCCESS] Steam dispatched with secure credentials.');
                }, 2000);
            });
        }
    } else {
        if (mainWindow) mainWindow.webContents.send('console-log', '[FATAL] Steam path not configured.');
    }
}

ipcMain.on('minimize-app', () => mainWindow.minimize());
ipcMain.on('close-app', () => app.quit());

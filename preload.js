const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    launchGame: (data) => ipcRenderer.send('launch-game', data),
    selectLauncher: (type) => ipcRenderer.invoke('select-launcher', type),
    closeApp: () => ipcRenderer.send('close-app'),
    minimizeApp: () => ipcRenderer.send('minimize-app'),
    getLauncherPaths: () => ipcRenderer.invoke('get-launcher-paths'),
    authenticate: (creds) => ipcRenderer.invoke('auth-secure', creds),
    getOrderDetail: (orderId) => ipcRenderer.invoke('get-order-detail', orderId),
    onLaunchError: (callback) => ipcRenderer.on('launch-error', (event, message) => callback(message)),
    onConsoleLog: (callback) => ipcRenderer.on('console-log', (event, message) => callback(message))
});

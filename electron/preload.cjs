const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kaosan", {
  loadSettings: () => ipcRenderer.invoke("settings:load"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  openImage: () => ipcRenderer.invoke("dialog:openImage"),
  openSettingsFile: () => ipcRenderer.invoke("dialog:openSettings"),
  saveSettingsAs: (settings) => ipcRenderer.invoke("dialog:saveSettingsAs", settings),
  openAvatarWindow: (settings) => ipcRenderer.invoke("avatar:open", settings),
  onSettingsUpdated: (callback) => {
    ipcRenderer.on("settings:updated", (_event, settings) => callback(settings));
  }
});

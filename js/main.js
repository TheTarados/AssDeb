// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu} = require('electron');
const fs = require('fs');
const path = require('path');
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();
const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    minHeight: 700,
    minWidth : 1200,
    icon: __dirname + '/../icon.png',
    webPreferences: {
      preload: path.join(__dirname, '/preload.js'),
      contextIsolation: false,
      nodeIntegration:true
    }
  })
  remoteMain.enable(mainWindow.webContents)
  // and load the index.html of the app.
  mainWindow.loadFile('index.html')
  
  chal_submenu = [];
  fs.readdirSync('./challenges').forEach(file => {
    chal_submenu.push({label: file.split('.')[1], click: () => { mainWindow.webContents.send('Open Challenge', file) }});
  });
  
  const template = [
    {
        label: 'File',
        submenu: [
          { label: 'Open file', click: () => { mainWindow.webContents.send('Open file') } },
          { label: 'Close file', click: () => { mainWindow.webContents.send('Close file') } },
          { label: 'Save file', click: () => { mainWindow.webContents.send('Save file') } },
          { label: 'Select Language'
          , submenu: [ 
            { label: 'ArmV4', click: () => { mainWindow.webContents.send('Select Language', 'ArmV4') }},
            {label: 'ArmV5', click: () => { mainWindow.webContents.send('Select Language', 'ArmV5') }}
           ] 
          }
        ]
    },
    {
        label: 'Hex',
          submenu: [
            { label: 'Hex to Clipboard', click: () => { mainWindow.webContents.send('Hex to Clipboard') } },
            { label: 'Hex to File', click: () => { mainWindow.webContents.send('Hex to File') } }
          ]
    },
    {
        label: 'Challenge',
          submenu: [
            { label: 'Challenge', 
              submenu: chal_submenu
            },
            { label: 'Quit Challenge', click: () => { mainWindow.webContents.send('Quit Challenge') } }
          ]
    }
]
const menu = Menu.buildFromTemplate (template)
Menu.setApplicationMenu (menu)
  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  
  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
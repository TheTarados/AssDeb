let opened_file = null;
//Create ipcrenderer
const { ipcRenderer } = require('electron')
//Require dialog
const remote = require('@electron/remote');
const { dialog } = remote;
var fs = require('fs'); // Load the File System to execute our common tasks (CRUD)
const fsPromises = require('fs').promises;
//Listen to event "Open file" from main.js
ipcRenderer.on('Open file', (event, arg) => {
    //Open file dialog
    dialog.showOpenDialog({
            properties: ['openFile']
        }).then( (fileNames) => {
            // fileNames is an array that contains all the selected
            if(fileNames === undefined){
                return;
            }
            opened_file = fileNames.filePaths[0];
            fs.promises.readFile(fileNames.filePaths[0]).then((data) => {
                text_area.value = data.toString();
            }).then(()=>{update_line_number()})
        })
    
}
)

ipcRenderer.on('Close file', (event, arg) => {
    text_area.value = "";
    update_line_number();
    opened_file = null;
})

ipcRenderer.on('Save file', (event, arg) => {
    dialog.showSaveDialog().then((path) => {
        opened_file = path.filePath;
        fs.writeFile (path.filePath, text_area.value, function(err) {
            if (err) throw err;
        });
      });
})
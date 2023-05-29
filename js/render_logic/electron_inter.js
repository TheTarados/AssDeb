let opened_file = null;
//Create ipcrenderer
const { ipcRenderer, clipboard } = require('electron')
//Require dialog
const remote = require('@electron/remote');
const { dialog } = remote;
var fs = require('fs'); // Load the File System to execute our common tasks (CRUD)
const Armv4 = require('./js/render_logic/armv4/armv4.js');
const Armv5 = require('./js/render_logic/armv5/armv5.js');
const fsPromises = require('fs').promises;

var can_gen_hex = true;

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

language = new Armv4();
ipcRenderer.on('Select Language', (event, arg) => {
    switch (arg) {
        case "ArmV4":
            language = new Armv4();
            break;
        case "ArmV5":
            language = new Armv5();

            break;
        default:
            break;
    }
    
    unblock_buttons();
    error_info.style.visibility = "hidden";
    language.setup_code(text_area.value);
}
)
ipcRenderer.on('Hex to Clipboard', (event, arg) => {
    if(!can_gen_hex){
        throw "Can't generate hex";
    }
    clipboard.writeText(language.get_hex(text_area.value));
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
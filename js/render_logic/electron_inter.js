const op_fil = document.getElementById("Open file");
const sa_fil = document.getElementById("Save file");
//const amv4 = document.getElementById("Armv4");
//const amv5 = document.getElementById("Armv5")
const hex_fil = document.getElementById("Hex to File");



op_fil.addEventListener("change", handleFiles, false);
function handleFiles() {
    const fileList = this.files; /* now you can work with the file list */
    var reader = new FileReader();
    reader.readAsText(fileList[0], "UTF-8");
    reader.onload = function (evt) {
        text_area.value = evt.target.result;
    }
}
/*
hex_fil.addEventListener("change", handleFiles, false);
function handleFiles() {
    const fileList = this.files; // now you can work with the file list 
    var reader = new FileReader();
    reader.readAsText(fileList[0], "UTF-8");
    reader.onload = function (evt) {
        text_area.value = evt.target.result;
    }
}*/
/*
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
})
*/
/*
hex_fil.onclick = () => {
    if(!can_gen_hex){
        dialog.showErrorBox("Can't generate hex", "We have detected errors in your code. Please fix them before you try to generate hex.");
        throw "Can't generate hex";
    }
    clipboard.writeText(language.get_hex(text_area.value));
}*/
/*
ipcRenderer.on('Hex to File', (event, arg) => {
    if(!can_gen_hex){
        dialog.showErrorBox("Can't generate hex", "We have detected errors in your code. Please fix them before you try to generate hex.");
        throw "Can't generate hex";
    }
    dialog.showSaveDialog().then((path) => {
        fs.writeFile (path.filePath, language.get_hex(text_area.value), function(err) {
            if (err) throw err;
        });
      }
    );
})*/
/*
ipcRenderer.on('Close file', (event, arg) => {
    text_area.value = "";
    update_line_number();
    opened_file = null;
})*/
/*
sa_fil.onclick = () => {
    dialog.showSaveDialog().then((path) => {
        opened_file = path.filePath;
        fs.writeFile (path.filePath, text_area.value, function(err) {
            if (err) throw err;
        });
      });
}*/
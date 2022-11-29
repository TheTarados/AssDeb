const step_button = document.getElementById("step");
const run_button = document.getElementById("run");
const pause_button = document.getElementById("pause");
const stop_button = document.getElementById("stop");
const com_ind = document.getElementById("com_ind");
const break_ind = document.getElementById("break_ind");
const error_info = document.getElementById("error_info");
const text_area = document.getElementById("text_zone");
const line_numbers = document.getElementById("line_number");
const ram_css = document.getElementById("ram");	
const stack_css = document.getElementById("stack");	
const timeline_css = document.getElementById("timeline");	

let backup_pos_com_ind = 0;
const cst_com = 3;

let com_ind_0 = cst_com;
let code; 
let code_lines;
let break_points = [];
let is_executing = false;
let is_running = false;
let slider_value = 500;
let ram = {};
let jmp_addr = {};
let run_through_break = true;
let mousePosition = {x:0, y:0};

com_ind.style.top = "0px";
break_ind.style.top = cst_com+"px";
error_info.style.top = cst_com+"px";

com_ind.style.visibility = "hidden";
break_ind.style.visibility = "hidden";
error_info.style.visibility = "hidden";
let mouse_hover_text = false;

step_button.onclick = ()=>{
    let backup = is_executing;
    step(); 
    if(backup)
        advance_timeline();
    update_registers_display();
    update_ram_display();
    update_stack_display();
};

run_button.onclick = run;
pause_button.onclick = pause;
stop_button.onclick = stop;

text_area.oninput = ()=>{
    if(opened_file!=null){
        fs.writeFile (opened_file, text_area.value, function(err) {
            if (err) throw err;
        });
    }
    setup_code();
    update_line_number();};

document.getElementById("slider").oninput = log_slider;

function log_slider(input){
    slider_value = 10**((480-this.value)/100);
}


function change_base(i){
    reg_base[i]= base_looping[reg_base[i]];
    base_changers[i].innerHTML = "<div class=base_show id=base_show_"+i+">"+reg_base[i]+"</div>"
    update_registers_display();
    document.getElementById("base_show_"+i).onclick = ()=>{change_base(i)};
}

for (let i = 0; i < base_changers.length; i++) {
    base_changers[i].innerHTML = "<div class=base_show id=base_show_"+i+">"+reg_base[i]+"</div>"
    document.getElementById("base_show_"+i).onclick = ()=>{change_base(i)}
    
}
update_registers_display();
update_stack_display();
text_area.addEventListener('mousemove',function(mouseMoveEvent){
mousePosition.x = mouseMoveEvent.pageX;
mousePosition.y = mouseMoveEvent.pageY;
});


//Prevent change of focus when pressing tab in text area
text_area.addEventListener('keydown', function(e) {
    if (e.key == 'Tab') {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;

        // set textarea value to: text before caret + tab + text after caret
        this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);

        // put caret at right position again
        this.selectionStart = this.selectionEnd = start + 1;

    } else if(e.ctrlKey && mouse_hover_text && code_lines!=undefined &&code_lines.length > 0){
        let i = Math.floor((mousePosition.y-cst_com)/16);
        //if code lines contains i
        if(code_lines.includes(i)){
            break_ind.style.visibility = "visible";
            break_ind.style.top =  (cst_com+16*i)+"px"
        }else{
            break_ind.style.visibility = "hidden";
        }
    } 
});

break_ind.addEventListener("click", function(){
    let i = Math.floor((mousePosition.y-cst_com)/16);
    //index of i in code_lines
    let index = code_lines.indexOf(i);
    break_points[index] = !break_points[index];
    update_line_number();
});

text_area.addEventListener('mouseover', function(e) {
    //Switch mouse_hover_text  to true if we enter the text_area
    mouse_hover_text = true;
    //focus on the text area
    text_area.focus();
});
break_ind.addEventListener('mouseover', function(e) {
    //Switch mouse_hover_text to true if we enter the text_area
    
    mouse_hover_text = true
    });
text_area.addEventListener('mouseout', function(e) {
//Switch mouse_hover_text to true if we enter the text_area
break_ind.style.visibility = "hidden";
    mouse_hover_text = false;
});
break_ind.addEventListener('mouseout', function(e) {
    //Switch mouse_hover_text to true if we enter the text_area
    break_ind.style.visibility = "hidden";
        mouse_hover_text = false;
    });
text_area.addEventListener("scroll", ()=>{ 
    /*Set line number's scroll to the same position as text_area*/
    line_numbers.scrollTop = text_area.scrollTop;
    
    com_ind_0 = cst_com-text_area.scrollTop;
    set_to_line(backup_pos_com_ind);
  });
  
  
/*TODO: Syntax highligthing (not obligatory for publishing)*/
/*TODO: Signal waveform (not obligatory for publishing)*/
/*TODO: Value verification (not obligatory for publishing)*/

function update_registers_display(){
    for(let i = 0; i < 16; i++){
        register_show = document.getElementById("reg"+i);
        register_show.innerHTML = "<div class = reg_num_display>R"+i+ "</div> <div class = reg_value_display>"+register[i].toString(reg_base[i])+"</div>";
    }
    register_show = document.getElementById("N")
    register_show.innerHTML = "<div class = reg_num_display>N </div> <div class = reg_value_display>"+((N=="X")?"X":(+N))+"</div>";
    register_show = document.getElementById("Z")
    register_show.innerHTML = "<div class = reg_num_display>Z </div> <div class = reg_value_display>"+((Z=="X")?"X":(+Z))+"</div>";
    register_show = document.getElementById("C")
    register_show.innerHTML = "<div class = reg_num_display>C </div> <div class = reg_value_display>"+((C=="X")?"X":(+C))+"</div>";
    register_show = document.getElementById("V")
    register_show.innerHTML = "<div class = reg_num_display>V </div> <div class = reg_value_display>"+((V=="X")?"X":(+V))+"</div>";
}

function update_ram_display(){
    ram_css.innerHTML = "";
    if(ram == {}) return;
    for(let i = 0 ; i < Object.keys(ram).length; i++)
        ram_css.innerHTML += "<div class = register_container><div class = register grid-row = "+(i+1)+"><div class = reg_num_display>"+ Object.keys(ram)[i]+"</div><div class = reg_value_display>"+Object.values(ram)[i]+"</div></div>";
}
function update_stack_display(){
    stack_css.innerHTML = "";
    for(let i = 0 ; i < stack.length; i++)
        stack_css.innerHTML += "<div class = register_container><div class = register grid-row = "+(i+1)+"><div class = reg_num_display>"+ (-i)+"</div><div class = reg_value_display>"+((stack[i]=="X")?"X":stack[i])+"</div></div>";
}

function set_to_line(i){
    backup_pos_com_ind = i;
    com_ind.style.top = (com_ind_0+16*i)+"px";
}

function update_line_number(){
    if(is_executing){
        stop()
    }
    line_numbers.innerHTML = ""
    let k = 0;
    for(let i = 0; k < code_lines.length; i++){
        if(code_lines[k] == i && break_points[k] == false){
            line_numbers.innerHTML += k + "<br>";
            k++;
        }else if( code_lines[k] == i && break_points[k] == true){
            line_numbers.innerHTML +=   "<div id=circle></div> <br>";
            k++;
        }
        else
            line_numbers.innerHTML += "<br>";
    }
    for(let i = 0 ; i < text_area.value.split("\n").length - code_lines.length; i++)
        line_numbers.innerHTML += "<br>";	
}

function show_error_message(message, line){
    error_info.style.visibility = "visible";
    error_info.innerHTML = message + " at line " + line;
    //Move the error message to the right position
    error_info.style.top = (cst_com+16*line)+"px";
    block_buttons();
}

function block_buttons(){
    run_button.disabled = true;
    step_button.disabled = true;
    stop_button.disabled = true;
    pause_button.disabled = true;
}

function unblock_buttons(){
    run_button.disabled = false;
    step_button.disabled = false;
    stop_button.disabled = false;
    pause_button.disabled = false;
}


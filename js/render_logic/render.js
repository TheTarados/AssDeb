
let language = new Armv4();

let jest = false;
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
const base_changers = document.getElementsByClassName("base_change");

let backup_pos_com_ind = 0;
let backup_pos_error = 0;
const cst_com = 4;

let com_ind_0 = cst_com;
let pos_error_0 = cst_com;

let line_height = 18;

let is_running = false;
let slider_value = 500;
let run_through_break = true;
let mousePosition = {x:0, y:0};

com_ind.style.top = "0px";
break_ind.style.top = "0px";
error_info.style.top = "0px";

com_ind.style.visibility = "hidden";
break_ind.style.visibility = "hidden";
error_info.style.visibility = "hidden";

step_button.onclick = ()=>{
    let backup = get_executing();
    step(false, language); 
    if(backup)
        advance_timeline(language);
    update_registers_display();
    update_ram_display();
    update_stack_display();
};

run_button.onclick = ()=>run(language);
pause_button.onclick = pause;
stop_button.onclick = stop;

let can_gen_hex = true;

text_area.oninput = ()=>{
    unblock_buttons();
    error_info.style.visibility = "hidden";
    can_gen_hex = true;
    language.setup_code(text_area.value);
    update_line_number();
};

document.getElementById("slider").oninput = log_slider;

function log_slider(input){
    slider_value = 10**((480-this.value)/100);
}


function change_base(i){
    language.get_register_bases()[i]= language.base_looping[language.reg_base[i]];
    base_changers[i].innerHTML = "<div class=base_show id=base_show_"+i+">"+language.get_register_bases()[i]+"</div>"
    update_registers_display();
    document.getElementById("base_show_"+i).onclick = ()=>{change_base(i)};
}

for (let i = 0; i < base_changers.length; i++) {
    base_changers[i].innerHTML = "<div class=base_show id=base_show_"+i+">"+language.get_register_bases()[i]+"</div>"
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

    }
});

line_numbers.addEventListener('click', function(e) {
    let i = Math.floor((e.clientY-com_ind_0)/line_height);
    
    //index of i in code_lines
    let index = language.get_area_line_list().indexOf(i);
    language.invert_break_points(index);
    update_line_number();
});

line_numbers.addEventListener('mousemove', function(e) {
    if(language.get_area_line_list()!=undefined &&language.get_area_line_list().length > 0){
        let i = Math.floor((e.clientY-com_ind_0)/line_height);
        //if code lines contains i
        if(language.get_area_line_list().includes(i)){
            break_ind.style.visibility = "visible";
            break_ind.style.top =  (com_ind_0+line_height*i)+"px"
        }else{
            break_ind.style.visibility = "hidden";
        }
    } 
});

line_numbers.addEventListener('mouseout', function(e) {
    break_ind.style.visibility = "hidden";
});

text_area.addEventListener('mouseover', function(e) {
    //focus on the text area
    text_area.focus();
});

text_area.addEventListener("scroll", ()=>{ 
    /*Set line number's scroll to the same position as text_area*/
    line_numbers.scrollTop = text_area.scrollTop;
    
    com_ind_0 = cst_com-text_area.scrollTop;
    set_to_line(backup_pos_com_ind);
    move_error_message(backup_pos_error)
  });
  
  
/*TODO: Syntax highligthing (not obligatory for publishing)*/
/*TODO: Signal waveform (not obligatory for publishing)*/
/*TODO: Value verification (not obligatory for publishing)*/

function update_registers_display(){
    for(let i = 0; i < language.get_register_count(); i++){
        let register_show = document.getElementById("reg"+i);
        let val = language.get_register_values()[i];
        val = (val=="X")?"X":+val;
        val = int_to_string_base(val,language.get_register_bases()[i]);
        register_show.innerHTML = "<div class = reg_num_display>"+language.get_register_names()[i]+ "</div> <div class = reg_value_display>"+val+"</div>";
    }
}

function update_ram_display(){
    ram_css.innerHTML = "";
    if(language.ram == {}) return;
    for(let i = 0 ; i < Object.keys(language.get_ram()).length; i++)
        ram_css.innerHTML += "<div class = register_container><div class = register grid-row = "+(i+1)+"><div class = reg_num_display>"+ Object.keys(language.get_ram())[i]+"</div><div class = reg_value_display>"+Object.values(language.get_ram())[i]+"</div></div>";
}
function update_stack_display(){
    stack_css.innerHTML = "";
    for(let i = 0 ; i < language.get_stack().length; i++)
        stack_css.innerHTML += "<div class = register_container><div class = register grid-row = "+(i+1)+"><div class = reg_num_display>"+ (-i)+"</div><div class = reg_value_display>"+((language.get_stack()[i]=="X")?"X":language.get_stack()[i])+"</div></div>";
}

function set_to_line(i){
    backup_pos_com_ind = i;
    com_ind.style.top = (com_ind_0+line_height*i)+"px";
}

function update_line_number(){
    if(get_executing()){
        stop();
    }
    line_numbers.innerHTML = ""
    let k = 0;
    for(let i = 0; k < language.get_area_line_list().length; i++){
        if(language.get_area_line_list()[k] == i && language.get_break_points(k) == false){
            line_numbers.innerHTML += k + "<br>";
            k++;
        }else if( language.get_area_line_list()[k] == i && language.get_break_points(k) == true){
            line_numbers.innerHTML +=   "<div id=circle_container><div id=circle></div></div> <br>";
            k++;
        }
        else
            line_numbers.innerHTML += "<br>";
    }
    for(let i = 0 ; i < text_area.value.split("\n").length - language.get_area_line_list().length; i++)
        line_numbers.innerHTML += "<br>";	
}

function show_error_message(message, line){
    error_info.style.visibility = "visible";
    error_info.innerHTML = message;
    //Move the error message to the right position
    backup_pos_error = line;
    error_info.style.top = (com_ind_0+line_height*line)+"px";
    can_gen_hex = false;
    block_buttons();
}

function move_error_message(line){
    backup_pos_error = line;
    error_info.style.top = (com_ind_0+line_height*line)+"px";
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






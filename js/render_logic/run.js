function step(run_by_loop ){
    if(run_by_loop != true){run_by_loop = false;}
    if(is_executing == false && (!run_by_loop)){
        is_executing = true;
        init_timeline();
        com_ind.style.visibility = "visible";
        set_to_line(code_lines[0]);
    }
    else{
        execute_line();
        set_to_line(code_lines[register[15]/4]);
    }
}

async function run(){
    is_running = true;
    if(is_executing == false){
        is_executing = true;
        init_timeline();
        com_ind.style.visibility = "visible";
        set_to_line(code_lines[0]);
    }
    loop_run()
}

async function loop_run(){
    while(is_executing && is_running && (!break_points[register[15]/4]||run_through_break)){
        await sleep(slider_value);
        step(true)
        advance_timeline();
        update_registers_display();
        update_ram_display();
        update_stack_display();
        run_through_break = false;
    }
    if(break_points[register[15]/4]){
        run_through_break = true;
    }
    if(!is_executing){
        stop();
    }
}

function run_until(limit){
    reset_state();
    while(is_executing && (!break_points[register[15]/4]||run_through_break) && limit > 0){
        step(true)
        run_through_break = false;
        limit--;
    }
    set_to_line(code_lines[register[15]/4]);
    update_registers_display();
    update_ram_display();
    update_stack_display();
    if(break_points[register[15]/4]){
        run_through_break = true;
    }
    if(!is_executing){
        stop();
    }
}

function stop(){
    is_executing = false;
    is_running = false;
    com_ind.style.visibility = "hidden";
    reset_state();
    reset_timeline();
    update_registers_display();
    update_ram_display();
    update_stack_display();
}
function pause(){
    is_running = false;
}

function execute_line(){
    //Get register[15]'s line of the text_area
    let elements = code[register[15]/4];
    
    let new_elements = [];
    for(let i = 0; i < elements.length; i++){
        //if elements[i] contains a @
        if(elements[i].includes("@")){
            //Find where is the @
            let at_index = elements[i].indexOf("@");
            //push all until the @
            new_elements.push(elements[i].substring(0, at_index));
            break;
        }else{
            new_elements.push(elements[i]);
        }
    }
    elements = new_elements;
    elements = elements.filter((line)=>{return line.length > 0 && line[0] != '\t'});
    backup_15 = register[15];
    backup_13 = register[13];
    for (let i = 0; i < operators.length; i++)
        if(elements[0].substring(0, operators[i].n_char) == operators[i].name){
            operators[i].execute_line(elements);
            break;
        }
    if(backup_15 == register[15] && !did_a_jmp)
        register[15]+=4;
    did_a_jmp = false;

    if(backup_13 != register[13]){
        if(backup_13>register[13]){
            stack = stack.concat(Array((backup_13-register[13])/4).fill("X"));
        }else{
            stack = stack.slice(0, register[13]);
        }
    }
}
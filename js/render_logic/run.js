language = new Armv4();

function step(run_by_loop ){
    
    if(run_by_loop != true){run_by_loop = false;} //Make sure we have a boolean here
    if(is_executing == false && (!run_by_loop)){  //Check if we start the execution
                                                    //!run_by_loop to avoid relanching the execution at the end of loop due to parrallelism
        is_executing = true;
        init_timeline();
        com_ind.style.visibility = "visible";
        set_to_line(code_lines[0]);
    }
    else{
        execute_line();
        set_to_line(code_lines[language.get_current_line()]);
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
    while(is_executing && is_running && (!break_points[language.get_current_line()]||run_through_break)){
        await sleep(slider_value);
        step(true)
        advance_timeline();
        update_registers_display();
        update_ram_display();
        update_stack_display();
        run_through_break = false;
    }
    if(break_points[language.get_current_line()]){
        run_through_break = true;
    }
    if(!is_executing){
        stop();
    }
}

function run_until(limit){
    language.reset_state();
    while(is_executing && (!break_points[language.get_current_line()]||run_through_break) && limit > 0){
        step(true)
        run_through_break = false;
        limit--;
    }
    set_to_line(code_lines[language.get_current_line()]);
    check_and_fix_timeline();
    update_registers_display();
    update_ram_display();
    update_stack_display();
    if(break_points[language.get_current_line()]){
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
    language.reset_state();
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
    let elements = code[language.get_current_line()];
    
    elements = elements.filter((line)=>{return line.length > 0 && line[0] != '\t'});
    language.before_execute_line();
    for (let i = 0; i < language.get_operators().length; i++)
        if(elements[0].substring(0, language.get_operators()[i].n_char) == language.get_operators()[i].name){
            nzcv = language.get_operators()[i].execute_line(elements, language.get_register_values().slice(16, 20));
            for(let j = 0; j < 4; j++){
                language.register[16+j] = nzcv[j];
            }
            break;
        }
    language.after_execute_line();
}
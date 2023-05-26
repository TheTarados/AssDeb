var {init_timeline, reset_timeline, advance_timeline, check_and_fix_timeline, timeline_index, computing_timeline} = require("./timeline.js");

let is_executing = false;

function step(run_by_loop, language ){
    
    if(run_by_loop != true){run_by_loop = false;} //Make sure we have a boolean here
    if(is_executing == false && (!run_by_loop)){  //Check if we start the execution
                                                    //!run_by_loop to avoid relanching the execution at the end of loop due to parrallelism
        is_executing = true;
        init_timeline(language);
        
        if(!jest)com_ind.style.visibility = "visible";
        if(!jest)set_to_line(language.get_area_line_list()[0]);
        
    }
    else{
        execute_line(language);
        if(!jest)set_to_line(language.get_current_area_line());
    }
}

async function run(language){
    is_running = true;
    if(is_executing == false){
        is_executing = true;
        if(!jest)init_timeline(language);
        if(!jest)com_ind.style.visibility = "visible";
        if(!jest)set_to_line(language.get_area_line_list()[0]);
    }
    loop_run(language)
}

async function loop_run(language){
    while(is_executing 
        && is_running 
        && (!language.get_break_points(language.get_current_line())||run_through_break)
        && language.get_current_line() < language.get_current_code_length()){
        if(!jest)await sleep(slider_value);
        step(true, language)
        if(!jest)advance_timeline(language);
        if(!jest)update_registers_display();
        if(!jest)update_ram_display();
        if(!jest)update_stack_display();
        run_through_break = false;
    }
    if(language.get_break_points(language.get_current_line())){
        run_through_break = true;
    }
    if(!is_executing){
        stop();
    }
}

function run_until(limit, language){
    language.reset_state();
    while(is_executing && (!language.get_break_points(language.get_current_line())||run_through_break) && limit > 0){
        step(true, language)
        run_through_break = false;
        limit--;
    }
    set_to_line(language.get_current_area_line());
    check_and_fix_timeline(language);
    update_registers_display();
    update_ram_display();
    update_stack_display();
    if(language.get_break_points(language.get_current_line())){
        run_through_break = true;
    }
    if(!is_executing){
        stop();
    }
}

function stop(){
    is_executing = false;
    is_running = false;
    if(!jest)com_ind.style.visibility = "hidden";
    language.reset_state();
    reset_timeline();
    update_registers_display();
    update_ram_display();
    update_stack_display();
}
function pause(){
    is_running = false;
}

function execute_line(language){
    //Get register[15]'s line of the text_area
    let elements = language.get_current_code_line();
    
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
function get_executing(){
    return is_executing;
}
module.exports = { step, run, run_until, stop, pause, execute_line , get_executing};
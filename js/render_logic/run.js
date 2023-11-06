var {init_timeline, reset_timeline, advance_timeline, check_and_fix_timeline} = require("./timeline.js");

let is_executing = false;

function set_input(language){
    let current_input = get_input();
    for(var i = 0; i < current_input.length; i++)
        language.get_register_values()[i] = current_input[i];

}

function step(run_by_loop, language ){
    if(!jest){
        cycle_counter +=1 ;
        individual_cycle_counter += 1;
        win_screen.style.visibility = "hidden";
    }
        if(run_by_loop != true){run_by_loop = false;} //Make sure we have a boolean here
    if(is_executing == false && (!run_by_loop)){  //Check if we start the execution
                                                    //!run_by_loop to avoid relanching the execution at the end of loop due to parrallelism
        is_executing = true;
        language.reset_state();
        init_timeline(language);
        
        if(!jest){
            com_ind.style.visibility = "visible";
            set_to_line(language.get_area_line_list()[0]);
            set_input(language);
        }
    }
    else{
        execute_line(language);
        if(!jest)set_to_line(language.get_current_area_line());
    }
    if( !jest && language.get_current_line() == 0xdeadbeef/4){
        treat_output(language.get_register_values()[0]);
    }
}


async function run(language){
    if(!jest)cycle_counter +=1 ;
    is_running = true;
    if(is_executing == false){
        is_executing = true;
        if(!jest){
            init_timeline(language);
            com_ind.style.visibility = "visible";
            set_to_line(language.get_area_line_list()[0]);
            let current_input = get_input();
            for(var i = 0; i < current_input.length; i++)
                language.get_register_values()[i] = current_input[i];
        }
    }
    loop_run(language)
}

async function loop_run(language){
    let acc = 1;
    while(is_executing 
        && is_running 
        && (!language.get_break_points(language.get_current_line())||run_through_break)
        && language.get_current_line() < language.get_current_code_length()
        && language.get_current_line() != 0xdeadbeef/4){
        if(!jest)await sleep(slider_value*acc);
        step(true, language)
        if(!jest){
            advance_timeline(language);
            update_registers_display();
            update_ram_display();
            update_stack_display();
        }
        run_through_break = false;
        
        acc *= 0.99;//We speed up if we've been computing for a while
        
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
    set_input(language);
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
    if(!jest){
        com_ind.style.visibility = "hidden";
        if(states.length > 0){
            states = [];
            render_inout();
        }
    }
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
    
    try{
        elements = elements.filter((line)=>{return line.length > 0 && line[0] != '\t'});
    }catch(ex){
        dialog.showErrorBox("Can't execute line", "There is a problem with the line you're trying to run. It is most likely the end of the code and there is nothing to run."+ (is_in_chall? "Don't forget to return your answer to the challenge using MOV PC, LR":""));
        throw "Can't execute line";
    }
    
    language.before_execute_line();

    let op = language.get_operator(elements[0])
    
    nzcv = op.execute_line(elements, language.get_register_values().slice(16, 20));
    
    for(let j = 0; j < 4; j++){
        language.register[16+j] = nzcv[j];
    }
    
    language.after_execute_line();
}
function get_executing(){
    return is_executing;
}
module.exports = { step, run, run_until, stop, pause, execute_line , get_executing, set_input};
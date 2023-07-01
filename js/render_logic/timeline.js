let computed_timeline = 0;
let timeline_index = 0;
let computing_timeline = false;

function init_timeline(language){
    if(jest) return;
    let init_backup_state = language.get_state();
    computed_timeline = 0;
    timeline_index = 0;
    timeline_css.innerHTML = "";
    timeline_css.style.left = "calc(50% - 75px)";//"calc(50% - 75px - "-50*i+"px)" to put ith one in the middle
    timeline_css.style.gridTemplateColumns = "repeat(25, 50px)";
    computing_timeline = true;
    for(computed_timeline = 0; computed_timeline <  25; computed_timeline++){
        if(language.get_current_line() >= language.get_current_code_length()){
            break;
        }
        let line_to_show = language.get_current_code_line().join(" ")
        //Remove spaces before ,
        line_to_show = line_to_show.replace(/ ,/g, ",");
        timeline_css.innerHTML += "<div class=timeline_element id = tim_elem_"+computed_timeline+" >"+line_to_show+"</div>";
        
        execute_line(language);
    }
    computing_timeline = false;
    for(let i = 0; i < computed_timeline; i++){
        let id = "tim_elem_"+i;
        let tim_elem = document.getElementById(id);
        //On click log Hi
        tim_elem.onclick = function() { animate_timeline(i);timeline_index= i;run_until(i, language);    };
    }
    language.restore_state(init_backup_state);
}

function reset_timeline(){
    timeline_css.innerHTML = "";
    timeline_index=0;
    computed_timeline = 0;
}

function animate_timeline(go_to){
    let delta = (go_to-timeline_index)*25
    //get sign of delta
    let sign = delta/Math.abs(delta);
    
    let timer = setInterval(function(){
        timeline_css.style.left = "calc(50% - 75px - "+(50*go_to-2*delta)+"px)";
        if(delta == 0){
            clearInterval(timer);
        }
        delta -= sign;
    }, 1);
}

function advance_timeline(language){
    timeline_index++;
    let delta = 50;
    //timeline_css.style.left = "calc(50% - 75px - "+(50*timeline_index)+"px)";
    let timer = setInterval(function(){
        timeline_css.style.left = "calc(50% - 75px - "+(50*timeline_index-delta)+"px)";
        if(0 == delta){
            clearInterval(timer);
        }
        delta --;
    }, slider_value/100);
    check_and_fix_timeline(language)
}

function check_and_fix_timeline(language){
    computing_timeline = true;
    if(computed_timeline< timeline_index+13){
        let backup_state = language.get_state();
        let backup = computed_timeline;
        for(let i = 0; i < computed_timeline-timeline_index; i++) //Go to the end of the timeline
            execute_line(language);
        
        for(let i = 0; (i < backup) && language.get_current_line() < language.get_current_code_length(); i++){ 
                        //<backup because we want to double the size of the timeline
         
            let line_to_show = language.get_current_code_line().join(" ");
            //Remove spaces before ,
            line_to_show = line_to_show.replace(/ ,/g, ",");
            timeline_css.innerHTML += "<div class=timeline_element id = tim_elem_"+computed_timeline+" >"+line_to_show+"</div>";
            execute_line(language);
            computed_timeline++;
        }
        for(let i = 0; i < computed_timeline; i++){
            let id = "tim_elem_"+i;
            let tim_elem = document.getElementById(id);
            tim_elem.onclick = function() { animate_timeline(i);timeline_index= i;run_until(i, language);};
        }
        timeline_css.style.gridTemplateColumns = "repeat("+computed_timeline+", 50px)";
        language.restore_state(backup_state);
    }
    computing_timeline = false;
}
module.exports = {init_timeline, reset_timeline, advance_timeline, check_and_fix_timeline, timeline_index, computing_timeline};
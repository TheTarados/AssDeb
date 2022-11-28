let computed_timeline = 0;
let timeline_index = 0;

function init_timeline(){
    computed_timeline = 0;
    timeline_index = 0;
    timeline_css.innerHTML = "";
    timeline_css.style.left = "calc(50% - 75px)";//"calc(50% - 75px - "-50*i+"px)" to put ith one in the middle
    timeline_css.style.gridTemplateColumns = "repeat(25, 50px)";

    for(computed_timeline = 0; computed_timeline < 25; computed_timeline++){
        if(register[15]/4 >= code.length){
            break;
        }
        let line_to_show = code[ register[15]/4].join(" ")
        //Remove spaces before ,
        line_to_show = line_to_show.replace(/ ,/g, ",");
        timeline_css.innerHTML += "<div class=timeline_element id = tim_elem_"+computed_timeline+" >"+line_to_show+"</div>";
        
        execute_line();
    }
    for(let i = 0; i < computed_timeline; i++){
        let id = "tim_elem_"+i;
        let tim_elem = document.getElementById(id);
        //On click log Hi
        tim_elem.onclick = function() { animate_timeline(i);run_until(i); timeline_index= i;   };
    }
    reset_state();
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

function advance_timeline(){
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

    
    if(computed_timeline< timeline_index+13){
        reset_state();
        let backup = computed_timeline;
        for(let i = 0; i < computed_timeline; i++){
            execute_line();
        }
        for(let i = 0; i < backup; i++){
            if(register[15]/4 >= code.length){
                break;
            }
            let line_to_show = code[ register[15]/4].join(" ")
            //Remove spaces before ,
            line_to_show = line_to_show.replace(/ ,/g, ",");
            timeline_css.innerHTML += "<div class=timeline_element id = tim_elem_"+computed_timeline+" >"+line_to_show+"</div>";
            execute_line();
            computed_timeline++;
        }
        for(let i = 0; i < computed_timeline; i++){
            let id = "tim_elem_"+i;
            let tim_elem = document.getElementById(id);
            //On click log Hi
            tim_elem.onclick = function() { animate_timeline(i);run_until(i); timeline_index= i;   };
        }
        timeline_css.style.gridTemplateColumns = "repeat("+computed_timeline+", 50px)";
        reset_state();
        for(let i = 0; i < timeline_index; i++){
            execute_line();
        }
    }
}

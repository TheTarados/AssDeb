const step_button = document.getElementById("step");
const run_button = document.getElementById("run");
const pause_button = document.getElementById("pause");
const stop_button = document.getElementById("stop");
const com_ind = document.getElementById("com_ind");
const text_area = document.getElementById("text_zone");
const line_numbers = document.getElementById("line_number");
let cst_com = 3;
com_ind.style.top = cst_com+"px";
com_ind.style.visibility = "hidden";
step_button.onclick = step;
run_button.onclick = run;
pause_button.onclick = pause;
stop_button.onclick = stop;
text_area.oninput = update_line_number;
let n_lines = 0;
let code; 
let code_lines;
let is_executing = false;
let is_running = false;
//register is a list of 16 ints
let slider_value = 500;
function log_slider(input){
    slider_value = 10**(this.value/100);
}
document.getElementById("slider").oninput = log_slider;
let register = ["X","X","X","X","X","X","X","X","X","X","X","X","X",0x7efff1a8,"X",0]; //"X" implies it is not filled yet
let N = "X";
let Z = "X";
let C = "X";
let V = "X";
let reg_base = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 16, 10, 4];

let base_changers = document.getElementsByClassName("base_change")
base_looping = {10: 16, 16 : 2, 2: 4, 4: 10};

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
/*TODO: and and or don't update C V, find out what updates them, only sub et add?: FlagW1 for updating N and Z (Flags3:2),
and FlagW0 for updating C and V (Flags1:0).*/
//TODO: test LOOP: B LOOP
/*
main:   SUB R0, R15, R15     @ R0 = 0
        ADD R2, R0, #5      @ R2 = 5
        ADD R3, R0, #12        @ R3 = 12
        SUB R7, R3, #9        @ R7 = 3
        ORR R4, R7, R2        @ R4 = 3 OR 5 = 7
        AND R5, R3, R4        @ R5 = 12 AND 7 = 4
        ADD R5, R5, R4        @ R5 = 4 + 7 = 11
        SUBS R8, R5, R7        @ R8 <= 11 - 3 = 8, set Flags
        BEQ END                @ shouldn't be taken
        SUBS R8, R3, R4        @ R8 = 12 - 7  = 5
        BGE AROUND           @ should be taken
        ADD R5, R0, #0         @ should be skipped
AROUND: SUBS R8, R7, R2       @ R8 = 3 - 5 = -2, set Flags
        ADDLT R7, R5, #1      @ R7 = 11 + 1 = 12
        SUB R7, R7, R2        @ R7 = 12 - 5 = 7
        STR R7, [R3, #188]  @ mem[12+188] = 7
        LDR R2, [R0, #200]  @ R2 = mem[200] = 7
        ADD R15, R15, R0    @ PC <- PC + 8 (skips next)
        ADD R2, R0, #14        @ shouldn't happen
        B END                 @ always taken
        ADD R2, R0, #13       @ shouldn't happen
        ADD R2, R0, #10        @ shouldn't happen
END:    STR R2, [R0, #220]     @ mem[220] = 7
LOOP:   B   LOOP            @ infinite loop
PROUT: MOV R2, R0, #129 @ shoulld not be taken but is
*/ 
ram = {}
jmp_addr = {}

class Operator{
    constructor(name){
        this.name = name;
        this.n_char = name.length;
        this.execute_line;
    }
}

class Data_proc_operator extends Operator{
    constructor(name, f){
        super(name)
        this.f = f;
        this.execute_line = (elements)=>{
            //check if commend of the form XXXS
            let s = elements[0][3]== "S";
            if(elements[0].length<5 || check_conditional(elements[0].substring( 3+s, s+5))){
                let source = elements.length == 4;
                if(s){
                    C = 0;
                    V = 0;
                }
                register[[parseInt(elements[1].substring(1))]] = f(get_register_value(elements[1+source]), immediate_solver(elements[2+source]), s);
                
                if(s){
                    N = (get_register_value(elements[1]) >> 31)&1;
                    Z = get_register_value(elements[1]) == 0;
                }
            }
        };
    }
}
class Mul_operator extends Operator{
    constructor(name, f, g){
        super(name)
        this.f = f;
        this.g = g;
        this.execute_line = (elements)=>{
            //check if commend of the form XXXS
            let s = elements[0][3]== "S";
            if(!(elements[0].length<6 || check_conditional(elements[0].substring( 3+s, s+5)))) return;
     
            if(s){
                C = 0;
                V = 0;
            }
            let low_bits = f(get_register_value(elements[1]), 
            immediate_solver(elements[2]), 
            immediate_solver(elements[3]),
            immediate_solver(elements[4]), s);
            let high_bits = g(get_register_value(elements[1]), 
            immediate_solver(elements[2]), 
            immediate_solver(elements[3]),
            immediate_solver(elements[4]), s);
            register[[parseInt(elements[1].substring(1))]] = low_bits;
            register[[parseInt(elements[2].substring(1))]] = high_bits;
            
            if(!s) return;
            N = (get_register_value(elements[1]) >> 31)&1;
            Z = get_register_value(elements[1]) == 0;
                
            
        };
    }
}
class Comp_operator extends Operator{
    constructor(name, f){
        super(name)
        this.f = f;
        this.execute_line = (elements)=>{
            //check if commend of the form XXXS
            if(!(elements[0].length<4 || check_conditional(elements[0].substring( 3, 5)))) return;
            C = 0;
            V = 0;
            let value = f(get_register_value(elements[1]), immediate_solver(elements[2]));
            
            N = (value >> 31)&1;
            Z = value == 0;
        };
    }
}

let mov_operator = new Data_proc_operator("MOV", (a,b,s)=>{ return b; });

let add_operator = new Data_proc_operator("ADD", (a,b,s)=>{
    let sum = a+b;
    if(!s) return sum;

    let a_31 = (a >> 31) & 1;
    let b_31 = (b >> 31) & 1;
    let res_32 = a_31 && b_31;
    
    V = !(a_31^b_31) && (a_31^res_32);
    C = res_32;
    
    return sum; 
});

let adc_operator = new Data_proc_operator("ADC", (a,b,s)=>{
    let sum = a+b+1;
    if(!s) return sum;
    let a_31 = (a >> 31) & 1;
    let b_31 = (b >> 31) & 1;
    let res_32 = a+b+1>0xFFFFFFFF;
    
    V = !(a_31^b_31) && (a_31^res_32);
    C = res_32;
    
    return sum; 
});

let sub_operator = new Data_proc_operator("SUB", (a,b,s)=>{ 
    let not_b = ~b;
    let sum = a + not_b + 1;
    if(!s) return sum;
        
    let a_31 = (a >> 31) & 1;
    let b_31 = (b >> 31) & 1;
    let res_32 = a+(not_b>>>1)*2+(not_b&1)+1>0xFFFFFFFF;
    
    V = (a_31^b_31) & (a_31^res_32);
    C = res_32;
    
    return sum; 
});

let rsub_operator = new Data_proc_operator("RSB", (a,b,s)=>{ sub_operator.f(b,a,s)});

let sbc_operator = new Data_proc_operator("SBC", (a,b,s)=>{
    let not_b = ~b;
    let sum = a + not_b + 1;
    if(!s)return sum; 
        
    let a_31 = (a >> 31) & 1;
    let b_31 = (b >> 31) & 1;
    let res_32 = a+get_unsigned_value(not_b)+1>0xFFFFFFFF;
    
    V = (a_31^b_31) & (a_31^res_32);
    C = res_32;
    
    return sum; 
});
let rsc_operator = new Data_proc_operator("RSC", (a,b,s)=>{ sbc_operator.f(b,a,s)});

let mul_operator = new Data_proc_operator("MUL", (a,b,s)=>{return  (a*b)&0xFFFFFFFF;});

//mla
let mla_operator = new Mul_operator("MLA", (a,b,c,d,s)=>{ return (b*c+d)&0xFFFFFFFF; }, (a,b,c,d,s)=>{ return d; });

function get_unsigned_value(x){
    return (x>>>1)*2+(x&1)
}

//smull
let smull_operator = new Mul_operator("SMULL", (a,b,c, d,s)=>{ return ((c*d)/0xFFFFFFFF)&0xFFFFFFFF; },
                                             (a,b,c, d,s)=>{ return (c*d)&0xFFFFFFFF; });
//smlal
let smlal_operator=  new Mul_operator("SMLAL", (a,b,c, d,s)=>{ return (((c*d+a)/0xFFFFFFFF)+b)&0xFFFFFFFF; },
                                                    (a,b,c, d,s)=>{ return (c*d+a)&0xFFFFFFFF; });

//umull
let umull_operator = new Mul_operator("UMULL", (a,b,c,d,s)=>smull_operator.f( a, get_unsigned_value(b), get_unsigned_value(c), d, s),
                                             (a,b,c,d ,s)=>smull_operator.g( a, get_unsigned_value(b), get_unsigned_value(c), d, s));

// umlal 
let umlal_operator =  new Mul_operator("UMLAL", (a,b,c,d,s)=>smlal_operator.f( a, get_unsigned_value(b), get_unsigned_value(c), d, s),
                                                (a,b,c, d,s)=>smlal_operator.g( a, get_unsigned_value(b), get_unsigned_value(c), d, s));



let and_operator = new Data_proc_operator("AND", (a,b,s)=>{ return a&b; });

let or_operator = new Data_proc_operator("ORR", (a,b,s)=>{ return a|b; });

let xor_operator = new Data_proc_operator("EOR", (a,b,s)=>{ return a^b; });

//lsl
let lsl_operator = new Data_proc_operator("LSL", (a,b,s)=>{ return a<<b; });
//lsr
let lsr_operator = new Data_proc_operator("LSR", (a,b,s)=>{ return a>>>b; });
//asr
let asr_operator = new Data_proc_operator("ASR", (a,b,s)=>{ return a>>b; });
//ror
let ror_operator = new Data_proc_operator("ROR", (a,b,s)=>{ return (a>>>b) | (a<<(32-b)); });
//rrx
let rrx_operator = new Data_proc_operator("RRX", (a,b,s)=>{ 
    if(s){C = a&1;}
    return (a>>>1) | (a<<31); 
});
//bic
let bic_operator = new Data_proc_operator("BIC", (a,b,s)=>{return a&(~b); });
//mvn
let mvn_operator = new Data_proc_operator("MVN", (a,b,s)=>{ return ~b; });


//jump operator
let b_operator = new Operator("B");
b_operator.execute_line = (elements)=>{
    if(!(elements[0].length<3 ||check_conditional(elements[0].substring( 1, 3)))) return;
    
    if(elements[1] in jmp_addr){
        register[15]=  jmp_addr[elements[1]];
    }else{
        register[15] = immediate_solver(elements);
    }
    
}

//str
let str_operator = new Operator("STR");
str_operator.execute_line = (elements)=>{
    if(elements[0].length<5 || check_conditional(elements[0].substring( 3, 5))) 
        ram[Math.floor(address_solver(elements)/4)] = get_register_value(elements[1]);
    
};

//strb
let strb_operator = new Operator("STRB");
strb_operator.execute_line = (elements)=>{
    if(!(elements[0].length<5 || check_conditional(elements[0].substring( 4, 6)))) return;
    let addr= address_solver(elements);
    //put get_register_value(elements[1])>>(8*(addr%4)) fist byte in byte addr%4 of ram[addr/4]
    let byte = (get_register_value(elements[1])>>(8*(addr%4)))&0xFF
    ram[Math.floor(addr/4)] = (ram[Math.floor(addr/4)] & ~(0xFF << (8*(addr%4)))) | (byte << (8*(addr%4)));
}

//ldr
let ldr_operator = new Operator("LDR");
ldr_operator.execute_line = (elements)=>{
    if(elements[0].length<5 || check_conditional(elements[0].substring( 3, 5)))
        register[[parseInt(elements[1].substring(1))]] = ram[Math.floor(address_solver(elements)/4)];
};

//ldrb
let ldrb_operator = new Operator("LDRB");
ldrb_operator.execute_line = (elements)=>{
    if(elements[0].length<5 || check_conditional(elements[0].substring( 4, 6))){
        let addr= address_solver(elements);
        register[[parseInt(elements[1].substring(1))]] = (ram[Math.floor(addr/4)]>>(8*(addr%4)))&0xFF;
    }
}

//tst
let tst_operator = new Comp_operator("TST", (a,b)=>{ return a&b; });
//teq 
let teq_operator = new Comp_operator("TEQ", (a,b)=>{ return a^b; });
//cmp
let cmp_operator = new Comp_operator("CMP", (a,b)=>{ return sub_operator.f(a,b,1); });
//cmn
let cmn_operator = new Comp_operator("CMN", (a,b)=>{ return add_operator.f(a,b,1); });


let operators = [mov_operator,
                add_operator, 
                adc_operator,
                sub_operator, 
                rsub_operator, 
                mul_operator, 
                and_operator,
                or_operator, 
                xor_operator, 
                bic_operator,
                b_operator, 
                strb_operator, 
                ldrb_operator,
                str_operator,
                ldr_operator,
                lsl_operator,
                lsr_operator,
                asr_operator,
                ror_operator,
                rrx_operator,
                mvn_operator,
                tst_operator,
                teq_operator,
                cmp_operator,
                cmn_operator,
                smull_operator,
                smlal_operator,
                umull_operator,
                umlal_operator,
                rsc_operator,
                mla_operator];


class Condition{
    constructor(name, f){
        this.name = name;
        this.f = f;
    }
}
conds =[ new Condition ("EQ", (N,Z,C,V)=>{return Z;}),
new Condition ("NE", (N,Z,C,V)=>{return !Z;}),
new Condition ("CS", (N,Z,C,V)=>{return C;}),
new Condition ("CC", (N,Z,C,V)=>{return !C;}),
new Condition ("HS", (N,Z,C,V)=>{return C;}),
new Condition ("LO", (N,Z,C,V)=>{return !C;}),
new Condition ("MI", (N,Z,C,V)=>{return N;}),
new Condition ("PL", (N,Z,C,V)=>{return !N;}),
new Condition ("VS", (N,Z,C,V)=>{return V;}),
new Condition ("VC", (N,Z,C,V)=>{return !V;}),
new Condition ("HI", (N,Z,C,V)=>{return C && !Z;}),
new Condition ("LS", (N,Z,C,V)=>{return !C || Z;}),
new Condition ("GE", (N,Z,C,V)=>{return N == V;}),
new Condition ("LT", (N,Z,C,V)=>{return N != V;}),
new Condition ("GT", (N,Z,C,V)=>{return !Z && (N == V);}),
new Condition ("LE", (N,Z,C,V)=>{return Z || (N != V);}),
new Condition ("AL", (N,Z,C,V)=>{return true;})
]

function get_register_value(element){
    let reg_val = parseInt(element.substring(1), 10);
    return register[reg_val]+(reg_val==15)*8;
}

function check_conditional(tag){
    for(let i = 0; i < conds.length; i++){
        if(tag == conds[i].name)
            return conds[i].f(N,Z,C,V);
    }
}

function immediate_solver(element){
    if(element[0] == "#")
        if( element[1] == "0" && element[2] == "X"){
            return parseInt(element.substring(3), 16);
        } else if( element[1] == "0" && element[2] == "B"){
            return parseInt(element.substring(3), 2);
        } else {
            return parseInt(element.substring(1), 10);
        }
    else
        return get_register_value(element);
}

function address_solver(elements){
    let is_third = elements[2] == "[";
    let no_offset = (elements[2+is_third][elements[2+is_third].length-1] == "]") || //case [rX]
                    (elements[3+is_third] == "]"); // case [rX ]
    

    
    if(!is_third) base_string = elements[2].substring(1);//case [rX
    else base_string = elements[2+is_third];//case [ rX
    base = register[parseInt(base_string.substring(1), 10)];
    if(no_offset) return base;

    if(elements[3+is_third][elements[3+is_third].length-1] == "]") offset_string = elements[3+is_third].substring(0, elements[3+is_third].length-1)//case rX]
    else offset_string = elements[3+is_third];  //case rX ]
    
    offset = immediate_solver(offset_string);
    

    return base + offset;
}

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

//Last register is number line
function setup_code(){
    code = text_area.value
    code = code.toUpperCase().replace(/,/g, " ").split("\n");

    code = code.map((line)=>{return line.replace(/\s+/g, ' ').trim()});

    code_lines = Array(code.length).fill().map((x,i)=>i)
    code_lines = code_lines.filter((i)=>{return code[i].length > 0 && code[i][0] != "@" && code[i] != " "});
    
    code = code.filter((line)=>{return line.length > 0 && line[0] != "@" && line != " "});
 
    code = code.map((line)=>{return line.split(" ")});

    for(let i = 0; i < code.length; i++){
        if(!operators.some((op)=> {return op.name == code[i][0].substring(0, op.n_char)})){
            jmp_addr[code[i][0].replace(/:/g, " ").trim()] = i*4;
            code[i].splice(0,1);
            if(code[i].length == 0){
                code.splice(i,1);
                code_lines.splice(i,1);
                i--;
            }
        }
    }
}

function step(run_by_loop ){
    if(run_by_loop != true){run_by_loop = false;}
    if(is_executing == false && (!run_by_loop)){
        is_executing = true;
        setup_code();
        
        com_ind.style.visibility = "visible";
        set_to_line(code_lines[0]);
    }
    else{
        execute_line();
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function run(){
    is_running = true;
    if(is_executing == false){
        is_executing = true;
        setup_code();
        
        com_ind.style.visibility = "visible";
        set_to_line(code_lines[0]);
    }

    loop_run()
    
    
}
async function loop_run(){
    while(is_executing && is_running){
        await sleep(slider_value);
        step(true)
    }
    if(!is_executing){
        stop();
    }
}
function stop(){
    is_executing = false;
    is_running = false;
    com_ind.style.visibility = "hidden";
    register = ["X","X","X","X","X","X","X","X","X","X","X","X","X","X","X",0];
    update_registers_display();
}
function pause(){
    is_running = false;
}
function execute_line(){
    //Get register[15]'s line of the text_area
    let elements = code[register[15]/4];
    
    new_elements = []
    for(let i = 0; i < elements.length; i++){
        //if elements[i] contains a @
        if(elements[i].includes("@")){
            //Find where is the @
            let at_index = elements[i].indexOf("@");
            //push all untile the @
            new_elements.push(elements[i].substring(0, at_index));
            break;
        }else{
            new_elements.push(elements[i]);
        }
    }
    elements = new_elements;
    elements = elements.filter((line)=>{return line.length > 0 && line[0] != '\t'});
    backup = register[15];
    for (let i = 0; i < operators.length; i++)
        if(elements[0].substring(0, operators[i].n_char) == operators[i].name){
            operators[i].execute_line(elements);
            break;
        }
    if(backup == register[15])
        register[15]+=4;
    set_to_line(code_lines[register[15]/4]);
    update_registers_display();
}

function set_to_line(i){
    com_ind.style.top = (cst_com+14*i)+"px";
}
function update_line_number(){
    if(is_executing){
        stop()
    }
    setup_code();
    line_numbers.innerHTML = ""
    let k = 0;
    for(let i = 0; k < code_lines.length; i++){
        if(code_lines[k] == i){
            line_numbers.innerHTML += k + "<br>";
            k++;
        }
        else
            line_numbers.innerHTML += "<br>";
    }
    
    n_lines = code_lines.length;
}

//Create ipcrenderer
const { ipcRenderer } = require('electron')
//Require dialog
const remote = require('@electron/remote');
const { dialog } = remote;
var fs = require('fs'); // Load the File System to execute our common tasks (CRUD)
const fsPromises = require('fs').promises;
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
            fs.promises.readFile(fileNames.filePaths[0]).then((data) => {
                text_area.value = data.toString();
            }).then(()=>{update_line_number()})
        })
}
)
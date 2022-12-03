const stack_beg = 0xBEFFFAE8;
const register_names = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15'];

let stack = ["X"];

let did_a_jmp = false;

let register = ["X","X","X","X","X","X","X","X","X","X","X","X","X",stack_beg,"X",0]; //"X" implies it is not filled yet
let N = "X";
let Z = "X";
let C = "X";
let V = "X";
let reg_base = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 16, 10, 4];

let base_changers = document.getElementsByClassName("base_change");
base_looping = {10: 16, 16 : 2, 2: 4, 4: 10};



function setup_code(){
    unblock_buttons();
    error_info.style.visibility = "hidden";
    let cleaned_code = clean_code();
    code = cleaned_code["temp_code"];
    code_lines = cleaned_code["temp_code_lines"];
    //First run, register all labels
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
    //Second run, raise errors 
    for(let i = 0; i < code.length; i++){
        
        //raise error if first element of line is not an operator
        if(!operators.some((op)=> {return op.name == code[i][0].substring(0, op.n_char)})){
            show_error_message("No operation", code_lines[i]);
            break;
        }
        let op = operators.find((op)=> {return op.name == code[i][0].substring(0, op.n_char)});

        //Check if there is the right number of argument
        //if code[i].length-1 is in op.n_arg
        let shifts = ["LSL", "LSR", "ASR", "ROR"];
        if(!op.n_arg.includes(code[i].length)){
            show_error_message("Wrong number of arguments, "+ code[i].length+ "for op "+op.name+"at line", code_lines[i]);
            break;
        }
        if(op.takes_label){//Check if every label argument to jump is valid
            let label = code[i][1];
            if(!Object.keys(jmp_addr).includes(label)){
                show_error_message("Label "+label+" not found", code_lines[i]);
                break;
            }
        }
        else if(!op.address_arg)         
            for(let j = 1; j < code[i].length; j+=2){                                   //Check if arguments are valid
                if(code[i][j][0] == '#' && !(j == code[i].length-1 && op.immediate_ok)){ //So only the second can be an immediate
                    show_error_message("Immediate argument in the wrong position", code_lines[i]);
                    break;
                }
                if(code[i][j][0] != '#' && !register_names.includes(code[i][j]) 
                && !(shifts.includes(code[i][j])&& j==code[i].length-2) && !(code[i][j]=="RRX" && j==code[i].length-1)){ 
                    show_error_message("Argument "+code[i][j]+" which should be a register is not a register", code_lines[i]);
                    break;
                }
                if(code[i][j][0] == '#' && bit_size_shifted( immediate_solver(code[i][j])) > 8){//Immediate respects bit limit
                    show_error_message("Immediate argument with too many bits (max 8 bit from highest to lowest for dp instr)", code_lines[i]);
                    break;
                }
            }
        else{//We're in a memory instruction
            if(code[i][1][0] == '#'){
                show_error_message("Immediate argument in the wrong position", code_lines[i]);
                break;
            }else if(!register_names.includes(code[i][1])){ 
                show_error_message("Argument which should be a register is not a register", code_lines[i]);
                break;
            }
            if(code[i][4][0] == '#'){
                show_error_message("Immediate argument in the wrong position", code_lines[i]);
                break;
            } else if(!register_names.includes(code[i][4])){ 
                show_error_message("Argument which should be a register is not a register", code_lines[i]);
                break;
            }
            if(code[i].length == 8 && code[i][6][0] == '#' && bit_size( immediate_solver(code[i][6])) > 12){
                show_error_message("Immediate argument with too many bits (max 12 bit from highest to zeroth bit for memory addr)", code_lines[i]);
                break;
            }
        }
        
    }

    if(break_points.length != code_lines.length)
        break_points = Array(code_lines.length).fill(false)
}

function clean_code(){
    let temp_code = text_area.value

    //Put everything in uppercase
    temp_code = temp_code.toUpperCase();

    //Remove everything between /* and */ but keep the \n
    temp_code = temp_code.replace(/\/\*[\s\S]*?\*\//g, function(match) {
        return match.replace(/./g, ' ');
    });
    //Remove everything between an @ and a \n or the end of the file
    temp_code = temp_code.replace(/@.*\n/g, '\n');
    

    //TODO: Make this understand pre run instruction
    
    //Remove everything between a . and a \n
    temp_code = temp_code.replace(/\..*\n/g, '\n');

    //Replace PC with R15
    temp_code = temp_code.replace(/PC/g, 'R15');

    //Add spaces before and after , [ and ]
    temp_code = temp_code.replace(/,/g, ' , ');
    temp_code = temp_code.replace(/\[/g, ' [ ');
    temp_code = temp_code.replace(/\]/g, ' ] ');

    temp_code = temp_code.split("\n");
    temp_code = temp_code.map((line)=>{return line.replace(/\s+/g, ' ').trim()});

    let temp_code_lines = Array(temp_code.length).fill().map((x,i)=>i)
    temp_code_lines = temp_code_lines.filter((i)=>{return temp_code[i].length > 0 && temp_code[i][0] != "@" && temp_code[i] != " "});

    temp_code = temp_code.filter((line)=>{return line.length > 0 && line[0] != "@" && line != " "});
 
    temp_code = temp_code.map((line)=>{return line.split(" ")});
    return {temp_code, temp_code_lines};
}


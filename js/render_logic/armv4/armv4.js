class Armv4 extends Generic_logic {
    constructor(){
        super();
        this.stack_beg = 0xBEFFFAE8;
        this.register_names = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'N', 'Z', 'C', 'V'];
        this.backup_15 = null;
        this.backup_13 = null;
        this.stack = ["X"];
        this.ram = {};
        this.did_a_jmp = false;
        this.register = ["X","X","X","X","X","X","X","X","X","X","X","X","X",this.stack_beg,"X",0,"X","X","X","X"]; //"X" implies it is not filled yet

        this.reg_base = ["s", "s", "s", "s", "s", "s", "s", "s", "s", "s", "s", "s", "s", 16, "s", 4, "s", "s", "s", "s"];
  
        this.base_looping = {"s": "u", "u": 16, 16 : 2, 2: 4, 4: "s"};
        this.operators_object = new armv4_Operator_Lists();
    }
    get_operators(){
        return this.operators_object.get_operators();
    }
    get_conds(){
        return this.operators_object.get_conds();
    }
    get_stack(){
        return this.stack;
    }
    get_register_names(){
        return this.register_names;
    }
    get_register_values(){
        return this.register;
    }
    get_register_count(){
        return this.register_names.length;
    }
    get_register_bases(){
        return this.reg_base;
    }
    get_ram(){
        return this.ram;
    }
    get_current_line(){
        return this.register[15]/4;
    }
    before_execute_line(){
        this.backup_15 = this.register[15];
        this.backup_13 = this.register[13];
    }
    after_execute_line(){
        if(this.backup_15 == this.register[15] && !this.did_a_jmp)
            this.register[15]+=4;
        this.did_a_jmp = false;

        if(this.backup_13 != this.register[13]){
            if(this.backup_13>this.register[13]){
                this.stack = this.stack.concat(Array((this.backup_13-this.register[13])/4).fill("X"));
            }else{
                this.stack = this.stack.slice(0, this.register[13]);
            }
        }
    }
    reset_state(){
        this.register = ["X","X","X","X","X","X","X","X","X","X","X","X","X",this.stack_beg,"X",0, "X","X","X","X"];
        this.ram = {};
        this.stack = ["X"];
    }
    setup_code(){
        unblock_buttons();
        error_info.style.visibility = "hidden";
        let cleaned_code = this.clean_code();
        code = cleaned_code["temp_code"];
        code_lines = cleaned_code["temp_code_lines"];
        //First run, register all labels
        for(let i = 0; i < code.length; i++){
            if(!this.get_operators().some((op)=> {
                return (op.name == code[i][0].substring(0, op.n_char))//The beginnings are the same
                && 
                (
                    code[i][0].length == op.n_char || 
                    this.get_conds().some((cond) => cond.name == code[i][0].substring(op.n_char))||
                    (code[i][0].length == op.n_char+1 && code[i][0][op.n_char]=='S')||
                    (code[i][0][op.n_char]=='S' && this.get_conds().some((cond) => cond.name == code[i][0].substring(op.n_char+1)))
                )
                
                })){
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
            if(!this.get_operators().some((op)=> {return op.name == code[i][0].substring(0, op.n_char)})){
                show_error_message("No operation at line " + i, code_lines[i]);

                break;
            }
            let op = this.get_operators().find((op)=> {return op.name == code[i][0].substring(0, op.n_char)});

            //Check if there is the right number of argument
            //if code[i].length-1 is in op.n_arg
            let shifts = ["LSL", "LSR", "ASR", "ROR"];
            if(!op.n_arg.includes(code[i].length)){
                show_error_message("Wrong number of arguments, "+ code[i].length+ " for op "+op.name+" at line " + i, code_lines[i]);
                break;
            }
            if(op.takes_label){//Check if every label argument to jump is valid
                let label = code[i][1];
                if(!Object.keys(jmp_addr).includes(label) && label[0]!="#"){
                    show_error_message("Label "+label+" not found at line " + i, code_lines[i]);
                    break;
                }
            }
            else if(!op.address_arg)         
                for(let j = 1; j < code[i].length; j+=2){                                   //Check if arguments are valid
                    if(code[i][j][0] == '#' && !(j == code[i].length-1 && op.immediate_ok)){ //So only the second can be an immediate
                        show_error_message("Immediate argument in the wrong position: "+ code[i].join(" ")+" at line " + i, code_lines[i]);
                        break;
                    }
                    if(code[i][j][0] != '#' && !this.register_names.includes(code[i][j]) 
                    && !(shifts.includes(code[i][j])&& j==code[i].length-2) && !(code[i][j]=="RRX" && j==code[i].length-1)){ 
                        show_error_message("Argument "+code[i][j]+" which should be a register is not a register: "+ code[i].join(" ")+" at line " + i, code_lines[i]);
                        break;
                    }
                    if(code[i][j][0] == '#' && bit_size_shifted( armv4_immediate_solver(code[i][j])) > 8){//Immediate respects bit limit
                        show_error_message("Immediate argument with too many bits (max 8 bit from highest to lowest for dp instr): "+ code[i].join(" ")+" at line " + i, code_lines[i]);
                        break;
                    }
                }
            else{//We're in a memory instruction
                if(code[i][1][0] == '#'){
                    show_error_message("In memory instruction, immediate argument in the wrong position: "+ code[i].join(" ")+" at line " + i, code_lines[i]);
                    break;
                }else if(!register_names.includes(code[i][1])){ 
                    show_error_message("In memory instruction, argument which should be a register is not a register: "+ code[i].join(" ")+" at line " + i, code_lines[i]);
                    break;
                }
                if(code[i][4][0] == '#'){
                    show_error_message("In memory instruction, immediate argument in the wrong position: "+ code[i].join(" ")+" at line " + i, code_lines[i]);
                    break;
                } else if(!register_names.includes(code[i][4])){ 
                    show_error_message("In memory instruction, argument which should be a register is not a register : "+ code[i].join(" ")+" at line " + i, code_lines[i]);
                    break;
                }
                if(code[i].length == 8 && code[i][6][0] == '#' && bit_size( armv4_immediate_solver(code[i][6])) > 12){
                    show_error_message("Immediate argument with too many bits (max 12 bit from highest to zeroth bit for memory addr): "+ code[i].join(" ")+" at line " + i, code_lines[i]);
                    break;
                }
            }
            
        }

        if(break_points.length != code_lines.length)
            break_points = Array(code_lines.length).fill(false)
    };

    clean_code(){
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

        //Replace LR with R14
        temp_code = temp_code.replace(/LR/g, 'R14');

        //Add spaces before and after , [ and ]
        temp_code = temp_code.replace(/,/g, ' , ');
        temp_code = temp_code.replace(/\[/g, ' [ ');
        temp_code = temp_code.replace(/\]/g, ' ] ');

        //replace all : by spaces
        temp_code = temp_code.replace(/:/g, ' ');

        //add a \n to eof
        temp_code = temp_code + "\n";

        temp_code = temp_code.split("\n");
        temp_code = temp_code.map((line)=>{return line.replace(/\s+/g, ' ').trim()});

        let temp_code_lines = Array(temp_code.length).fill().map((x,i)=>i)
        temp_code_lines = temp_code_lines.filter((i)=>{return temp_code[i].length > 0 && temp_code[i][0] != "@" && temp_code[i] != " "});

        temp_code = temp_code.filter((line)=>{return line.length > 0 && line[0] != "@" && line != " "});
    
        temp_code = temp_code.map((line)=>{return line.split(" ")});
        return {temp_code, temp_code_lines};
    }

    armv4_check_conditional(tag){
        for(let i = 0; i < conds.length; i++){
            if(tag == conds[i].name)
                return conds[i].f(this.register[16],this.register[17],this.register[18],this.register[19]);
        }
    }
}
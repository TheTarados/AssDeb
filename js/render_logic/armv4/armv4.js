let Generic_logic = require('../generic_logic.js');
let armv4_Operator_Lists = require('./instructions.js');
let {get_unsigned_value, bit_size_shifted, bit_size} = require('../utils.js');

class Armv4 extends Generic_logic {
    constructor(){
        super();
        this.stack_beg = 0xBEFFFAE8;
        this.register_names = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'N', 'Z', 'C', 'V'];
        this.show_register_names = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'FP', 'R12', 'SP', 'LR', 'PC', 'N', 'Z', 'C', 'V'];
        this.backup_15 = null;
        this.backup_13 = null;
        this.stack = [];
        this.ram = {};
        this.did_a_jmp = false;
        this.return_address = 0xDEADBEEF;
        this.register = ["X","X","X","X","X","X","X","X","X","X","X",this.stack_beg,"X",this.stack_beg,this.return_address,0,"X","X","X","X"]; //"X" implies it is not filled yet
        this.code = [];
        this.code_lines = [];
        this.break_points = [];
        this.reg_base = ["s", "s", "s", "s", "s", "s", "s", "s", "s", "s", "s", 16, "s", 16, 16, 4, "s", "s", "s", "s"];
        this.jmp_addr = {};
        this.base_looping = {"s": "u", "u": 16, 16 : 2, 2: 4, 4: "s"};
        this.operators_object = new armv4_Operator_Lists(this);
    }
    get_operators(){
        return this.operators_object.get_operators();
    }
    get_operator(op_string){
        let op = this.get_operators().find((op)=> {
            return (op.name == op_string.substring(0, op.n_char)) && (op.s_ok || op_string[op.n_char] != 'S')&& 
            (
                op_string.length == op.n_char || //nothing after
                this.get_conds().some((cond) => cond.name == op_string.substring(op.n_char))|| //cond at the end
                (op_string.length == op.n_char+1 && op_string[op.n_char]=='S')|| //only an S at the end
                (op_string[op.n_char]=='S' && this.get_conds().some((cond) => cond.name == op_string.substring(op.n_char+1))) //an S and a cond at the end
            );
        })
        return op == undefined? false:op;
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
    get_show_register_names(){
        return this.show_register_names;
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
    get_current_code_line(){
        return this.code[this.get_current_line()];
    }
    get_current_code_length(){
        return this.code.length;
    }
    before_execute_line(){
        this.backup_15 = this.register[15];
        this.backup_13 = this.register[13];
    }
    after_execute_line(){
        if(this.backup_15 == this.register[15] && !this.did_a_jmp)
            this.register[15]+=4;
        this.did_a_jmp = false;
        this.get_register_values()[13] = get_unsigned_value(this.get_register_values()[13], 32);
        this.get_register_values()[11] = get_unsigned_value(this.get_register_values()[11], 32);
        if(this.stack_beg-this.register[13] != this.stack.length*4){
            let dif = this.stack_beg-this.register[13] - this.stack.length*4;
       
            if(dif>0){
                this.stack = this.stack.concat(Array(Math.round(dif/4)).fill("X"));
            }else{
                this.stack = this.stack.slice(0, (this.stack_beg-this.register[13])/4);
            }
        }
 
    }
    get_register_value(element){
        let reg_val = parseInt(element.substring(1), 10);
        return this.get_register_values()[reg_val]+(reg_val==15)*8;
    }
    
    immediate_solver(element){
        if(element[0] == "#"){
            let neg = element[1] == "-";
            let base = 10;
            if( element[1+neg] == "0" && element[2+neg] == "X"){
                base = 16;
            } else if( element[1+neg] == "0" && element[2+neg] == "B"){
                base = 2;
            }
            return parseInt(element.substring(1), base);
        }else
            return this.get_register_value(element);
    }
    
    address_solver(elements){
        let base = this.get_register_value(elements[4]);
        if(elements[5]  == "]") return base;//Case like STR R0, [R0]
        let sign = elements[6][0] == "-";
        let offset = 0;
        if (sign)
            offset = this.immediate_solver(elements[6].substring(1));
        else
            offset = this.immediate_solver(elements[6]);
        sign = sign ? -1 : 1;
        if(elements[7] == "]")//Case like STR R0, [R0, R1]
            return base + sign * offset;
        
        //Commenting this until I find out what it is meant to do.
        //if(elements.length<11)//What case does this take into account?  
        //    return base + sign * ((offset>>>1) | (C<<31));
    
        //Taking into account all cases like STR R0, [R0, R1, LSL #2]
        let shift = this.immediate_solver(elements[9]);
        let shift_type = elements[8];
        if(shift_type == "LSL")
            return base + sign * (offset<<shift);
        else if(shift_type == "LSR")
            return base + sign * (offset >>> shift);
        else if(shift_type == "ASR")
            return base + sign *  (offset >> shift);
        else if(shift_type == "ROR")
            return base + sign * ((offset>>>shift) | (offset<<(32-shift)));
        else alert("Invalid shift type");
    }
    
    post_index_solver(elements){
        let base = this.get_register_value(elements[4]);
        let sign = elements[7][0] == "-";
        let offset = 0;
        if (sign)
            offset = this.immediate_solver(elements[7].substring(1));
        else
            offset = this.immediate_solver(elements[7]);
        sign = sign ? -1 : 1;
        if(elements.length == 8)//Case like STR R0, [R0], R1
            return base + sign * offset;
        
        if(elements.length == 10)//RRX case STR R0, [R0], R1, RRX
            return base + sign * ((offset>>>1) | (C<<31));
    
        //Taking into account all cases like STR R0, [R0], R1, LSL #2
        
        let shift = this.immediate_solver(elements[10]);
        let shift_type = elements[9];
        if(shift_type == "LSL")
            return base + sign * (offset<<shift);
        else if(shift_type == "LSR")
            return base + sign * (offset >>> shift);
        else if(shift_type == "ASR")
            return base + sign *  (offset >> shift);
        else if(shift_type == "ROR")
            return base + sign * ((offset>>>shift) | (offset<<(32-shift)));
        else alert("Invalid shift type");
    }
    reset_state(){
        this.register = ["X","X","X","X","X","X","X","X","X","X","X",this.stack_beg,"X",this.stack_beg,this.return_address,0, "X","X","X","X"];
        this.ram = {};
        this.stack = [];
    }
    setup_code(text_value){
        let cleaned_code = this.clean_code(text_value);
        this.code = cleaned_code["temp_code"];
        this.code_lines = cleaned_code["temp_code_lines"];
        //First run, register all labels
        for(let i = 0; i < this.code.length; i++){
            if(!this.get_operator(this.code[i][0])){
                this.jmp_addr[this.code[i][0].replace(/:/g, " ").trim()] = i*4;
                this.code[i].splice(0,1);
                if(this.code[i].length == 0){
                    this.code.splice(i,1);
                    this.code_lines.splice(i,1);
                    i--;
                }
            }
        }
        //Second run, raise errors 
        for(let i = 0; i < this.code.length; i++){
            let line = this.code[i];
            let line_pos = this.code_lines[i];
            let catched_error = false;
            for (let i =0; i < line.length; i++){
                let val = this.immediate_solver(line[i])
                
                if(line[i][0] == "#"){
                    if(isNaN(val)){
                        show_error_message("Something beginning with # is not an immediate at line "+i, line_pos);
                        catched_error = true;
                        break;
                    }
                    if(val > 0xFFFFFFFF || val < 1-0x7FFFFFFF){
                        show_error_message("Immediate bigger than 32 bit value "+i, line_pos);
                        catched_error = true;
                        break;

                    }
                }
            }
 
            if(catched_error)break;
 
            let last_elem = line[line.length-1]
            
            let op = this.get_operator(line[0])

            //raise error if first element of line is not an operator
            if(!op){
                show_error_message("Already a label on line " + i + " and what comes after is not valid instruction", line_pos);
                break;
            }

            //Check if there is the right number of argument
            //if code[i].length-1 is in op.n_arg
            let shifts = ["LSL", "LSR", "ASR", "ROR"];
            if(shifts.includes(op.name) && last_elem[0] == "#" ){
                let val = this.immediate_solver(last_elem);
                if(val < 0){
                    show_error_message("Shift immediate must be positive " + i, line_pos);
                    break;
                }
                if(val > 32){
                    show_error_message("Shift instruction immediate shouldn't be bigger than 32 at line " + i, line_pos);
                    break;
                }
                if(["LSL", "ROR"].includes(op.name) &&  val > 31){
                    show_error_message("LSL and ROR immediate shouldn't be bigger than 31 at line " + i, line_pos);
                    break;
                }
            }
            if(!op.n_arg.includes(line.length)){
                show_error_message("Wrong number of arguments, "+ line.length+ " for op "+op.name+" at line " + i, line_pos);
                break;
            }
            if(op.takes_label && op.name[0] == "B"){//Check if every label argument to jump is valid
                if (!Object.keys(this.jmp_addr).includes(last_elem) && last_elem[0]!="#"){
                    show_error_message("Wrong argument for B or label not recognized at line " + i, line_pos);
                    break;
                }
            }
            if(op.name == "PUSH" || op.name == "POP"){
                if(line[1] != "{" || last_elem != "}"){
                    show_error_message("Missing { at beginning and/or } at end of line " + i, line_pos);
                    break;
                }
                for(let j = 2; j < line.length-1; j+=2){
                    if(!this.register_names.includes(line[j])){
                        show_error_message("Argument "+line[j]+" which should be a register is not a register at line " + i, line_pos);
                        break;
                    }
                    if(!(line[j+1] == "," || line[j+1] == "-") && j != line.length-2){
                        show_error_message("Missing , or - between registers at line " + i, line_pos);
                        break;
                    }
                }
            }else if (op.name == ".WORD"){
                if(line[1][0]== "#"){
                    show_error_message(".word doesnt need the # at ", line_pos);
                    break;
                }
            }else if(op.name == "LDM" || op.name == "LDMIA" || op.name == "LDMFD"){
                if(!this.register_names.includes(line[1])){
                    show_error_message("Argument "+line[1]+" which should be a register is not a register at line " + i, line_pos);
                    break;
                }
                let W = line[2] == "!" ? 1 : 0;
                if(line[3+W] != "{" || last_elem != "}"){
                    show_error_message("Missing { at beginning and/or } at end of line " + i, line_pos);
                    break;
                }
                for(let j = 4+W; j < line.length-1; j+=2){
                    if(!this.register_names.includes(line[j])){
                        show_error_message("Argument "+line[j]+" which should be a register is not a register at line " + i, line_pos);
                        break;
                    }
                    if(!(line[j+1] == "," || line[j+1] == "-") && j != line.length-2){
                        show_error_message("Missing , or - between registers at line " + i, line_pos);
                        break;
                    }
                }
            }else if(!op.address_arg && op.name[0] != "B"){
                for(let j = 1; j < line.length; j+=2){                                   //Check if arguments are valid
                    if(line[j][0] == '#' && !(j ==line.length-1 && op.immediate_ok)){ //So only the second can be an immediate
                        show_error_message("Immediate argument in the wrong position at line " + i, line_pos);
                        break;
                    }
                    if(line[j][0] != '#' && !this.register_names.includes(line[j]) 
                    && !(shifts.includes(line[j])&& j==line.length-2) && !(line[j]=="RRX" && j==line.length-1)){ 
                        show_error_message("Argument "+line[j]+" which should be a register is not a register: at line " + i, line_pos);
                        break;
                    }
                    if(line[j][0] == '#' && bit_size_shifted( Math.abs(this.immediate_solver(line[j]))) > (op.name=="MOV"? 12: 8)){//Immediate respects bit limit
                        show_error_message("Immediate argument with too many bits (max 8 bit from highest to lowest for dp instr and 12 for mov) at line " + i, line_pos);
                        break;
                    }
                }
                if(line.length == (op.name == "MOV"?6:8) && last_elem != "RRX"){
                    show_error_message("Problem at line, wrong number of element or RRX is badly writtin at " + i, line_pos);
                }
                if(line.length> 1 && last_elem != "RRX" && last_elem[0] != "#" && !this.register_names.includes(last_elem)){
                    show_error_message("Last element not recognized at line " + i, line_pos);
                    break;
                } 

                if(shifts.includes(line[line.length -2])){
                    if(last_elem[0]!= "#"){
                        show_error_message("Shift must have an immediate argument " + i, line_pos);
                        break;
                    }
                    let val = this.immediate_solver(last_elem);
                    if(isNaN(val)){
                        show_error_message("Shift must have a correct immediate argument " + i, line_pos);
                        break;
                    }
                    if(val < 0){
                        show_error_message("Shift immediate must be positive " + i, line_pos);
                        break;
                    }
                    if(val > 32){
                        show_error_message("Shift instruction immediate shouldn't be bigger than 32 at line " + i, line_pos);
                        break;
                    }
                    if(["LSL", "ROR"].includes(line[line.length -2]) &&  val > 31){
                        show_error_message("LSL and ROR immediate shouldn't be bigger than 31 at line " + i, line_pos);
                        break;
                    }
                }   
            }else if(op.name[0] != "B"){//We're in a memory instruction
                //Get index of ]
                let immediate_pos = 0;
                let register_pos =0;

                let index = line.indexOf("]");
                let prob_with_addr = false;
                switch(index){
                    case -1: //Label (only case where no ])
                        prob_with_addr ||= !Object.keys(this.jmp_addr).includes(line[3])
                        break;
                    case 5://[R1] or [R1], R2, RRX or [R1], R2, LSL #2
                        prob_with_addr ||= ![6, 8, 10, 11].includes(line.length);
                        prob_with_addr ||= line.length >6 && line[6] != ",";
                        prob_with_addr ||= line.length == 10 && (line[8] != "," ||line[9] != "RRX");
                        prob_with_addr ||= line.length == 11 && (line[8] != "," || !shifts.includes(line[9]));
                        
                        if(line.length == 8){
                            register_pos = line[7][0] == "#"? -7: 7;
                        }
                        if(line.length == 10 || line.length == 11){
                            register_pos = 7;
                        }
                        if(line.length == 11){
                            immediate_pos = 10;
                        }
                        break;
                    case 7://[R1, R2] or [R1, R2]! or 12bit immediate instead of R2
                        prob_with_addr ||= ![8, 9].includes(line.length)
                        prob_with_addr ||= line.length == 9 && line[8] != "!";
                        prob_with_addr ||= line[5] != ",";
                        register_pos = line[6][0] == "#"? -6: 6;
                        
                        break;
                    case 9://[R1, R2, RRX] or [R1, R2, RRX]!
                        prob_with_addr ||= ![10, 11].includes(line.length);
                        prob_with_addr ||= line.length == 11 && line[10] != "!";
                        prob_with_addr ||= line[7] != ",";
                        prob_with_addr ||= line[8] != "RRX";
                        register_pos = 6;
                        break;
                    case 10://[R1, R2, LSL #2] or [R1, R2, LSL #2]!
                        prob_with_addr ||= ![11, 12].includes(line.length);
                        prob_with_addr ||= line.length == 12 && line[11] != "!";
                        prob_with_addr ||= line[5] != "," ;
                        prob_with_addr ||= line[7] != "," ;
                        prob_with_addr ||= !shifts.includes(line[8]);
                        prob_with_addr ||= line[index-1][0] != "#";
                        register_pos = 6;
                        immediate_pos = 9;
                        break;
                    default:
                        prob_with_addr = true;
                        break;
                    
                }
                if(prob_with_addr){
                    show_error_message("Wrong address format: "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }

                if(line[1][0] == '#'){
                    show_error_message("In memory instruction, immediate argument in the wrong position: "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }

                if(line[2] != ','){
                    show_error_message("In memory instruction, lack a comma: "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }

                if(!this.register_names.includes(line[1])){ 
                    show_error_message("In memory instruction, argument which should be a register is not a register: "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }

                if(line.length>4 && line[4][0] == '#'){
                    show_error_message("In memory instruction, immediate argument in the wrong position: "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }
                if(line.length>4 && !this.register_names.includes(line[4])){ 
                    show_error_message("In memory instruction, argument which should be a register is not a register : "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }

                if(register_pos>0 && line[register_pos][0] == '#'){
                    show_error_message("In memory instruction, immediate argument in the wrong position: "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }
                if(register_pos>0 && !this.register_names.includes(line[register_pos])){ 
                    show_error_message("In memory instruction, argument which should be a register is not a register : "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }

                
                if(register_pos <0 && line[6][0] == '#' //It is an immediate
                && bit_size( Math.abs(this.immediate_solver(line[-register_pos]))) > 12 //Whose bits fits in 12
                ){
                    show_error_message("Immediate argument has too many bits (max 12 bit from highest to zeroth bit): "+ line.join(" ")+" at line " + i, line_pos);
                    break;
                }

                if(immediate_pos  > 0 && line[immediate_pos][0] == '#'){ //It is an immediate
                    let val = this.immediate_solver(line[immediate_pos]);
                    if(val < 0){
                        show_error_message("Shift immediate must be positive " + i, line_pos);
                        break;
                    }
                    if(val > 32){
                        show_error_message("Shift immediate shouldn't be bigger than 32 at line " + i, line_pos);
                        break;
                    }
                    if(["LSL", "ROR"].includes(line[immediate_pos-1]) &&  val > 31){
                        show_error_message("LSL and ROR immediate shouldn't be bigger than 31 at line " + i, line_pos);
                        break;
                    }
                    
                }
            }
            
        }

        if(this.break_points.length != this.code_lines.length)
        this.break_points = Array(this.code_lines.length).fill(false)
    };

    clean_code(temp_code){


        //Put everything in uppercase
        temp_code = temp_code.toUpperCase();

        //Remove everything between /* and */ but keep the \n
        temp_code = temp_code.replace(/\/\*[\s\S]*?\*\//g, function(match) {
            return match.replace(/./g, ' ');
        });
        //Remove everything between an @ and a \n or the end of the file
        temp_code = temp_code.replace(/@.*/g, '');
        //Remove everything between a ; and a \n or the end of the file
        temp_code = temp_code.replace(/;.*/g, '');
        

        //TODO: Make this understand pre run instruction
        //Remove everything between a . and a \n
        temp_code = temp_code.replace( /\.(?!WORD).*\n/g, '\n');
    
        //Replace PC with R15
        temp_code = temp_code.replace(/PC/g, 'R15');

        //Replace LR with R14
        temp_code = temp_code.replace(/LR/g, 'R14');

        //Replace SP with R13
        temp_code = temp_code.replace(/SP/g, 'R13');

        //Replace FP with R11
        temp_code = temp_code.replace(/FP/g, 'R11');
        //Add spaces before and after , [  ] {  } and !
        temp_code = temp_code.replace(/,/g, ' , ');
        temp_code = temp_code.replace(/\[/g, ' [ ');
        temp_code = temp_code.replace(/\]/g, ' ] ');
        temp_code = temp_code.replace(/\{/g, ' { ');
        temp_code = temp_code.replace(/\}/g, ' } ');
        temp_code = temp_code.replace(/\!/g, ' ! ');

        //Add space before and after - iff there is no # before
        temp_code = temp_code.replace(/([^#])\-/g, '$1 - ');

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

    check_conditional(tag){
        for(let i = 0; i < this.get_conds().length; i++){
            if(tag == this.get_conds()[i].name)
                return this.get_conds()[i].f(this.register[16],this.register[17],this.register[18],this.register[19]);
        }
        return "FOUND NO CONDITIONAL";
    }
    get_hex(code){
        this.setup_code(code);
        let hex = "";
        for(let i = 0; i < this.code.length; i++){
            let elems = this.code[i];
            let op = this.get_operator(elems[0]);
            hex += op.to_hex(elems, i)+"\n";
        }
        return hex;
    }
    get_current_area_line(){
        return this.code_lines[this.get_current_line()];
    }
    get_area_line_list(){
        return this.code_lines;
    }
    get_break_points(index){
        return this.break_points[index];
    }
    invert_break_points(index){
        this.break_points[index] = !this.break_points[index];
    }
    get_state(){
        return {register: [...this.register], ram: {...this.ram}, stack: [...this.stack]};
    }
    restore_state(state){
        this.register = state.register;
        this.ram = state.ram;
        this.stack = state.stack;
    }
}
module.exports = Armv4;
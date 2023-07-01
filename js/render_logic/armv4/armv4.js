
class Armv4 extends Generic_logic {
    constructor(){
        super();
        this.stack_beg = 0xBEFFFAE8;
        this.register_names = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'N', 'Z', 'C', 'V'];
        this.backup_15 = null;
        this.backup_13 = null;
        this.stack = [];
        this.ram = {};
        this.did_a_jmp = false;
        this.register = ["X","X","X","X","X","X","X","X","X","X","X",this.stack_beg,"X",this.stack_beg,"X",0,"X","X","X","X"]; //"X" implies it is not filled yet
        this.code = [];
        this.code_lines = [];
        this.break_points = [];
        this.reg_base = ["s", "s", "s", "s", "s", "s", "s", "s", "s", "s", "s", 16, "s", 16, "s", 4, "s", "s", "s", "s"];
        this.jmp_addr = {};
        this.base_looping = {"s": "u", "u": 16, 16 : 2, 2: 4, 4: "s"};
        this.operators_object = new armv4_Operator_Lists(this);
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
        console.log(base, sign, offset);
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
        this.register = ["X","X","X","X","X","X","X","X","X","X","X",this.stack_beg,"X",this.stack_beg,"X",0, "X","X","X","X"];
        this.ram = {};
        this.stack = [];
    }
    setup_code(text_value){
        let cleaned_code = this.clean_code(text_value);
        this.code = cleaned_code["temp_code"];
        this.code_lines = cleaned_code["temp_code_lines"];
        //First run, register all labels
        for(let i = 0; i < this.code.length; i++){
            if(!this.get_operators().some((op)=> {
                return (op.name == this.code[i][0].substring(0, op.n_char))//The beginnings are the same
                && 
                (
                    this.code[i][0].length == op.n_char || 
                    this.get_conds().some((cond) => cond.name == this.code[i][0].substring(op.n_char))||
                    (this.code[i][0].length == op.n_char+1 && this.code[i][0][op.n_char]=='S')||
                    (this.code[i][0][op.n_char]=='S' && this.get_conds().some((cond) => cond.name == this.code[i][0].substring(op.n_char+1)))
                )
                
                })){
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
            //raise error if first element of line is not an operator
            if(!this.get_operators().some((op)=> {return op.name == line[0].substring(0, op.n_char)})){
                show_error_message("No operation at line " + i, line);

                break;
            }
            let op = this.get_operators().find((op)=> {return op.name == line[0].substring(0, op.n_char)});
            
            //Check if there is the right number of argument
            //if code[i].length-1 is in op.n_arg
            let shifts = ["LSL", "LSR", "ASR", "ROR"];
            if(!op.n_arg.includes(line.length)){
                show_error_message("Wrong number of arguments, "+ line.length+ " for op "+op.name+" at line " + i, this.code_lines[i]);
                break;
            }
            if(op.takes_label){//Check if every label argument to jump is valid
                let label = line[line.length-1];
                if(!Object.keys(this.jmp_addr).includes(label) && label[0]!="#" && label[0]!="R" && label[0]!="]" && label[0]!="!"){
                    show_error_message("Label "+label+" not found at line " + i, this.code_lines[i]);
                    break;
                }
            }else if(op.name == "PUSH" || op.name == "POP"){
                if(line[1] != "{" || line[line.length-1] != "}"){
                    show_error_message("Missing { at beginning and/or } at end of line " + i, this.code_lines[i]);
                    break;
                }
                for(let j = 2; j < line.length-1; j+=2){
                    if(!this.register_names.includes(line[j])){
                        show_error_message("Argument "+line[j]+" which should be a register is not a register: "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                        break;
                    }
                    if(!(line[j+1] == "," || line[j+1] == "-") && j != line.length-2){
                        show_error_message("Missing , or - between registers at line " + i, this.code_lines[i]);
                        break;
                    }
                }
            }else if (op.name == ".WORD"){
                if(line[1][0]== "#"){
                    show_error_message(".word doesnt need the # at ", this.code_lines[i]);
                }
            }else if(op.name == "LDM" || op.name == "LDMIA" || op.name == "LDMFD"){
                if(!this.register_names.includes(line[1])){
                    show_error_message("Argument "+line[1]+" which should be a register is not a register: "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                    break;
                }
                let W = line[2] == "!" ? 1 : 0;
                if(line[3+W] != "{" || line[line.length-1] != "}"){
                    show_error_message("Missing { at beginning and/or } at end of line " + i, this.code_lines[i]);
                    break;
                }
                for(let j = 4+W; j < line.length-1; j+=2){
                    if(!this.register_names.includes(line[j])){
                        show_error_message("Argument "+line[j]+" which should be a register is not a register: "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                        break;
                    }
                    if(!(line[j+1] == "," || line[j+1] == "-") && j != line.length-2){
                        show_error_message("Missing , or - between registers at line " + i, this.code_lines[i]);
                        break;
                    }
                }
            }else if(!op.address_arg)         
                for(let j = 1; j < line.length; j+=2){                                   //Check if arguments are valid
                    if(line[j][0] == '#' && !(j ==line.length-1 && op.immediate_ok)){ //So only the second can be an immediate
                        show_error_message("Immediate argument in the wrong position: "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                        break;
                    }
                    if(line[j][0] != '#' && !this.register_names.includes(line[j]) 
                    && !(shifts.includes(line[j])&& j==line.length-2) && !(line[j]=="RRX" && j==line.length-1)){ 
                        show_error_message("Argument "+line[j]+" which should be a register is not a register: "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                        break;
                    }
                    if(line[j][0] == '#' && bit_size_shifted( Math.abs(this.immediate_solver(line[j]))) > (line[0]=="MOV"? 12: 8)){//Immediate respects bit limit
                        show_error_message("Immediate argument with too many bits (max 8 bit from highest to lowest for dp instr and 12 for mov): "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                        break;
                    }
                }
            else{//We're in a memory instruction
                if(line[1][0] == '#'){
                    show_error_message("In memory instruction, immediate argument in the wrong position: "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                    break;
                }else if(!this.register_names.includes(line[1])){ 
                    show_error_message("In memory instruction, argument which should be a register is not a register: "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                    break;
                }
                if(line.length>4 && line[4][0] == '#'){
                    show_error_message("In memory instruction, immediate argument in the wrong position: "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                    break;
                } else if(line.length>4 && !this.register_names.includes(line[4])){ 
                    show_error_message("In memory instruction, argument which should be a register is not a register : "+ line.join(" ")+" at line " + i, this.code_lines[i]);
                    break;
                }
                if(line.length == 8 && (line[6][0] == '#' || line[7][0] == '#') //It is an immediate
                && bit_size( Math.abs(this.immediate_solver(line[6]))) > 12 //Whose bits fits in 12
                ){
                    show_error_message("Immediate argument with too many bits (max 12 bit from highest to zeroth bit for memory addr): "+ line.join(" ")+" at line " + i, code_lines[i]);
                    break;
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
        //temp_code = temp_code.replace(/\..*\n/g, '\n');

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
            let elements = this.code[i];
            for (let j = 0; j < this.get_operators().length; j++){
                if(elements[0].substring(0, this.get_operators()[j].n_char) == this.get_operators()[j].name){
                    hex += this.get_operators()[j].to_hex(elements, i)+"\n";
                    break;
                }
            }
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
}
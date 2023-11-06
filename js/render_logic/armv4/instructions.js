

let {get_unsigned_value, bit_size_shifted, input_checker} = require('../utils.js');
class armv4_Operator{
    constructor(name, n_args, language){
        this.name = name;
        this.n_char = name.length;
        this.execute_line;
        this.n_arg = n_args;
        this.immediate_ok = false;
        this.address_arg = false;
        this.takes_label = false;
        this.s_ok = false;
        this.language = language;
    }
    to_hex(elements, line_index){
        throw new Error("to_hex not implemented for this operator");
    };
}
function reg_list_to_bool_array(reg_list){
    let to_push_regs = new Array(16).fill(false);
    let last_one = -1;
    for (let i = 0; i < reg_list.length; i++){
        if(reg_list[i] == ","){
            continue;
        }
        if(reg_list[i] == "-"){
            for(let j = last_one+1; j < parseInt(reg_list[i+1].substring(1)); j++){
                to_push_regs[j] = true;
            }
            i++;
        }else{
            to_push_regs[parseInt(reg_list[i].substring(1))] = true;
        }
        last_one = parseInt(reg_list[i].substring(1));
    }
    return to_push_regs;
}

function get_cond_bin(language, op_block){
    let cond = op_block.substring(op_block.length-2);

    for(let i = 0; i < language.get_conds().length; i++)
        if(language.get_conds()[i].name == cond)
            return language.get_conds()[i].cond_bin;

    return "1110";
    
}


shift_to_sh = {"LSL":"00", "LSR":"01", "ASR":"10", "ROR":"11", "RRX":"11"};

data_proc_exec = (elements, nzcv, f, language)=>{
    let s = false;
    if (elements[0].length>3){
        s = elements[0][3]== "S";//check if commend of the form XXXS
    } 
    if(!(elements[0].length<5 || language.check_conditional(elements[0].substring( 3+s, s+5))))return nzcv;
    let source = (+( elements.length == 6 || elements.length == 9))*2; //Check if first argument == destination
    
    let right_operand = language.immediate_solver(elements[3+source]);

    
    if(elements[elements.length-1] == "RRX"){
        right_operand = ((right_operand>>>1) | (C<<31));
    }else if(elements.length == 9 || elements.length == 7){
        let shift = language.immediate_solver(elements[elements.length-1]);
        let shift_type = elements[elements.length-2];
        if(shift_type == "LSL")
            right_operand = right_operand<<shift;
        else if(shift_type == "LSR")
            right_operand = right_operand >>> shift;
        else if(shift_type == "ASR")
            right_operand = right_operand >> shift;
        else if(shift_type == "ROR")
            right_operand = (right_operand>>>shift) | (right_operand<<(32-shift));
        else alert("Invalid shift type");
    }
    if(s){
        nzcv[2] = 0;
        nzcv[3] = 0;
    }
    let left_operand = language.get_register_value(elements[1+source]);
    if(elements[0].substring(0, 3) == "MOV" || elements[0].substring(0, 3) == "MVN"){
        operands = [right_operand];
    }else{
        operands = [left_operand, right_operand];
    }
    language.get_register_values()[[parseInt(elements[1].substring(1))]] = input_checker(f(left_operand, right_operand, s, nzcv), operands);
    
    if(s){
        nzcv[0] = input_checker((language.get_register_value(elements[1]) >> 31)&1, operands);
        nzcv[1] = input_checker(language.get_register_value(elements[1]) == 0, operands);
    }
    
    
    return nzcv;
};
class armv4_Data_proc_operator extends armv4_Operator{
    constructor(name, n_args, f, cmd, language){
        super(name, n_args, language)
        this.immediate_ok = true;
        this.s_ok = true;
        this.f = f;
        this.cmd = cmd;
        this.execute_line =  (elements, nzcv)=>data_proc_exec(elements, nzcv, f, language);
    }
    to_hex(elems, line_index){
        //TODO take into account special case mov and the shifts
        let op_block = elems[0];
        let source = (+( elems.length == 6 || elems.length == 9))*2;
        let s = 0;
        if(op_block.length > 3)
            s = op_block[3] == "S" 
        
        let bin = get_cond_bin(this.language, op_block);
        //2 bits of opcode
        bin += "00";


        //1 bit of I
        let is_Shifted_Register = elems.length >= 7;
        let is_Immediate =  elems[elems.length-1][0]=="#" && !is_Shifted_Register;
        let is_MOV_or_SHIFT = this.cmd == "1101";
        if(!is_MOV_or_SHIFT || this.name == "MOV"){
            bin += is_Immediate?"1":"0";
        }else{
            bin += "0";
        }

        //4 bits of cmd
        bin += this.cmd;
        //1 bits of S
        //Either excplitly stated or if inst is a compare operation
        bin += (s||this.cmd.substring(0, 2) == "10")? "1":"0"; 


        //4 bits of Rn
        if(is_MOV_or_SHIFT){
            //Rn is useless
            bin += "0000";
        }else{
            //elems[1].substring(1) to binary
            bin += parseInt(elems[1+source].substring(1)).toString(2).padStart(4, "0");
        }
        //4 bits of Rd
        bin += parseInt(elems[1].substring(1)).toString(2).padStart(4, "0");
        
        //12 bits of operand2
        if(this.name == "MOV"){
            if(is_Immediate){
                let to_mov = parseInt(elems[elems.length-1].substring(1));
                to_mov = get_unsigned_value(to_mov);
                let not_to_mov = ~to_mov;
                if (bit_size_shifted(to_mov) < bit_size_shifted(not_to_mov)){
                    bin += to_mov.toString(2).padStart(12, "0");
                }else{
                    //Encode is as a MVN to save the day
                    //Replace the cmd with 1111
                    bin = bin.substring(0, 7) + "1111" + bin.substring(12);
                    bin += not_to_mov.toString(2).padStart(12, "0");
                }
                
            }else{
                bin += "00000000";
                bin += parseInt(elems[elems.length-1].substring(1)).toString(2).padStart(4, "0");
            }
        }else if(this.cmd == "1101"){
            //Shift
            if(is_Immediate){
                //Five bits of shamt5, our immediate
                let shift_val = get_unsigned_value(this.language.immediate_solver(elems[elems.length-1]));
                bin += (shift_val%32).toString(2).padStart(5, "0");
                if(shift_val == 0){
                    bin += "00"
                }else{
                    bin += shift_to_sh[op_block.substring(0,3)];
                }
            }else{
                if(this.name != "RRX"){
                    bin += parseInt(elems[elems.length-1].substring(1)).toString(2).padStart(4, "0");
                }else{
                    bin += "0000";
                }
                bin += "0";
                bin += shift_to_sh[op_block.substring(0,3)];
            }
            if(this.name != "RRX"){
                bin += is_Immediate?"0":"1";
                bin += parseInt(elems[1+source].substring(1)).toString(2).padStart(4, "0");
            }else{
                bin += "0";
                bin += parseInt(elems[3].substring(1)).toString(2).padStart(4, "0");
            }
        } else if(is_Immediate){//I = 1 (Immediate)
            //4 bits of rot and 8 bits of immediate
            let imm = this.language.immediate_solver(elems[3+source]);

            //Get position of highest bit of imm
            let pos = 0;
            for(let i = 0; i <32; i++){
                if((imm>>(31-i))&1){
                    pos = 31-i;
                    break;
                }
            }
            if(pos > 7){
                bin += ((32-(pos-7))/2).toString(2).padStart(4, "0");
                bin += (imm>>((pos-7))).toString(2).padStart(8, "0");
            }
            else{
                bin += "0000";
                bin += imm.toString(2).padStart(8, "0");
            }
        }else{//I = 0 (Register or Register-shifted register)
            if(!is_Shifted_Register){
                bin += "00000000";
            }else if(is_Shifted_Register && elems[elems.length-1][0] != "#"){
                //4 bits of Rs
                bin += parseInt(elems[elems.length-1].substring(1)).toString(2).padStart(4, "0");
                //a 0 bit
                bin += "0";
                //2 bits of sh
                bin += shift_to_sh[elems[elems.length-2]];
                //a 1 bit
                bin += "1";
            }else{
                //5 bits of shamt5
                let shift_val = get_unsigned_value(this.language.immediate_solver(elems[elems.length-1]));
                bin += (shift_val%32).toString(2).padStart(5, "0");
                if(shift_val == 0){
                    bin += "00"
                }else{
                    bin += shift_to_sh[elems[elems.length-2]];
                }
                //a 0 bit
                bin += "0";
            }
            //4 bits of Rm
            bin += parseInt(elems[3 + source].substring(1)).toString(2).padStart(4, "0");
        }
        //Doing two 16 bit hex numbers to avoid overflows
        return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
                +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
    };
}

mul_exec = (elements, nzcv,f ,g)=>{
    //check if commend of the form XXXS
    let s = elements[0][3]== "S"||elements[0][5]== "S";
    if(!(elements[0].length<6 || this.language.check_conditional(elements[0].substring( 3+s, s+5)))) return nzcv;

    if(s){
        nzcv[2] = 0;
        nzcv[3] = 0;
    }
    operands = [this.language.get_register_value(elements[1]), 
    this.language.get_register_value(elements[3]), 
    this.language.immediate_solver(elements[5]),
    this.language.immediate_solver(elements[7])]
    let low_bits = f(operands[0], operands[1], operands[2], operands[3], s);
    let high_bits = g(operands[0], operands[1], operands[2], operands[3], s);
    
    this.language.get_register_values()[[parseInt(elements[1].substring(1))]] = input_checker(low_bits, operands);
    this.language.get_register_values()[[parseInt(elements[3].substring(1))]] = input_checker(high_bits, operands);
    
    if(!s) return nzcv;
    nzcv[0] = input_checker((this.language.get_register_value(elements[1]) >> 31)&1, operands);
    nzcv[1] = input_checker(this.language.get_register_value(elements[1]) == 0, operands);
    return nzcv;
    
};

class armv4_Mul_operator extends armv4_Operator{
    constructor(name, n_args, f, g, cmd, language){
        super(name, n_args, language)
        this.f = f;
        this.g = g;
        this.cmd = cmd;
        this.s_ok = true;
        this.execute_line = (elements, nzcv)=>{
            if(elements[0] != "MUL"){
                return mul_exec(elements, nzcv, f, g);
            }else{
                return data_proc_exec(elements, nzcv, f, this.language);
            }
        }
    }
    to_hex(elems, line_index){
        let op_block = elems[0];
        let source =  elems.length == 4;
        source = this.name == "MUL" && source;
        source = +(source)*2;
        let s = op_block[3]== "S" || op_block[5]== "S";

        let bin = get_cond_bin(this.language, op_block);
        //2 bits of opcode an d 2 0 bits
        bin += "0000";
        
        //cmd
        bin += this.cmd;
        //1 bit of S	
        bin += s?"1":"0";
        //4 bits of Rd
        bin += parseInt(elems[1].substring(1)).toString(2).padStart(4, "0");
        //4 bits of Ra
        if(this.name != "MUL"){
            bin += parseInt(elems[7].substring(1)).toString(2).padStart(4, "0");
        }else{
            bin += "0000";
        }
        //4 bits of Rm
        
        bin += parseInt(elems[5-source].substring(1)).toString(2).padStart(4, "0");
        
        bin += "1001";

        //4 bits of Rn//4 bits of Rm
        bin += parseInt(elems[3-source].substring(1)).toString(2).padStart(4, "0");
        
        //Doing two 16 bit hex numbers to avoid overflows
        return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
                +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
    };
}

class armv4_Comp_operator extends armv4_Operator{
    constructor(name, n_args, f, cmd, language){
        super(name, n_args, language)
        this.f = f;
        this.cmd = cmd;
        this.immediate_ok = true;
        this.execute_line = (elements, nzcv)=>{
            //check if commend of the form XXXS
            if(!(elements[0].length<4 || this.language.check_conditional(elements[0].substring( 3, 5)))) return nzcv;
            nzcv[2] = 0;
            nzcv[3] = 0;
            let value = f(this.language.get_register_value(elements[1]), this.language.immediate_solver(elements[3]), nzcv);
            
            nzcv[0] = (value >> 31)&1;
            nzcv[1] = value == 0;
            return nzcv;
        };
    }
    to_hex(elems, line_index){
        let op_block = elems[0];
        let is_Shifted_Register = elems.length == 7;
        let is_Immediate =  elems[3][0]=="#";
        
        let bin = get_cond_bin(this.language, op_block);
        //2 bits of opcode & 1 bit of I
        bin += "00";
        bin += is_Immediate?"1":"0";
        
        //4 bits of cmd
        bin += this.cmd;
        //1 bits of S
        bin +=  "1"; 

        //elems[1].substring(1) to binary
        bin += parseInt(elems[1].substring(1)).toString(2).padStart(4, "0");
        
        //4 bits of Rd
        bin += "0000";
        
        //12 bits of operand2
        if(is_Immediate){//I = 1 (Immediate)
            //4 bits of rot and 8 bits of immediate
            let imm = this.language.immediate_solver(elems[3]);

            //Get position of highest bit of imm
            let pos = 0;
            for(let i = 0; i <32; i++){
                if((imm>>(31-i))&1){
                    pos = 31-i;
                    break;
                }
            }
            if(pos > 7){
                bin += ((32-(pos-7))/2).toString(2).padStart(4, "0");
                bin += (imm>>((pos-7))).toString(2).padStart(8, "0");
            }
            else{
                bin += "0000";
                bin += imm.toString(2).padStart(8, "0");
            }
        }else{//I = 0 (Register or Register-shifted register)
            if(elems.length == 4){
                //4 bits of Rs
                bin += "000000"
            }else if(is_Shifted_Register && elems[elems.length-1][0] != "#"){
                //4 bits of Rs
                bin += parseInt(elems[elems.length-1].substring(1)).toString(2).padStart(4, "0");
                //a 0 bit
                bin += "0";
                //2 bits of sh
                bin += shift_to_sh[elems[elems.length-2]];
                //a 1 bit
                bin += "1";
            }else{
                //5 bits of shamt5
                bin += get_unsigned_value(athis.language.immediate_solver(elems[elems.length-1])).toString(2).padStart(5, "0");
                
                bin += shift_to_sh[elems[elems.length-2]];

                //a 0 bit
                bin += "0";
            }
            //4 bits of Rm
            bin += parseInt(elems[3].substring(1)).toString(2).padStart(4, "0");
        }
        //Doing two 16 bit hex numbers to avoid overflows
        return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
                +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
    };
}

class armv4_Condition{
    constructor(name, f, cond_bin){
        this.name = name;
        this.f = f;
        this.cond_bin = cond_bin;
    }
}

class armv4_Memory_operator extends armv4_Operator{
    constructor(name, f, language){
        //4 is the case LDR R0, label
        //6 is the case LDR R0, [R1]
        //8 is the case LDR R0, [R1], R2
        //8 is the case LDR R0, [R1, R2]
        //9 is the case LDR R0, [R1, R2]!
        
        //10 is the case LDR R0, [R1, R2, RRX]
        //10 is the case LDR R0, [R1], R2, RRX
        
        //11 is the case LDR R0, [R1, R2, RRX]!
        //11 is the case LDR R0, [R1], R2, LSL #2
        //11 is the case LDR R0, [R1, R2, LSL #2]

        //12 is the case LDR R0, [R1, R2, LSL #2]!
        super(name, [4, 6,8, 9,10,11, 12], language);
        this.immediate_ok = true;
        this.address_arg = true;
        
        this.takes_label = name[0]=="L"; 
        //We don't let user change its code on the fly
        //It is not standard practice, is most of the time impossible
        //And it is a pain to implement
        this.f = f;
    }
    execute_line(elements, nzcv){
        if (elements[0][0] == "S"){
            return this.s_memory_exec(elements, nzcv, this.f);
        }else {
            return this.l_memory_exec(elements, nzcv, this.f);
        }
    }
    s_memory_exec(elements, nzcv, f){
        //Should the operation be executed?
        if(elements[0].length>4 && !this.language.check_conditional(elements[0].substring( elements[0].length - 2))) return nzcv;
        
        let addr= this.language.address_solver(elements);
        let stack_index = this.language.stack_beg/4-Math.floor(addr/4)-1;
        if(addr<this.language.get_register_values()[13])
            this.language.ram[Math.floor(addr/4)] 
                = f(this.language.ram[Math.floor(addr/4)], this.language.get_register_value(elements[1]), addr);
        else{
            this.language.stack[stack_index] 
                = f(this.language.stack[stack_index], this.language.get_register_value(elements[1]), addr);
        }
        if(elements[elements.length-1] == "!"){//Pre-index: Case LDR R0, [R1, R2(, LSL #2)]!
            this.language.get_register_values()[parseInt(elements[4].substring(1), 10)] = addr;
        }
        else if(elements[elements.length-1] != "]"){//Post-index: Case LDR R0, [R1], R2 (, LSL #2)
            this.language.get_register_values()[parseInt(elements[4].substring(1), 10)] = this.language.post_index_solver(elements);
        }
        return nzcv;
    }
    
    
    l_memory_exec(elements, nzcv, f){
        //Should the operation be executed?
        if(!this.language.check_conditional(elements[0].substring( elements[0].length - 2))) return nzcv;
        let value = 0;
        let arg_is_label = elements.length ==4;
        let addr =  arg_is_label? this.language.jmp_addr[elements[3]]: this.language.address_solver(elements);
        if(arg_is_label || elements[4] == "R15"){//addr relative to PC
            value = parseInt(this.language.code[addr/4][1], 16);
        }else if(addr<this.language.get_register_values()[13])//addr relative to ram
            value = this.language.ram[Math.floor(addr/4)];
        else//addr relative to stack
            value = this.language.stack[this.language.stack_beg/4-Math.floor(addr/4)-1];    
        
        
        this.language.get_register_values()[parseInt(elements[1].substring(1), 10)] = f(value, addr);
        if (elements.length !=4){//No pre or post indexing if you take a label as input (no sense)
            if(elements[elements.length-1] == "!")//Pre-index: Case LDR R0, [R1, R2(, LSL #2)]!
                this.language.get_register_values()[parseInt(elements[4].substring(1), 10)] = addr;
            
            else if(elements[elements.length-1] != "]")//Post-index: Case LDR R0, [R1], R2 (, LSL #2)
                this.language.get_register_values()[parseInt(elements[4].substring(1), 10)] = this.language.post_index_solver(elements);
            
        }
        return nzcv;
    }
    to_hex(elems, line_index){
        //if elems[0] is not in ["STRH", "LDRH", "LDRSB", "LDRSH"]
        if( !["STRH", "LDRH", "LDRSB", "LDRSH"].includes(this.name)){
            return this.com_memory_hex(elems, line_index);
        }else{
            return this.xtra_memory_hex(elems, line_index);
        }
    }
    com_memory_hex(elems, line_index){
        let op_block = elems[0];
        let last_elem = elems[elems.length-1];
        //4 bits of conditions
        
        let bin = get_cond_bin(this.language, op_block);
        bin += "01";
        let L = elems[0][0] == "L";//STR or LDR
        let B = elems[0][elems[0].length-1] == "B"; //Act on byte or word
        let pre_indexing = last_elem == "!";
        let post_indexing = last_elem != "]" && !pre_indexing;
        
        let arg_is_label = elems.length ==4;
        let U = 0;
        let I = 0;
        let offset = 0;
        if(arg_is_label){
            offset = language.jmp_addr[elems[3]] - line_index*4-8;
            U = offset >= 0;
            I = true;
        }
        else{
            I =  elems.length == 6? true: elems[post_indexing?7:6][0]=="#";
            U = elems.length == 6? true:elems[post_indexing?7:6][I?1:0]!="-";
        }

        let P = !post_indexing;
        let W = pre_indexing;
    
        bin += I? "0":"1"; //Not I
        bin += P? "1":"0"; //P
        bin += U? "1":"0"; //U says if add or subtract offset
        bin += B? "1":"0"; //B
        bin += W? "1":"0"; //W
        bin += L? "1":"0"; //L
    
        //Rn
        bin += arg_is_label? "1111":  parseInt(elems[4].substring(1)).toString(2).padStart(4, "0");
    
        //Rd
        bin += parseInt(elems[1].substring(1)).toString(2).padStart(4, "0");
        //Offset
        if(arg_is_label){//label
            //Compute offset from PC
            offset = Math.abs(offset);
            bin += (offset/4).toString(2).padStart(12, "0");


        }else if(elems.length == 6){//No shift on base register
            bin += "000000000000";
        }
        else if(!I){
            if((elems.length-pre_indexing)%2 == 1){
                
                //shamt5
                let shamt5 = this.language.immediate_solver(elems[post_indexing?10:9]);
                bin += get_unsigned_value(shamt5).toString(2).padStart(5, "0");
                //sh
                bin += shift_to_sh[elems[post_indexing?9:8]];
            } else if((elems[elems.length-2-pre_indexing] == "RRX")||
            (elems[elems.length-1] == "RRX")){
                //shamt5
                bin += "00000"
                //sh
                bin += "11";

            }else{
                bin += "0000000";
            }
            //1
            bin += "0";
            //Rm
            bin += parseInt(elems[post_indexing?7:6].substring(1)).toString(2).padStart(4, "0");
        }else{
            //imm12
            let imm12 = this.language.immediate_solver(elems[post_indexing?7:6]);
            //abs
            imm12 = Math.abs(imm12);//abs because U already contains sign
            bin += imm12.toString(2).padStart(12, "0");
        }
        //Doing two 16 bit hex numbers to avoid overflows
        return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
                +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
    }
    xtra_memory_hex(elems, line_index){
        let op_block = elems[0];
        let last_elem = elems[elems.length-1];
        
        let bin = get_cond_bin(this.language, op_block);
        bin += "000";
    
        let L = elems[0][0] == "L";//STR or LDR
        let pre_indexing = last_elem == "!";
        let post_indexing = last_elem != "]" && !pre_indexing;
    
        let arg_is_label = elems.length ==4;
        let U = 0;
        let I = 0;
        let offset = 0;
        if(arg_is_label){
            offset = language.jmp_addr[elems[3]] - line_index*4-8;
            U = offset >= 0;
            I = true;
        }
        else{
            I =  elems.length == 6? true: elems[post_indexing?7:6][0]=="#";
            U = elems.length == 6? true:elems[post_indexing?7:6][I?1:0]!="-";
        }
        
        let P = !post_indexing;
        let W = pre_indexing;
    
        bin += P? "1":"0"; //P
        bin += U? "1":"0"; //U
        bin += I? "1":"0"; //I
        bin += W? "1":"0"; //W
        bin += L? "1":"0"; //L
    
        //Rn
        bin += arg_is_label? "1111":  parseInt(elems[4].substring(1)).toString(2).padStart(4, "0");
    
        //Rd
        bin += parseInt(elems[1].substring(1)).toString(2).padStart(4, "0");
        //Offset
        if(arg_is_label){//label
            //Compute offset from PC
            offset = Math.abs(offset)/4;
            bin += (offset>>4).toString(2).padStart(8, "0");
        }else if(elems.length == 6){
            bin += "0000";
        }else if(I){
            //imm8
            let imm8 = this.language.immediate_solver(elems[post_indexing?7:6]);
            //abs
            imm8 = Math.abs(imm8);
            bin += (imm8>>4).toString(2).padStart(4, "0");
        }else{
            bin += "0000";
        }
        bin+= "1";
        bin+= {"STRH": "01", "LDRH": "01", "LDRSB": "10", "LDRSH": "11"}[this.name];
        bin += "1";
        
        if(arg_is_label){//label
            //Compute offset from PC
            bin += (offset&0xF).toString(2).padStart(8, "0");
        }else if(elems.length == 6){
            bin += "0000";
        }else if(I==1){
            //imm8
            let imm8 = this.language.immediate_solver(elems[post_indexing?7:6]);
            //abs
            imm8 = Math.abs(imm8);
            
            bin += (imm8&0xF).toString(2).padStart(4, "0");
        }else{
            //Rm
            bin += parseInt(elems[post_indexing?7:6].substring(1+!U)).toString(2).padStart(4, "0");
        }
        
        //Doing two 16 bit hex numbers to avoid overflows
        return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
                +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
    }
}



class armv4_Operator_Lists{
    constructor(language){
        let jump_hex = (elems, line_index)=>{
            let op_block = elems[0];
            let bin = get_cond_bin(language, op_block);
            bin += "101";
            bin += elems[0]=="BL"?"1":"0";
            //24 bits of offset
            if(elems[1][0] == "#"){
                bin += get_unsigned_value((language.immediate_solver(elems[1])>>2)- line_index-2).toString(2).padStart(24, "0");
            }else{
                //label
                let offset = language.jmp_addr[elems[1]] - line_index*4-8;
                
                if(offset < 0){
                    offset += 2**26;
                }
                bin += (offset/4).toString(2).padStart(24, "0");
                
            }
            return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
                    +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
        }
        
        let mov_operator = new armv4_Data_proc_operator("MOV", [4,6,7], (a,b,s, nzcv)=>{ return b; }, "1101", language);

        let add_operator = new armv4_Data_proc_operator("ADD", [4,6,7, 9], (a,b,s, nzcv)=>{
            a = get_unsigned_value(a)
            b = get_unsigned_value(b)
            let sum = (a + b)&0xFFFFFFFF;
            if(!s) return sum;

            let a_31 = (a >> 31) & 1;
            let b_31 = (b >> 31) & 1;
            let res_31 = (sum >> 31) & 1;
            let res_32 = (a+b)>0xFFFFFFFF;
            
            nzcv[3] = !(a_31^b_31) && (a_31^res_31);
            nzcv[2] = res_32;
            
            return sum; 
        }, "0100", language);

        let adc_operator = new armv4_Data_proc_operator("ADC", [4,6,7, 9], (a,b,nzcv)=>{
            a = get_unsigned_value(a)
            b = get_unsigned_value(b)
            let sum = (a+b+C)&0xFFFFFFFF;
            if(!s) return sum;
            let a_31 = (a >> 31) & 1;
            let b_31 = (b >> 31) & 1;
            let res_31 = (sum >> 31) & 1;
            let res_32 = sum>0xFFFFFFFF;
            
            nzcv[3] = !(a_31^b_31) && (a_31^res_31);
            nzcv[2] = res_32;
            
            return sum; 
        }, "0101", language);

        let sub_operator = new armv4_Data_proc_operator("SUB", [4,6,7, 9], (a,b,s,nzcv)=>{ 
            a = get_unsigned_value(a)
            b = get_unsigned_value(b)
            let not_b = ~b;
            let sum = (a + not_b + 1)&0xFFFFFFFF;
            if(!s) return sum;
            let a_31 = (a >> 31) & 1;
            let b_31 = (b >> 31) & 1;
            let res_31 = (sum >> 31) & 1;
            let res_32 = a+get_unsigned_value(not_b)+1>0xFFFFFFFF;
            
            nzcv[3] = (a_31^b_31) & (a_31^res_31);
            nzcv[2] = res_32;
            return sum; 
        }, "0010", language);

        let rsub_operator = new armv4_Data_proc_operator("RSB", [4,6,7, 9], (a,b,s,nzcv)=>{ sub_operator.f(b,a,s)}, "0011");

        let sbc_operator = new armv4_Data_proc_operator("SBC", [4,6,7, 9], (a,b,s,nzcv)=>{
            a = get_unsigned_value(a)
            b = get_unsigned_value(b)
            let not_b = ~b;
            let sum = (a + not_b + 1 - C)&0xFFFFFFFF;
            if(!s)return sum; 
                
            let a_31 = (a >> 31) & 1;
            let b_31 = (b >> 31) & 1;
            let res_31 = (sum >> 31) & 1;
            let res_32 = a+get_unsigned_value(not_b)+1 - C>0xFFFFFFFF;
            
            nzcv[3] = (a_31^b_31) & (a_31^res_31);
            nzcv[2] = res_32;
            
            return sum; 
        }, "0110", language);

        let rsc_operator = new armv4_Data_proc_operator("RSC", [4,6,7, 9], (a,b,s,nzcv)=>{ sbc_operator.f(b,a,s)}, "0111", language);

        let mul_operator = new armv4_Mul_operator("MUL", [4,6], (a,b,s,nzcv)=>{return  (a*b)&0xFFFFFFFF;}, (a,b,c,d,s)=>{ return d; }, "000", language);

        //mla
        let mla_operator = new armv4_Mul_operator("MLA", [8], (a,b,c,d,s)=>{ return (b*c+d)&0xFFFFFFFF; }, (a,b,c,d,s)=>{ return d; }, "001", language);

        //smull
        let smull_operator = new armv4_Mul_operator("SMULL", [8], (a,b,c, d,s)=>{ return ((c*d)/0xFFFFFFFF)&0xFFFFFFFF; },
                                                    (a,b,c, d,s)=>{ return (c*d)&0xFFFFFFFF; }, "110", language);
        //smlal
        let smlal_operator=  new armv4_Mul_operator("SMLAL", [8], (a,b,c, d,s)=>{ return (((c*d+a)/0xFFFFFFFF)+b)&0xFFFFFFFF; },
                                                            (a,b,c, d,s)=>{ return (c*d+a)&0xFFFFFFFF; }, "111", language);

        //umull
        let umull_operator = new armv4_Mul_operator("UMULL", [8], (a,b,c,d,s)=>smull_operator.f( a, get_unsigned_value(b), get_unsigned_value(c), d, s),
                                                    (a,b,c,d ,s)=>smull_operator.g( a, get_unsigned_value(b), get_unsigned_value(c), d, s), "100", language);

        // umlal 
        let umlal_operator =  new armv4_Mul_operator("UMLAL", [8], (a,b,c,d,s)=>smlal_operator.f( a, get_unsigned_value(b), get_unsigned_value(c), d, s),
                                                        (a,b,c, d,s)=>smlal_operator.g( a, get_unsigned_value(b), get_unsigned_value(c), d, s), "101", language);

        let and_operator = new armv4_Data_proc_operator("AND", [4,6,7, 9], (a,b,s,nzcv)=>{ return a&b; }, "0000", language);

        let or_operator = new armv4_Data_proc_operator("ORR", [4,6,7,9], (a,b,s,nzcv)=>{ return a|b; }, "1100", language);

        let xor_operator = new armv4_Data_proc_operator("EOR", [4,6,7,9], (a,b,s,nzcv)=>{ return a^b; }, "0001", language);

        //lsl
        let lsl_operator = new armv4_Data_proc_operator("LSL", [4,6], (a,b,s,nzcv)=>{
            b &= 0xFF;
            if(b>31){
                return 0;
            }
            return a<<b;
        }, "1101", language);

        //lsr
        let lsr_operator = new armv4_Data_proc_operator("LSR", [4,6], (a,b,s,nzcv)=>{
            b &= 0xFF;
            if(b>31){
                return 0;
            }
            return a>>>b; 
        }, "1101", language);

        //asr
        let asr_operator = new armv4_Data_proc_operator("ASR", [4,6], (a,b,s,nzcv)=>{ 
            b &= 0xFF;
            if(b>31){
                return (a&0x80000000==1)?0xFFFFFFFF:0;
            }
        
            return a>>b; 
        }, "1101", language);
        
        //ror
        let ror_operator = new armv4_Data_proc_operator("ROR", [4,6], (a,b,s,nzcv)=>{ return (a>>>b) | (a<<(32-b)); }, "1101", language);
        
        //rrx
        let rrx_operator = new armv4_Data_proc_operator("RRX", [4], (a,b,s,nzcv)=>{ 
            if(s){C = a&1;}
            return (a>>>1) | (C<<31); 
        }, "1101", language);
        rrx_operator.immediate_ok = false;
        
        //bic
        let bic_operator = new armv4_Data_proc_operator("BIC", [4,6,7,9], (a,b,s,nzcv)=>{return get_unsigned_value(a)&(~get_unsigned_value(b)); }, "1110", language);
        //mvn
        let mvn_operator = new armv4_Data_proc_operator("MVN", [4,6,7,9], (a,b,s,nzcv)=>{ return ~b; }, "1111", language);

        
        //jump operator
        let b_operator = new armv4_Operator("B", [2], language);
        b_operator.takes_label = true;
        b_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<3 || language.check_conditional(elements[0].substring( 1, 3)))) return nzcv;
            language.did_a_jmp = true;
            if(elements[1] in language.jmp_addr){
                language.get_register_values()[15]=  language.jmp_addr[elements[1]];
            }else{
                language.get_register_values()[15] = language.immediate_solver(elements[1])*4 + 8;
            }
            return nzcv;
        }
        b_operator.to_hex = jump_hex;

        let bl_operator = new armv4_Operator("BL", [2], language);
        bl_operator.takes_label = true;
        bl_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<3 || language.check_conditional(elements[0].substring( 2, 4)))) return nzcv;
            language.did_a_jmp = true;
            
            let bckp = language.get_register_values()[15]+4;
            if(elements[1] in language.jmp_addr){
                language.get_register_values()[15] =  language.jmp_addr[elements[1]];
            }else{
                language.get_register_values()[15] += language.immediate_solver(elements[1])*4+8;
            }
            language.get_register_values()[14] = bckp;
            return nzcv;
        }
        bl_operator.to_hex = jump_hex;
        

        //str
        let str_operator = new armv4_Memory_operator("STR", (old_value, new_value, address) => new_value, language);
        

        //strb
        let strb_operator = new armv4_Memory_operator("STRB", (old_value, new_value, address) => {
            let byte = (new_value>>(8*(address%4)))&0xFF;
            return (old_value & ~(0xFF << (8*(addr%4)))) | (byte << (8*(addr%4)));
        }, language);

        //strh
        let strh_operator = new armv4_Memory_operator("STRH",  (old_value, new_value, address) => {
            return (old_value & ~(0xFFFF << (8*(address%4)))) | (new_value << (8*(address%4)));
        }, language);

        //ldr
        let ldr_operator = new armv4_Memory_operator("LDR", (value, address) => value, language);

        //ldrb
        let ldrb_operator = new armv4_Memory_operator("LDRB", (value, address) =>  (value>>(8*(address%4)))&0xFF, language);

        //ldrh
        let ldrh_operator = new armv4_Memory_operator("LDRH", (value, address) =>  (value>>(8*(address%4)))&0xFFFF, language);

        //ldrsb
        let ldrsb_operator = new armv4_Memory_operator("LDRSB",   (value, address) => {
            let byte = (value>>(8*(address%4)))&0xFF;
            return byte & 0x80 ? byte | 0xFFFFFF00 : byte;
        }, language);

        //ldrsh 
        let ldrsh_operator = new armv4_Memory_operator("LDRSH", (value, address) => {
            let byte = (value>>(8*(address%4)))&0xFFFF;
            return byte & 0x8000 ? byte | 0xFFFF0000 : byte;
        }, language);


        //tst
        let tst_operator = new armv4_Comp_operator("TST",  [4,7], (a,b,nzcv)=>{ return a&b; }, "1000", language);
        //teq 
        let teq_operator = new armv4_Comp_operator("TEQ",  [4,7], (a,b,nzcv)=>{ return a^b; }, "1001", language);
        //cmp
        let cmp_operator = new armv4_Comp_operator("CMP",  [4,7], (a,b,nzcv)=>{ return sub_operator.f(a,b,1,nzcv); } , "1010", language);
        //cmn
        let cmn_operator = new armv4_Comp_operator("CMN",  [4,7], (a,b,nzcv)=>{ return add_operator.f(a,b,1,nzcv); }, "1011", language);
        
        //push
        let push_operator = new armv4_Operator("PUSH",  Array.from({ length: 31 }, (_, index) => index + 4), language);
        push_operator.execute_line = (elements, nzcv)=>{
            if(elements[0].length!=4 && !language.check_conditional(elements[0].substring( elements[0].length-2))) return nzcv;
   
            let regs = reg_list_to_bool_array(elements.slice(2, -1));
            //Count how many true in regs
            let registers = 0;
            for(let i = 0; i < 16; i++)
                if(regs[i]) registers++;
            

            for(let i = 0; i < 15; i++)
                if(regs[14-i])
                    language.get_stack().push(language.get_register_values()[14-i]);

            if(regs[15])
                language.get_stack().push(language.get_register_values()[15]+8);
            
            language.get_register_values()[13] -= registers*4;

            return nzcv;}
        push_operator.to_hex = (elems, line_index)=>{
            let op_block = elems[0];
            let bin = get_cond_bin(language, op_block);
            if(elems.length ==4){//only one register in list
                bin += "010100101101"
                bin += parseInt(elems[2].substring(1), 10).toString(2).padStart(4, "0");
                bin += "000000000100";
            }else{
                bin += "100100101101"
                //parse register list
                    
                let reg_list = elems.slice(2, -1);
                let to_push_regs = reg_list_to_bool_array(reg_list);
                let reg_list_bin = "";
                for(let i = 0; i < 16; i++)
                    reg_list_bin += to_push_regs[15-i]? "1":"0";
                
                bin += parseInt(reg_list_bin, 2).toString(2).padStart(16, "0");
            }
            
            return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
            +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
        }

        //pop
        let pop_operator = new armv4_Operator("POP",  Array.from({ length: 31 }, (_, index) => index + 4), language);
        pop_operator.execute_line = (elems, nzcv)=>{
            if(elems[0].length!=3 && !language.check_conditional(elems[0].substring( elems[0].length-2))) return nzcv;
           
            let regs = reg_list_to_bool_array(elems.slice(2, -1));
            //Count how many true in regs
            let registers = 0;
            for(let i = 0; i < 16; i++)
                if(regs[i]) registers++;
            
            for(let i = 0; i < 16; i++)
                if(regs[i])
                    language.get_register_values()[i]  = language.get_stack().pop();

            language.get_register_values()[13] += registers*4;
            return nzcv;}
        pop_operator.to_hex = (elems, line_index)=>{
            let op_block = elems[0];
            let bin = get_cond_bin(language, op_block);
            if(elems.length ==4){//only one register in list
                bin += "010010011101"
                bin += parseInt(elems[2].substring(1), 10).toString(2).padStart(4, "0");
                bin += "000000000100";
            }else{
                bin += "100010111101"
                //parse register list
                
                let reg_list = elems.slice(2, -1);
                let to_push_regs = reg_list_to_bool_array(reg_list);
                let reg_list_bin = "";
                for(let i = 0; i < 16; i++)
                    reg_list_bin += to_push_regs[15-i]? "1":"0";
                
                bin += parseInt(reg_list_bin, 2).toString(2).padStart(16, "0");
            }

            return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
            +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
        }
        let ldm_to_hex = (elems, line_index)=>{
            let op_block = elems[0];
            
            let bin = get_cond_bin(this.language, op_block);
            
            bin += "100010"
            bin += elems[2]=="!"? "1":"0";
            bin += "1";
            bin += elems[1].substring(1).toString(2).padStart(4, "0");
            //parse register list
            let reg_list = elems.slice(2, -1);
            let to_push_regs = reg_list_to_bool_array(reg_list);
            
            let reg_list_bin = "";
            for(let i = 0; i < 16; i++)
                reg_list_bin += to_push_regs[15-i]? "1":"0";
            
            bin += parseInt(reg_list_bin, 2).toString(2).padStart(16, "0");
            

            return parseInt(bin.substring(0,16), 2).toString(16).padStart(4, "0").toUpperCase()
            +parseInt(bin.substring(16), 2).toString(16).padStart(4, "0").toUpperCase();
        }
        //LDM
        let ldm_operator = new armv4_Operator("LDM",  Array.from({ length: 32 }, (_, index) => index + 5), language);
        ldm_operator.execute_line = (elements, nzcv)=>{
            throw new Error("LDM exection not yet implemented");
            return nzcv;}
        ldm_operator.to_hex = ldm_to_hex;
        
        //LDMIA is the same as LDM so just copy it
        let ldmia_operator = new armv4_Operator("LDMIA",  Array.from({ length: 32 }, (_, index) => index + 5), language);
        ldmia_operator.execute_line = (elements, nzcv)=>{
            throw new Error("LDMIA exection not yet implemented");
            return nzcv;}
        ldmia_operator.to_hex = ldm_to_hex;
        //LDMFD is the same as LDM so just copy it
        let ldmfd_operator = new armv4_Operator("LDMFD",  Array.from({ length: 32 }, (_, index) => index + 5), language);
        ldmfd_operator.execute_line = (elements, nzcv)=>{
            throw new Error("LDMFD exection not yet implemented");
            return nzcv;}
        ldmfd_operator.to_hex = ldm_to_hex;
        

        //nop
        let nop_operator = new armv4_Operator("NOP",  [1], language);
        nop_operator.execute_line = (elements, nzcv)=>{return nzcv;};
        nop_operator.to_hex = (elements, line_index)=>{
            return parseInt(get_cond_bin(language, elements[0]),2).toString(16).toUpperCase()+"1A00000";
        };

        //.word will be considered as an operator by simplicity
        let word_operator = new armv4_Operator(".WORD",  [2], language);
        word_operator.execute_line = (elements, nzcv)=>{
            throw "Word operator should not be executed, will lead to error in true implementation";
            return nzcv;};
        word_operator.to_hex = (elements, line_index)=>{
            return parseInt(elements[1], 16).toString(16).toUpperCase().padStart(8, "0");
        };
        this.operators = [word_operator,
                          nop_operator,
                          mov_operator,
                          add_operator, 
                          adc_operator,
                          sub_operator, 
                          rsub_operator, 
                          mul_operator, 
                          and_operator,
                          or_operator, 
                          xor_operator, 
                          bic_operator,
                          bl_operator,
                          b_operator, 
                          ldrh_operator,
                          ldrsb_operator, 
                          ldrsh_operator,
                          strh_operator,
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
                          mla_operator,
                          push_operator,
                          pop_operator,
                          ldm_operator,
                          ldmia_operator,
                          ldmfd_operator,];

        this.conds =[ new armv4_Condition ("EQ", (N,Z,C,V)=>{return Z;}, "0000"),
                      new armv4_Condition ("NE", (N,Z,C,V)=>{return !Z;}, "0001"),
                      new armv4_Condition ("CS", (N,Z,C,V)=>{return C;}, "0010"),
                      new armv4_Condition ("CC", (N,Z,C,V)=>{return !C;}, "0011"),
                      new armv4_Condition ("HS", (N,Z,C,V)=>{return C;}, "0010"),
                      new armv4_Condition ("LO", (N,Z,C,V)=>{return !C;}, "0011"),
                      new armv4_Condition ("MI", (N,Z,C,V)=>{return N;}, "0100"),
                      new armv4_Condition ("PL", (N,Z,C,V)=>{return !N;}, "0101"),
                      new armv4_Condition ("VS", (N,Z,C,V)=>{return V;}, "0110"),
                      new armv4_Condition ("VC", (N,Z,C,V)=>{return !V;}, "0111"),
                      new armv4_Condition ("HI", (N,Z,C,V)=>{return C && !Z;}, "1000"),
                      new armv4_Condition ("LS", (N,Z,C,V)=>{return !C || Z;}, "1001"),
                      new armv4_Condition ("GE", (N,Z,C,V)=>{return N == V;}, "1010"),
                      new armv4_Condition ("LT", (N,Z,C,V)=>{return N != V;}, "1011"),
                      new armv4_Condition ("GT", (N,Z,C,V)=>{return !Z && (N == V);}, "1100"),
                      new armv4_Condition ("LE", (N,Z,C,V)=>{return Z || (N != V);}, "1101"),
                      new armv4_Condition ("AL", (N,Z,C,V)=>{return true;}, "1110"),
        ];
    };
    get_operators(){
        return this.operators;
    };
    get_conds(){
        return this.conds;
    };
};

module.exports = armv4_Operator_Lists;
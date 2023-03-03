class armv4_Operator{
    constructor(name, n_args){
        this.name = name;
        this.n_char = name.length;
        this.execute_line;
        this.n_arg = n_args;
        this.immediate_ok = false;
        this.address_arg = false;
        this.takes_label = false;
    }
}

class armv4_Data_proc_operator extends armv4_Operator{
    constructor(name, n_args, f){
        super(name, n_args)
        this.immediate_ok = true;
        this.f = f;
        this.execute_line = (elements, nzcv)=>{
            //check if commend of the form XXXS
            let s = elements[0][3]== "S";
            if(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 3+s, s+5))){
                let source = (+( elements.length == 6 || elements.length == 8||elements.length == 9))*2;
             
                let right_operand = armv4_immediate_solver(elements[3+source]);
      
                
                if(elements[elements.length-1] == "RRX"){
                    right_operand = ((right_operand>>>1) | (C<<31));
                }else if(elements.length == 9 || elements.length == 7){
                    let shift = armv4_immediate_solver(elements[elements.length-1]);
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
                language.get_register_values()[[parseInt(elements[1].substring(1))]] = f(armv4_get_register_value(elements[1+source]), right_operand, s);
                
                if(s){
                    nzcv[0] = (armv4_get_register_value(elements[1]) >> 31)&1;
                    nzcv[1] = armv4_get_register_value(elements[1]) == 0;
                }
            }
            return nzcv;
        };
    }
}

class armv4_Mul_operator extends armv4_Operator{
    constructor(name, n_args, f, g){
        super(name, n_args)
        this.f = f;
        this.g = g;
        this.execute_line = (elements, nzcv)=>{
            //check if commend of the form XXXS
            let s = elements[0][3]== "S";
            if(!(elements[0].length<6 || armv4_check_conditional(elements[0].substring( 3+s, s+5)))) return nzcv;
     
            if(s){
                nzcv[2] = 0;
                nzcv[3] = 0;
            }
            let low_bits = f(armv4_get_register_value(elements[1]), 
            armv4_get_register_value(elements[3]), 
            armv4_immediate_solver(elements[5]),
            armv4_immediate_solver(elements[7]), s);
            let high_bits = g(armv4_get_register_value(elements[1]), 
            armv4_get_register_value(elements[3]), 
            armv4_immediate_solver(elements[5]),
            armv4_immediate_solver(elements[7]), s);
            register[[parseInt(elements[1].substring(1))]] = low_bits;
            register[[parseInt(elements[3].substring(1))]] = high_bits;
            
            if(!s) return nzcv;
            nzcv[0] = (armv4_get_register_value(elements[1]) >> 31)&1;
            nzcv[1] = armv4_get_register_value(elements[1]) == 0;
            return nzcv;
            
        };
    }
}

class armv4_Comp_operator extends armv4_Operator{
    constructor(name, n_args, f){
        super(name, n_args)
        this.f = f;
        this.immediate_ok = true;
        this.execute_line = (elements, nzcv)=>{
            //check if commend of the form XXXS
            if(!(elements[0].length<4 || armv4_check_conditional(elements[0].substring( 3, 5)))) return nzcv;
            nzcv[2] = 0;
            nzcv[3] = 0;
            let value = f(armv4_get_register_value(elements[1]), armv4_immediate_solver(elements[3]));
            
            nzcv[0] = (value >> 31)&1;
            nzcv[1] = value == 0;
            return nzcv;
        };
    }
}

class armv4_Condition{
    constructor(name, f){
        this.name = name;
        this.f = f;
    }
}
class armv4_Operator_Lists{
    constructor(){
        let mov_operator = new armv4_Data_proc_operator("MOV", [4,6,7], (a,b,s)=>{ return b; });

        let add_operator = new armv4_Data_proc_operator("ADD", [4,6,8, 9], (a,b,s)=>{
            
            let sum = (get_unsigned_value(a)+get_unsigned_value(b))&0xFFFFFFFF;
            if(!s) return sum;

            let a_31 = (a >> 31) & 1;
            let b_31 = (b >> 31) & 1;
            let res_32 = (a+b)>0xFFFFFFFF;
            
            language.register[19] = !(a_31^b_31) && (a_31^res_32);
            language.register[18] = res_32;
            
            return sum; 
        });

        let adc_operator = new armv4_Data_proc_operator("ADC", [4,6,8, 9], (a,b,s)=>{
            let sum = a+b+C;
            if(!s) return sum;
            let a_31 = (a >> 31) & 1;
            let b_31 = (b >> 31) & 1;
            let res_32 = sum>0xFFFFFFFF;
            
            language.register[19] = !(a_31^b_31) && (a_31^res_32);
            language.register[18] = res_32;
            
            return sum; 
        });

        let sub_operator = new armv4_Data_proc_operator("SUB", [4,6,8, 9], (a,b,s)=>{ 
            let not_b = ~b;
            let sum = a + not_b + 1;
            if(!s) return sum;
                
            let a_31 = (a >> 31) & 1;
            let b_31 = (b >> 31) & 1;
            let res_32 = a+get_unsigned_value(not_b)+1>0xFFFFFFFF;
            
            language.register[19] = (a_31^b_31) & (a_31^res_32);
            language.register[18] = res_32;
            
            return sum; 
        });

        let rsub_operator = new armv4_Data_proc_operator("RSB", [4,6,8, 9], (a,b,s)=>{ sub_operator.f(b,a,s)});

        let sbc_operator = new armv4_Data_proc_operator("SBC", [4,6,8, 9], (a,b,s)=>{
            let not_b = ~b;
            let sum = a + not_b + 1;
            if(!s)return sum; 
                
            let a_31 = (a >> 31) & 1;
            let b_31 = (b >> 31) & 1;
            let res_32 = a+get_unsigned_value(not_b)+1>0xFFFFFFFF;
            
            language.register[19] = (a_31^b_31) & (a_31^res_32);
            language.register[18] = res_32;
            
            return sum; 
        });

        let rsc_operator = new armv4_Data_proc_operator("RSC", [4,6,8, 9], (a,b,s)=>{ sbc_operator.f(b,a,s)});

        let mul_operator = new armv4_Data_proc_operator("MUL", [4,6], (a,b,s)=>{return  (a*b)&0xFFFFFFFF;});

        //mla
        let mla_operator = new armv4_Mul_operator("MLA", [8], (a,b,c,d,s)=>{ return (b*c+d)&0xFFFFFFFF; }, (a,b,c,d,s)=>{ return d; });

        //smull
        let smull_operator = new armv4_Mul_operator("SMULL", [8], (a,b,c, d,s)=>{ return ((c*d)/0xFFFFFFFF)&0xFFFFFFFF; },
                                                    (a,b,c, d,s)=>{ return (c*d)&0xFFFFFFFF; });
        //smlal
        let smlal_operator=  new armv4_Mul_operator("SMLAL", [8], (a,b,c, d,s)=>{ return (((c*d+a)/0xFFFFFFFF)+b)&0xFFFFFFFF; },
                                                            (a,b,c, d,s)=>{ return (c*d+a)&0xFFFFFFFF; });

        //umull
        let umull_operator = new armv4_Mul_operator("UMULL", [8], (a,b,c,d,s)=>smull_operator.f( a, get_unsigned_value(b), get_unsigned_value(c), d, s),
                                                    (a,b,c,d ,s)=>smull_operator.g( a, get_unsigned_value(b), get_unsigned_value(c), d, s));

        // umlal 
        let umlal_operator =  new armv4_Mul_operator("UMLAL", [8], (a,b,c,d,s)=>smlal_operator.f( a, get_unsigned_value(b), get_unsigned_value(c), d, s),
                                                        (a,b,c, d,s)=>smlal_operator.g( a, get_unsigned_value(b), get_unsigned_value(c), d, s));

        let and_operator = new armv4_Data_proc_operator("AND", [4,6,8, 9], (a,b,s)=>{ return a&b; });

        let or_operator = new armv4_Data_proc_operator("ORR", [4,6,8,9], (a,b,s)=>{ return a|b; });

        let xor_operator = new armv4_Data_proc_operator("EOR", [4,6,8,9], (a,b,s)=>{ return a^b; });

        //lsl
        let lsl_operator = new armv4_Data_proc_operator("LSL", [4,6,8,9], (a,b,s)=>{ return a<<b; });
        //lsr
        let lsr_operator = new armv4_Data_proc_operator("LSR", [4,6,8,9], (a,b,s)=>{ return a>>>b; });
        //asr
        let asr_operator = new armv4_Data_proc_operator("ASR", [4,6,8,9], (a,b,s)=>{ return a>>b; });
        //ror
        let ror_operator = new armv4_Data_proc_operator("ROR", [4,6,8,9], (a,b,s)=>{ return (a>>>b) | (a<<(32-b)); });
        //rrx
        let rrx_operator = new armv4_Data_proc_operator("RRX", [4,6,8,9], (a,b,s)=>{ 
            if(s){C = a&1;}
            return (a>>>1) | (C<<31); 
        });
        //bic
        let bic_operator = new armv4_Data_proc_operator("BIC", [4,6,8,9], (a,b,s)=>{return a&(~b); });
        //mvn
        let mvn_operator = new armv4_Data_proc_operator("MVN", [4,6,8,9], (a,b,s)=>{ return ~b; });


        //jump operator
        let b_operator = new armv4_Operator("B", [2]);
        b_operator.takes_label = true;
        b_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<3 ||armv4_check_conditional(elements[0].substring( 1, 3)))) return nzcv;
            language.did_a_jmp = true;
            if(elements[1] in jmp_addr){
                language.get_register_values()[15]=  jmp_addr[elements[1]];
            }else{
                language.get_register_values()[15] += armv4_immediate_solver(elements[1])*4 + 8;
            }
            return nzcv;
        }

        let bl_operator = new armv4_Operator("BL", [2]);
        bl_operator.takes_label = true;
        bl_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<3 ||armv4_check_conditional(elements[0].substring( 2, 4)))) return nzcv;
            language.did_a_jmp = true;
            
            let bckp = language.get_register_values()[15]+4;
            if(elements[1] in jmp_addr){
                language.get_register_values()[15] =  jmp_addr[elements[1]];
            }else{
                language.get_register_values()[15] += armv4_immediate_solver(elements[1])*4+8;
            }
            language.get_register_values()[14] = bckp;
            return nzcv;
        }

        //str
        let str_operator = new armv4_Operator("STR",  [6,8, 11]);
        str_operator.immediate_ok = true;
        str_operator.address_arg = true;
        str_operator.execute_line = (elements, nzcv)=>{
            //Should the operation be executed?
            if(!(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 3, 5)))) return nzcv;
            
            let addr= armv4_address_solver(elements);
            if(addr<register[13])
                ram[Math.floor(addr/4)] = armv4_get_register_value(elements[1]);
            else
                stack[stack_beg/4-Math.floor(addr/4)] = armv4_get_register_value(elements[1]);
            return nzcv;
        };

        //strb
        let strb_operator = new armv4_Operator("STRB",  [6,8, 10,11]);
        strb_operator.immediate_ok = true;
        strb_operator.address_arg = true;
        strb_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 4, 6)))) return nzcv;
            let addr= armv4_address_solver(elements);
            //put get_register_value(elements[1])>>(8*(addr%4)) fist byte in byte addr%4 of ram[addr/4]
            let byte = (armv4_get_register_value(elements[1])>>(8*(addr%4)))&0xFF
            if(addr<register[13])
                ram[Math.floor(addr/4)] = (ram[Math.floor(addr/4)] & ~(0xFF << (8*(addr%4)))) | (byte << (8*(addr%4)));
            else
                stack[stack_beg/4-Math.floor(addr/4)] = (stack[stack_beg/4-Math.floor(addr/4)] & ~(0xFF << (8*(addr%4)))) | (byte << (8*(addr%4)));
            return nzcv;    
        }

        //strh
        let strh_operator = new armv4_Operator("STRH",  [6,8, 10,11]);
        strh_operator.immediate_ok = true;
        strh_operator.address_arg = true;
        strh_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 4, 6)))) return nzcv;
            let addr= armv4_address_solver(elements);
            if(addr<register[13])
                ram[Math.floor(addr/4)] = (ram[Math.floor(addr/4)] & ~(0xFFFF << (8*(addr%4)))) | (armv4_get_register_value(elements[1]) << (8*(addr%4)));
            else
                stack[stack_beg/4-Math.floor(addr/4)] = (stack[stack_beg/4-Math.floor(addr/4)] & ~(0xFFFF << (8*(addr%4)))) | (armv4_get_register_value(elements[1]) << (8*(addr%4)));
            return nzcv;
        }

        //ldr
        let ldr_operator = new armv4_Operator("LDR",  [6,8, 10,11]);
        ldr_operator.immediate_ok = true;
        ldr_operator.address_arg = true;
        ldr_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 3, 5)))) return;
            let addr = Math.floor(armv4_address_solver(elements)/4) 
            if(addr<register[13])
                register[[parseInt(elements[1].substring(1))]] = ram[addr];
            else
                register[[parseInt(elements[1].substring(1))]] = stack[stack_beg/4-addr] 
            return nzcv;
        };

        //ldrb
        let ldrb_operator = new armv4_Operator("LDRB",  [6,8, 10,11]);
        ldrb_operator.immediate_ok = true;
        ldrb_operator.address_arg = true;
        ldrb_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 4, 6)))) return nzcv;
            let addr= armv4_address_solver(elements);
            if(addr<register[13])
                register[[parseInt(elements[1].substring(1))]] = (ram[Math.floor(addr/4)]>>(8*(addr%4)))&0xFF;
            else
                register[[parseInt(elements[1].substring(1))]] = (stack[stack_beg/4-addr]>>(8*(addr%4)))&0xFF;
            return nzcv
        }

        //ldrh
        let ldrh_operator = new armv4_Operator("LDRH",  [6,8, 10,11]);
        ldrh_operator.immediate_ok = true;
        ldrh_operator.address_arg = true;
        ldrh_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 4, 6)))) return nzcv;
            let addr= armv4_address_solver(elements);
            if(addr<register[13])
                register[[parseInt(elements[1].substring(1))]] = (ram[Math.floor(addr/4)]>>(8*(addr%4)))&0xFFFF;
            else
                register[[parseInt(elements[1].substring(1))]] = (stack[stack_beg/4-addr]>>(8*(addr%4)))&0xFFFF;
            return nzcv;
        }

        //ldrsb
        let ldrsb_operator = new armv4_Operator("LDRSB",  [6,8, 10,11]);
        ldrsb_operator.immediate_ok = true;
        ldrsb_operator.address_arg = true;
        ldrsb_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 5, 7)))) return nzcv;
            let addr= armv4_address_solver(elements);
            if(addr<register[13])
                register[[parseInt(elements[1].substring(1))]] = (ram[Math.floor(addr/4)]>>(8*(addr%4)))&0xFF;
            else
                register[[parseInt(elements[1].substring(1))]] = (stack[stack_beg/4-addr]>>(8*(addr%4)))&0xFF;
            if(register[[parseInt(elements[1].substring(1))]]>127)
                register[[parseInt(elements[1].substring(1))]] = register[[parseInt(elements[1].substring(1))]] | 0xFFFFFF00;
            return nzcv;
        }

        //ldrsh 
        let ldrsh_operator = new armv4_Operator("LDRSH",  [6,8, 10,11]);
        ldrsh_operator.immediate_ok = true;
        ldrsh_operator.address_arg = true;
        ldrsh_operator.execute_line = (elements, nzcv)=>{
            if(!(elements[0].length<5 || armv4_check_conditional(elements[0].substring( 5, 7)))) return nzcv;
            let addr= armv4_address_solver(elements);
            if(addr<register[13])
                register[[parseInt(elements[1].substring(1))]] = (ram[Math.floor(addr/4)]>>(8*(addr%4)))&0xFFFF;
            else
                register[[parseInt(elements[1].substring(1))]] = (stack[stack_beg/4-addr]>>(8*(addr%4)))&0xFFFF;
            if(register[[parseInt(elements[1].substring(1))]]>32767)
                register[[parseInt(elements[1].substring(1))]] = register[[parseInt(elements[1].substring(1))]] | 0xFFFF0000;
            return nzcv;
        }


        //tst
        let tst_operator = new armv4_Comp_operator("TST",  [4, 6,7], (a,b)=>{ return a&b; });
        //teq 
        let teq_operator = new armv4_Comp_operator("TEQ",  [4, 6,7], (a,b)=>{ return a^b; });
        //cmp
        let cmp_operator = new armv4_Comp_operator("CMP",  [4, 6,7], (a,b)=>{ return sub_operator.f(a,b,1); });
        //cmn
        let cmn_operator = new armv4_Comp_operator("CMN",  [4, 6,7], (a,b)=>{ return add_operator.f(a,b,1); });

        //nop
        let nop_operator = new armv4_Operator("NOP",  [0]);
        nop_operator.execute_line = (elements, nzcv)=>{return nzcv;}


        this.operators = [nop_operator,
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
                          mla_operator];

        this.conds =[ new armv4_Condition ("EQ", (N,Z,C,V)=>{return Z;}),
                      new armv4_Condition ("NE", (N,Z,C,V)=>{return !Z;}),
                      new armv4_Condition ("CS", (N,Z,C,V)=>{return C;}),
                      new armv4_Condition ("CC", (N,Z,C,V)=>{return !C;}),
                      new armv4_Condition ("HS", (N,Z,C,V)=>{return C;}),
                      new armv4_Condition ("LO", (N,Z,C,V)=>{return !C;}),
                      new armv4_Condition ("MI", (N,Z,C,V)=>{return N;}),
                      new armv4_Condition ("PL", (N,Z,C,V)=>{return !N;}),
                      new armv4_Condition ("VS", (N,Z,C,V)=>{return V;}),
                      new armv4_Condition ("VC", (N,Z,C,V)=>{return !V;}),
                      new armv4_Condition ("HI", (N,Z,C,V)=>{return C && !Z;}),
                      new armv4_Condition ("LS", (N,Z,C,V)=>{return !C || Z;}),
                      new armv4_Condition ("GE", (N,Z,C,V)=>{return N == V;}),
                      new armv4_Condition ("LT", (N,Z,C,V)=>{return N != V;}),
                      new armv4_Condition ("GT", (N,Z,C,V)=>{return !Z && (N == V);}),
                      new armv4_Condition ("LE", (N,Z,C,V)=>{return Z || (N != V);}),
                      new armv4_Condition ("AL", (N,Z,C,V)=>{return true;})
        ]
    }
    get_operators(){
        return this.operators;
    }
    get_conds(){
        return this.conds;
    }
}
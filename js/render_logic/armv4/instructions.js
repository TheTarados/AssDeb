class Operator{
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

class Data_proc_operator extends Operator{
    constructor(name, n_args, f){
        super(name, n_args)
        this.immediate_ok = true;
        this.f = f;
        this.execute_line = (elements)=>{
            //check if commend of the form XXXS
            let s = elements[0][3]== "S";
            if(elements[0].length<5 || check_conditional(elements[0].substring( 3+s, s+5))){
                let source = (+( elements.length == 6 || elements.length == 8||elements.length == 9))*2;
             
                let right_operand = immediate_solver(elements[3+source]);
      
                
                if(elements[elements.length-1] == "RRX"){
                    right_operand = ((right_operand>>>1) | (C<<31));
                }else if(elements.length == 9 || elements.length == 7){
                    let shift = immediate_solver(elements[elements.length-1]);
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
                    C = 0;
                    V = 0;
                }
                register[[parseInt(elements[1].substring(1))]] = f(get_register_value(elements[1+source]), right_operand, s);
                
                if(s){
                    N = (get_register_value(elements[1]) >> 31)&1;
                    Z = get_register_value(elements[1]) == 0;
                }
            }
        };
    }
}

class Mul_operator extends Operator{
    constructor(name, n_args, f, g){
        super(name, n_args)
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
            get_register_value(elements[3]), 
            immediate_solver(elements[5]),
            immediate_solver(elements[7]), s);
            let high_bits = g(get_register_value(elements[1]), 
            get_register_value(elements[3]), 
            immediate_solver(elements[5]),
            immediate_solver(elements[7]), s);
            register[[parseInt(elements[1].substring(1))]] = low_bits;
            register[[parseInt(elements[3].substring(1))]] = high_bits;
            
            if(!s) return;
            N = (get_register_value(elements[1]) >> 31)&1;
            Z = get_register_value(elements[1]) == 0;
                
            
        };
    }
}

class Comp_operator extends Operator{
    constructor(name, n_args, f){
        super(name, n_args)
        this.f = f;
        this.execute_line = (elements)=>{
            //check if commend of the form XXXS
            if(!(elements[0].length<4 || check_conditional(elements[0].substring( 3, 5)))) return;
            C = 0;
            V = 0;
            let value = f(get_register_value(elements[1]), immediate_solver(elements[3]));
            
            N = (value >> 31)&1;
            Z = value == 0;
        };
    }
}

let mov_operator = new Data_proc_operator("MOV", [4,6,7], (a,b,s)=>{ return b; });

let add_operator = new Data_proc_operator("ADD", [4,6,8, 9], (a,b,s)=>{
    let sum = a+b;
    if(!s) return sum;

    let a_31 = (a >> 31) & 1;
    let b_31 = (b >> 31) & 1;
    let res_32 = sum>0xFFFFFFFF;
    
    V = !(a_31^b_31) && (a_31^res_32);
    C = res_32;
    
    return sum; 
});

let adc_operator = new Data_proc_operator("ADC", [4,6,8, 9], (a,b,s)=>{
    let sum = a+b+C;
    if(!s) return sum;
    let a_31 = (a >> 31) & 1;
    let b_31 = (b >> 31) & 1;
    let res_32 = sum>0xFFFFFFFF;
    
    V = !(a_31^b_31) && (a_31^res_32);
    C = res_32;
    
    return sum; 
});

let sub_operator = new Data_proc_operator("SUB", [4,6,8, 9], (a,b,s)=>{ 
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

let rsub_operator = new Data_proc_operator("RSB", [4,6,8, 9], (a,b,s)=>{ sub_operator.f(b,a,s)});

let sbc_operator = new Data_proc_operator("SBC", [4,6,8, 9], (a,b,s)=>{
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
let rsc_operator = new Data_proc_operator("RSC", [4,6,8, 9], (a,b,s)=>{ sbc_operator.f(b,a,s)});

let mul_operator = new Data_proc_operator("MUL", [4,6], (a,b,s)=>{return  (a*b)&0xFFFFFFFF;});

//mla
let mla_operator = new Mul_operator("MLA", [8], (a,b,c,d,s)=>{ return (b*c+d)&0xFFFFFFFF; }, (a,b,c,d,s)=>{ return d; });

function get_unsigned_value(x){
    return (x>>>1)*2+(x&1)
}

//smull
let smull_operator = new Mul_operator("SMULL", [8], (a,b,c, d,s)=>{ return ((c*d)/0xFFFFFFFF)&0xFFFFFFFF; },
                                             (a,b,c, d,s)=>{ return (c*d)&0xFFFFFFFF; });
//smlal
let smlal_operator=  new Mul_operator("SMLAL", [8], (a,b,c, d,s)=>{ return (((c*d+a)/0xFFFFFFFF)+b)&0xFFFFFFFF; },
                                                    (a,b,c, d,s)=>{ return (c*d+a)&0xFFFFFFFF; });

//umull
let umull_operator = new Mul_operator("UMULL", [8], (a,b,c,d,s)=>smull_operator.f( a, get_unsigned_value(b), get_unsigned_value(c), d, s),
                                             (a,b,c,d ,s)=>smull_operator.g( a, get_unsigned_value(b), get_unsigned_value(c), d, s));

// umlal 
let umlal_operator =  new Mul_operator("UMLAL", [8], (a,b,c,d,s)=>smlal_operator.f( a, get_unsigned_value(b), get_unsigned_value(c), d, s),
                                                (a,b,c, d,s)=>smlal_operator.g( a, get_unsigned_value(b), get_unsigned_value(c), d, s));



let and_operator = new Data_proc_operator("AND", [4,6,8, 9], (a,b,s)=>{ return a&b; });

let or_operator = new Data_proc_operator("ORR", [4,6,8,9], (a,b,s)=>{ return a|b; });

let xor_operator = new Data_proc_operator("EOR", [4,6,8,9], (a,b,s)=>{ return a^b; });

//lsl
let lsl_operator = new Data_proc_operator("LSL", [4,6,8,9], (a,b,s)=>{ return a<<b; });
//lsr
let lsr_operator = new Data_proc_operator("LSR", [4,6,8,9], (a,b,s)=>{ return a>>>b; });
//asr
let asr_operator = new Data_proc_operator("ASR", [4,6,8,9], (a,b,s)=>{ return a>>b; });
//ror
let ror_operator = new Data_proc_operator("ROR", [4,6,8,9], (a,b,s)=>{ return (a>>>b) | (a<<(32-b)); });
//rrx
let rrx_operator = new Data_proc_operator("RRX", [4,6,8,9], (a,b,s)=>{ 
    if(s){C = a&1;}
    return (a>>>1) | (C<<31); 
});
//bic
let bic_operator = new Data_proc_operator("BIC", [4,6,8,9], (a,b,s)=>{return a&(~b); });
//mvn
let mvn_operator = new Data_proc_operator("MVN", [4,6,8,9], (a,b,s)=>{ return ~b; });


//jump operator
let b_operator = new Operator("B", [2]);
b_operator.takes_label = true;
b_operator.execute_line = (elements)=>{
    if(!(elements[0].length<3 ||check_conditional(elements[0].substring( 1, 3)))) return;
    did_a_jmp = true;
    if(elements[1] in jmp_addr){
        register[15]=  jmp_addr[elements[1]];
    }else{
        register[15] = immediate_solver(elements);
    }
    
}

//str
let str_operator = new Operator("STR",  [6,8, 11]);
str_operator.immediate_ok = true;
str_operator.address_arg = true;
str_operator.execute_line = (elements)=>{
    //Should the operation be executed?
    if(!(elements[0].length<5 || check_conditional(elements[0].substring( 3, 5)))) return;
    
    let addr= address_solver(elements);
    if(addr<register[13])
        ram[Math.floor(addr/4)] = get_register_value(elements[1]);
    else
        stack[stack_beg/4-Math.floor(addr/4)] = get_register_value(elements[1]);
    
};

//strb
let strb_operator = new Operator("STRB",  [6,8, 10,11]);
strb_operator.immediate_ok = true;
strb_operator.address_arg = true;
strb_operator.execute_line = (elements)=>{
    if(!(elements[0].length<5 || check_conditional(elements[0].substring( 4, 6)))) return;
    let addr= address_solver(elements);
    //put get_register_value(elements[1])>>(8*(addr%4)) fist byte in byte addr%4 of ram[addr/4]
    let byte = (get_register_value(elements[1])>>(8*(addr%4)))&0xFF
    if(addr<register[13])
        ram[Math.floor(addr/4)] = (ram[Math.floor(addr/4)] & ~(0xFF << (8*(addr%4)))) | (byte << (8*(addr%4)));
    else
        stack[stack_beg/4-Math.floor(addr/4)] = (stack[stack_beg/4-Math.floor(addr/4)] & ~(0xFF << (8*(addr%4)))) | (byte << (8*(addr%4)));
}

//ldr
let ldr_operator = new Operator("LDR",  [6,8, 10,11]);
ldr_operator.immediate_ok = true;
ldr_operator.address_arg = true;
ldr_operator.execute_line = (elements)=>{
    if(!(elements[0].length<5 || check_conditional(elements[0].substring( 3, 5)))) return;
    let addr = Math.floor(address_solver(elements)/4) 
    if(addr<register[13])
        register[[parseInt(elements[1].substring(1))]] = ram[addr];
    else
        register[[parseInt(elements[1].substring(1))]] = stack[stack_beg/4-addr] 
};

//ldrb
let ldrb_operator = new Operator("LDRB",  [6,8, 10,11]);
ldrb_operator.immediate_ok = true;
ldrb_operator.address_arg = true;
ldrb_operator.execute_line = (elements)=>{
    if(!(elements[0].length<5 || check_conditional(elements[0].substring( 4, 6)))) return;
    let addr= address_solver(elements);
    if(addr<register[13])
        register[[parseInt(elements[1].substring(1))]] = (ram[Math.floor(addr/4)]>>(8*(addr%4)))&0xFF;
    else
        register[[parseInt(elements[1].substring(1))]] = (stack[stack_beg/4-addr]>>(8*(addr%4)))&0xFF;
    
}

//tst
let tst_operator = new Comp_operator("TST",  [4, 6,7], (a,b)=>{ return a&b; });
//teq 
let teq_operator = new Comp_operator("TEQ",  [4, 6,7], (a,b)=>{ return a^b; });
//cmp
let cmp_operator = new Comp_operator("CMP",  [4, 6,7], (a,b)=>{ return sub_operator.f(a,b,1); });
//cmn
let cmn_operator = new Comp_operator("CMN",  [4, 6,7], (a,b)=>{ return add_operator.f(a,b,1); });


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
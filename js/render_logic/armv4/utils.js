function check_conditional(tag){
    for(let i = 0; i < conds.length; i++){
        if(tag == conds[i].name)
            return conds[i].f(N,Z,C,V);
    }
}

function get_register_value(element){
    let reg_val = parseInt(element.substring(1), 10);
    return register[reg_val]+(reg_val==15)*8;
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
    base = get_register_value(elements[4]);
    if(elements.length < 7) return base;
    let sign = element[6][0] == "-"
    sign = sign ? -1 : 1;
    offset = immediate_solver(elements[6]);
    if(elements.length < 10)
        return base + sign * offset;
    if(elements.length<11)
        return base + sign * ((offset>>>1) | (C<<31));

    let shift = immediate_solver(elements[9]);
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

function reset_state(){
    register = ["X","X","X","X","X","X","X","X","X","X","X","X","X",stack_beg,"X",0];
    ram = {};
    stack = ["X"];
}
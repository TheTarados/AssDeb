function armv4_get_register_value(element){
    let reg_val = parseInt(element.substring(1), 10);
    return language.get_register_values()[reg_val]+(reg_val==15)*8;
}

function armv4_immediate_solver(element){
    if(element[0] == "#")
        if( element[1] == "0" && element[2] == "X"){
            return parseInt(element.substring(3), 16);
        } else if( element[1] == "0" && element[2] == "B"){
            return parseInt(element.substring(3), 2);
        } else {
            return parseInt(element.substring(1), 10);
        }
    else
        return armv4_get_register_value(element);
}

function armv4_address_solver(elements){
    base = armv4_get_register_value(elements[4]);
    if(elements.length < 7) return base;
    let sign = elements[6][0] == "-"
    sign = sign ? -1 : 1;
    offset = armv4_immediate_solver(elements[6]);
    if(elements.length < 10)
        return base + sign * offset;
    if(elements.length<11)
        return base + sign * ((offset>>>1) | (C<<31));

    let shift = armv4_immediate_solver(elements[9]);
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


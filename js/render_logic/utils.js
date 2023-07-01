function get_unsigned_value(x){
    if (x == "X") return "X";
    return (x>>>1)*2+(x&1)
}

function get_signed_value(x){
    if (x == "X") return "X";
    return x&0xFFFFFFFF;
}

function int_to_string_base(x, base){
    if(base == "u"){ 
        return get_unsigned_value(x).toString(10);
    } else if (base == "s"){
        return get_signed_value(x).toString(10);
    } else {
        return get_unsigned_value(x).toString(base);
    }
}

function bit_size_shifted(num){
    //Distance between highest bit and lowest bit
    let max = 0;
    let min = 0;
    for(let i = 0; i < 32; i++){
        if(num & (1<<i)){
            min = i;
            break;
        }
    }
    for(let i = 31; i >= 0; i--){
        if(num & (1<<i)){
            max = i;
            break;
        }
    }
    return max-min+1;
}

function bit_size(num){
    let max = 0;
    for(let i = 31; i >= 0; i--){
        if(num & (1<<i)){
            max = i;
            break;
        }
    }
    return max+1;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

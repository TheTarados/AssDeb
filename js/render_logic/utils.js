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
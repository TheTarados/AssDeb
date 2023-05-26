class Generic_logic{
    get_operators(){
        throw new Error('Abstract method cannot be called.');
    };
    get_stack(){
        throw new Error('Abstract method cannot be called.');
    };
    get_register_names(){
        throw new Error('Abstract method cannot be called.');
    };
    get_register_values(){
        throw new Error('Abstract method cannot be called.');
    };
    get_register_count(){
        throw new Error('Abstract method cannot be called.');
    };
    get_ram(){
        throw new Error('Abstract method cannot be called.');
    };
    setup_code(code){
        throw new Error('Abstract method cannot be called.');
    };
    clean_code(code){
        throw new Error('Abstract method cannot be called.');
    };
    get_current_line(){
        throw new Error('Abstract method cannot be called.');
    };
    get_current_code_line(){
        throw new Error('Abstract method cannot be called.');
    };
    get_current_code_length(){
        throw new Error('Abstract method cannot be called.');
    };
    get_current_area_line(){
        throw new Error('Abstract method cannot be called.');
    }
    get_area_line_list(){
        throw new Error('Abstract method cannot be called.');
    };
    before_execute_line(){
        throw new Error('Abstract method cannot be called.');
    };
    after_execute_line(){
        throw new Error('Abstract method cannot be called.');
    };
    get_hex(code){
        throw new Error('Abstract method cannot be called.');
    };
    get_break_points(index){
        throw new Error('Abstract method cannot be called.');
    };
    invert_break_points(index){
        throw new Error('Abstract method cannot be called.');
    };
}


module.exports = Generic_logic;
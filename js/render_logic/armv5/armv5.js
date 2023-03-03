class Armv5 extends Armv4 {
    constructor(){
        super();
        let bkpt_operator = new armv4_Operator("BKPT", [1]);
        bkpt_operator.execute_line = (elements, nzcv) => {
            if(computing_timeline == false)
                is_running = false; 
            return nzcv;
        };
        let armv5_new_operators = [ bkpt_operator ];

        this.operators_object.operators=armv5_new_operators.concat(this.operators_object.operators);

    }
    
}
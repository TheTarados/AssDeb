let armv4_Operator_Lists = require('../armv4/armv4.js');
class Armv5 extends Armv4 {
    constructor(){
        super();
        
        let bkpt_operator = new armv4_Operator("BKPT", [1]);
        bkpt_operator.execute_line = (elements, nzcv) => {
            if(computing_timeline == false)
                is_running = false; 
            return nzcv;
        };

        //let bx_operator = new armv4_Operator("BLX", [ 2 ]);
        //bx_operator.execute_line = (elements, nzcv) => {
        //    if(!(elements[0].length<3 ||armv4_check_conditional(elements[0].substring( 1, 3)))) return nzcv;
        //        language.did_a_jmp = true;
        //    if(elements[1] in jmp_addr){
        //        language.get_register_values()[15]=  jmp_addr[elements[1]];
        //    }else{
        //        language.get_register_values()[15] += armv4_immediate_solver(elements[1])*4 + 8;
        //    }
        //    return nzcv;
        //}
            

        let armv5_new_operators = [ bkpt_operator ];

        this.operators_object.operators=armv5_new_operators.concat(this.operators_object.operators);
        
        this.register = this.register.concat([0]);
        this.reg_base = this.reg_base.concat(["s"]);
        this.register_names = this.register_names.concat(["T"]);
    }
    
}
module.exports = Armv5;
var Armv4 = require('../../render_logic/armv4/armv4.js');
var { step, run, run_until, stop, pause, execute_line } = require('../../render_logic/run.js');
var fs = require('fs');
test('Test basic code execution', () => {
    
    let language = new Armv4();
    let reference_input =  
    'push	{fp}		; (str fp, [sp, #-4]!)'+'\n'+
    'add	fp, sp, #0'+'\n'+
    'sub	sp, sp, #12'+'\n'+
    'mov	r3, #222	; 0xde'+'\n'+
    'str	r3, [fp, #-8]'+'\n'+
    'ldr	r3, [fp, #-8]'+'\n'+
    'add	r3, r3, #254	; 0xfe'+'\n'+
    'str	r3, [fp, #-8]'+'\n'+
    'ldr	r3, [fp, #-8]'+'\n'+
    'mov	r0, r3'+'\n'+
    'add	sp, fp, #0'+'\n'+
    'pop	{fp}		; (ldr fp, [sp], #4)'+'\n';
    language.setup_code(reference_input);
    run(language);

    
    expect(language.get_register_values()[0]).toBe(0x1DC);
  });
  
  test('Test more complex code', () => {
    let language = new Armv4();
    let reference_input =  fs.readFileSync("js/test/Armv4/codes/mult", 'utf8');
    language.setup_code(reference_input);
    run(language);

    
    expect(language.get_register_values()[0]).toBe(7966455);
  });
  test('Test with a recursive code (Syracuse computation)', () => {
      let language = new Armv4();
      let reference_input =  fs.readFileSync("js/test/Armv4/codes/syracuse", 'utf8');
      language.setup_code(reference_input);
      run(language);
  
      
      expect(language.get_register_values()[0]).toBe(14);
    });
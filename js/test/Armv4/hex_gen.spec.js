
var Armv4 = require('../../render_logic/armv4/armv4.js');

var fs = require('fs');
test('Test basic hex generation', () => {
  let language = new Armv4();
  let reference_input =  fs.readFileSync("js/test/Armv4/codes/ref_input", 'utf8');
  let reference_output = fs.readFileSync("js/test/Armv4/codes/ref_output", 'utf8');
  reference_output = reference_output.replace(/\r/g, "");
  let output = language.get_hex(reference_input);
  let to_test = ""; 
  let ref = ""; 
  reference_input = reference_input.split(/\r?\n/);
  output = output.split(/\r?\n/);
  reference_output = reference_output.split(/\r?\n/);
  let k = 0;
  for(let i = 0; i < reference_input.length; i++){
    if(reference_input[i][reference_input[i].length-1] != ":"){
      to_test += reference_input[i]+"," +output[i-k]+"\n";
      ref += reference_input[i]+"," +reference_output[i-k]+"\n";
    }else{
      k+= 1;
      to_test += reference_input[i]+"\n";
      ref += reference_input[i]+"\n";
    }
  }
  expect(to_test).toBe(ref);
});
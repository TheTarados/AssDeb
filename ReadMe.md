# What is AssDeb?

AssDeb is a debugger made for assembler directly inspired by Zachtronics game. At the moment, it only supports armv4 but should be extended in the future to support other languages.

# Why use AssDeb?

 AssDeb is unlike most other debuggers in the sense that it doesn't really run the program on the machine, interupting it using system calls to get the data. AssDeb interprets himself the behaviour of the program. This has advantages and disadvantages. 
 
 The disadvantage is that the whole behaviour of the program in the debugger directly depends on AssDeb's program and on nothing else so if the programmer didn't understand the convention of an instruction, this instruction will not be executed how it should. it also adds a lot of complexity in the application given it has to contain a full interpreter of any language it wants to debug.

 The advantages are the easy access to all of the memory and the fact that the program runs smoother by not having to do interuptions to speak to the OS to run and stop the program.

# How to download?

You can find the current release on this page: https://github.com/TheTarados/AssDeb/releases

Download it, extract it and run the exe inside it. AssDeb should run!

# How to build it?

1. Install Node.js from https://nodejs.org/en/download/

2. Clone this repository.

3. Run `npm install --save-dev electron` in your terminal.

4. Run `npm start` in your terminal

5. AssDeb should run!

# How to use AssDeb?

AssDeb in 6 zones.
1. The text area, where you can write your code. It should respect the syntax of the language.
2. The stack area, showing the content of the stack
3. The heap are, showing the content of the heap.
4. The register area, showing the content of the registers and of the flag.
5. The button area, where you can interact with the execution of your program. The buttons are step, run, pause and stop. The slider under it manages the speed of the run state. Left being slow and right being fast.
6. The timeline where you can see what instruction the program executed in past steps, what it will execute in future steps. A click on one of the instruction will make the program change to the corresponding state.

The only menu in the bar on the top of the window is the file menu which lets you
- Open a file, in which case its content will shown in the text area.
- Save a file in which case the content of the text area can be written to a file.
- Close the file. This will clear the text area and reset the auto-save path.

This auto-save path is a feature where, upon saving to a file or opening a file, any change done to the text area will impact the file you last opened/saved to. Closing the file will thus stop this synchronisation.

# Is AssDeb bug-free?

Most likely not and you should thus be cautious when using AssDeb. It is a good idea to run your code on another debugger if your application is critical and/or uses complicated features of the language.

In most use cases, the debugger should give the right result but if you find any error, please create an issue on github, showing the code which create the bug and, if possible, what gdb indicates as solution.

# Can I contribute?

Yes, any help is welcome! At the moment, the main goal should be to clean the goal and make it easy to add new languages.
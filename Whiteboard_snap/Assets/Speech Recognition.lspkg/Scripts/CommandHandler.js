// CommandHandler.js
// Version: 0.1.0
// Event: OnStart
// Description: Provides functions for different command detection

//@input bool debug

script.nextCommand = nextCommand;
script.previousCommand = previousCommand;
script.numberCommand = numberCommand;
script.leftCommand = leftCommand;
script.rightCommand = rightCommand;
script.upCommand = upCommand;
script.downCommand = downCommand;

function nextCommand() {
    if(script.debug){
        print("Command: next");
    }
   
}

function previousCommand() {
    if(script.debug){
        print("Command: previous");
    }
}

function numberCommand(number) {
    if(script.debug){
        print("Command: number " + number);
    }

}

function leftCommand() {
    if(script.debug){
        print("Command: left");
    }  
    
}

function rightCommand() {
    if(script.debug){
        print("Command: right");
    }
    
}
function upCommand() {
    if(script.debug){
        print("Command: up");
    }

}

function downCommand() {
    if(script.debug){
        print("Command: down");
    }

}


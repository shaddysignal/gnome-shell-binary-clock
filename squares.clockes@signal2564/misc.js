// Just simple logger with jammer.
// For actualy broadcast something, you need set debug to true,
// it can be switched during the script
function Logger(debug) {
    this._init(debug);
}

Logger.prototype = {
    _init: function(debug) {
        this.debug = debug;
    },

    log: function(message) {
        if(this.debug)
            global.log("'SquareClockes@signal2564': " + message);
    },
}

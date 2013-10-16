const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const WallClock = imports.gi.GnomeDesktop.WallClock;

const DEBUG = true;
const LABEL_CLASS = 'clockes_label';
const TIME_BLOCK_CLASS = 'clockes_time';
const TIME_BIT_CLASS = 'clockes_bit_of_time';
const TIME_BIT_ACTIVE_CLASS = 'active';
const HIDING_TWEENER_TRANSACTION_ANIMATION = 'easeOutQuad';
const TIME_BLOCK_ROWS_COUNT = 3; // Kind of only 2 or 3, for normal people
const TIME_BLOCK_COLUMNS_COUNT = 6; // There too, but there only 6 it is.

function init() {
    return new SquaresClockes();
}

// Just simple logger with jammer if debug does not need
// Need to be exist variable DEBUG in global scope
// for actualy broadcast something, no need do it right away
// it can be switched during the script
function Logger() {
    this._init();
}

Logger.prototype = {
    _init: function() {
        // nothing at all
    },

    log: function(message) {
        if(DEBUG)
            global.log("'SquareClockes@signal2564': " + message);
    }
}

function SquaresClockes() {
    this._init();
}

SquaresClockes.prototype = {
    _init: function() {
        this._logger = new Logger();

        this._logger.log("Start SquaresClockes in yor gnome-shell!");

        this._originalClock = Main.panel.statusArea.dateMenu._clockDisplay;
        this._dateLabel = new St.Label({ style_class: LABEL_CLASS, text: "What day is it?" });
        this._timeTable = new St.DrawingArea({ style_class: TIME_BLOCK_CLASS });
        this._binaryClock = new St.BoxLayout();

        this._binaryClock.add_actor(this._dateLabel);
        this._binaryClock.add_actor(this._timeTable);

        let table = [[], [], []],
            row_size = Math.ceil((this._originalClock.height) / 3);

        this._logger.log("Filling clock table...");
        for(let i = 0, l0 = TIME_BLOCK_ROWS_COUNT; i < l0; i++) {
            let row = new St.BoxLayout({ x: 5, y: row_size * i });
            this._timeTable.add_child(row);
            for(let j = 0, l1 = TIME_BLOCK_COLUMNS_COUNT; j < l1; j++) {
                let bit = new St.Button({ style_class: TIME_BIT_CLASS, x: row_size * j, width: row_size - 1, height: row_size - 1 });
                table[i][j] = bit;
                row.add_child(bit);
            }
        }

        this._logger.log("Adding little magic...");
        // Ha-ha, lets just assume that its normal
        // because of dynamic nature of javascript
        this._timeTable._childrenInBuskets = table;
    },

    _updateTime: function() {
        let time = new Date(),
            aTime = [time.getHours(), time.getMinutes()],
            timeTable = this._timeTable._childrenInBuskets;

        // Year, every second setting text for label
        // that changes kind of 1 time in 24 hours
        this._dateLabel.set_text(time.toDateString());

        // If seconds allowed
        if(aTime.length != TIME_BLOCK_ROWS_COUNT)
            aTime.push(time.getSeconds());

        // Try to create binmap
        for(let i = 0, l = TIME_BLOCK_ROWS_COUNT; i < l; i++) {
            let pow = Math.floor(Math.log(aTime[i])/Math.log(2)),
                j = 0; // It will be in this scope

            // Suddenly, there magic 1. Very sad. :[
            // Well, definitly looking not good.
            while(j < TIME_BLOCK_COLUMNS_COUNT - pow - 1) {
                timeTable[i][j].remove_style_class_name(TIME_BIT_ACTIVE_CLASS);
                j++;
            }
            while(pow >= 0) {
                let remaining = aTime[i] - Math.pow(2, pow);
                if(remaining < 0) {
                    timeTable[i][j].remove_style_class_name(TIME_BIT_ACTIVE_CLASS);
                } else {
                    aTime[i] = remaining;
                    timeTable[i][j].add_style_class_name(TIME_BIT_ACTIVE_CLASS);
                }
                pow--;
                j++;
            }
        }
    },

    enable: function() {
        this._logger.log("Enabling...");

        this._updateTime();

        this._logger.log("Inject clock in loop for countless updates.");
        this._tikTak = Main.panel.statusArea.dateMenu._clock.connect('notify::clock', Lang.bind(this, this._updateTime));

        Main.panel.statusArea.dateMenu.actor.remove_actor(this._originalClock);
        Main.panel.statusArea.dateMenu.actor.add_actor(this._binaryClock);
        this._logger.log("Enjoy.");
    },

    disable: function() {
        this._logger.log("Disabling...");

        this._logger.log("Pull out from pool. Rest now clockes.");
        Main.panel.statusArea.dateMenu._clock.disconnect(this._tikTak);
        Main.panel.statusArea.dateMenu.actor.add_actor(this._originalClock);
        Main.panel.statusArea.dateMenu.actor.remove_actor(this._binaryClock);
        this._logger.log("See you soon.");
    }
}

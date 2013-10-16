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

        this._logger.log("Start SquaresClockes in yor gnome-shell!")

        this._button = new St.Bin({
            style_class: 'panel-button',
            reactive: true,
            can_focus: true,
            x_fill: true,
            y_fill: false,
            track_hover: true
        });
        let label = new St.Label({ style_class: LABEL_CLASS, text: "What time is it?" });

        this._button.set_child(label);
        this._button.connect('button-press-event', Lang.bind(this, this._pressInspect));

        this._showed = false;
        this._timeTable = new St.DrawingArea({ style_class: TIME_BLOCK_CLASS });
        let table = [[], [], []];

        this._logger.log("Filling clock table.");
        for(let i = 0, l0 = TIME_BLOCK_ROWS_COUNT; i < l0; i++) {
            let row = new St.BoxLayout();
            row.set_position(10, 10 + 22 * i);
            this._timeTable.add_child(row);
            for(let j = 0, l1 = TIME_BLOCK_COLUMNS_COUNT; j < l1; j++) {
                let bit = new St.Button({ style_class: TIME_BIT_CLASS, x: 22 * j });
                table[i][j] = bit;
                row.add_child(bit);
            }
        }

        this._logger.log("Adding little magic...")
        // Ha-ha, lets just assume that its normal
        // because of dynamic nature of javascript
        this._timeTable._childrenInBuskets = table;


    },

    _pressInspect: function() {
        this._logger.log("Button press, let see what will be decided...");
        if(this._showed) {
            this._logger.log("Hiding binary clock.");
            this._showed = false;
            this._button.set_reactive(false);
            Tweener.addTween(
                this._timeTable,
                {
                    opacity: 0,
                    time: 1,
                    transition: HIDING_TWEENER_TRANSACTION_ANIMATION,
                    onComplete: Lang.bind(
                        this,
                        this._hideTime
                    )
                }
            );
        } else {
            this._logger.log("Show time!");
            this._showed = true;
            this._showTime()
        }
    },

    _updateTime: function() {
        let time = new Date(),
            aTime = [time.getHours(), time.getMinutes()],
            timeTable = this._timeTable._childrenInBuskets;

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

    _hideTime: function() {
        Main.uiGroup.remove_actor(this._timeTable);

        this._logger.log("Pull out from pool. Rest now clockes.");
        Main.panel.statusArea.dateMenu._clock.disconnect(this._tikTak);

        this._button.set_reactive(true);
    },

    _showTime: function() {
        this._updateTime();
        this._timeTable.opacity = 255;

        Main.uiGroup.add_actor(this._timeTable);

        let monitor = Main.layoutManager.primaryMonitor;

        this._timeTable.set_position(
            Math.floor(monitor.width / 2 - this._timeTable.width / 2),
            Math.floor(monitor.height / 2 - this._timeTable.height / 2)
        )

        this._logger.log("Inject clock in loop for countless updates.");
        this._tikTak = Main.panel.statusArea.dateMenu._clock.connect('notify::clock', Lang.bind(this, this._updateTime));
    },

    enable: function() {
        this._logger.log("Enabling...")
        Main.panel._rightBox.insert_child_at_index(this._button, 0);
        this._logger.log("Enjoy.")
    },

    disable: function() {
        this._logger.log("Disabling...")
        Main.panel._rightBox.remove_child(this._button);
        this._logger.log("See you soon.")
    }
}

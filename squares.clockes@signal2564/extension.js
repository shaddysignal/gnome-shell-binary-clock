const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const WallClock = imports.gi.GnomeDesktop.WallClock;

function init() {
    return new SquaresClockes();
}

// Just simple logger with init jammer if debug does not need
function Logger(debug) {
    this._init(debug);
}

Logger.prototype = {
    _init: function(debug) {
        this._debug = debug;
    },

    log: function(message) {
        if(this._debug)
            global.log("'SquareClockes@signal2564': " + message);
    }
}

function SquaresClockes() {
    this._init(true);
}

SquaresClockes.prototype = {
    __proto__: WallClock.prototype,

    _init: function(debug) {
        this._logger = new Logger(debug);

        this._logger.log("Start SquaresClockes in yor gnome-shell!")

        this._button = new St.Bin({
            style_class: 'panel-button',
            reactive: true,
            can_focus: true,
            x_fill: true,
            y_fill: false,
            track_hover: true
        });
        let label = new St.Label({ style_class: 'clockes_time', text: "What time is it?" });

        this._button.set_child(label);
        this._button.connect('button-press-event', Lang.bind(this, this._pressInspect));

        this._showed = false;
        this._timeTable = new St.Label({ style_class: 'clockes_actual_time' });
        let table = [
            [
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'})
            ], [
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'})
            ], [
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'}),
                new St.Button({style_class: 'clockes_bit_of_time'})
            ]
        ];

        this._logger.log("Filling clock table.");
        for(let i = 0, l0 = table.length; i < l0; i++) {
            let row = new St.Label();
            this._timeTable.add_child(row);
            for(let j = 0, l1 = table[i].length; j < l1; j++) {
                row.add_child(table[i][j]);
            }
        }

        this._logger.log("Adding little magic.")
        // Ha-ha, lets just assume that its normal
        // because of dynamic nature of javascript
        this._timeTable._sortedChildrens = table;
    },

    _pressInspect: function() {
        this._logger.log("Button press, let see what will be decided...");
        if(this._showed) {
            this._logger.log("Hiding binary clock.");
            this._showed = false;
            Tweener.addTween(
                this._timeTable,
                {
                    opacity: 0,
                    time: 1,
                    transition: 'easeOutQuad',
                    onComplete: Lang.bind(
                        this,
                        this._hideTime
                    )
                }
            );
        } else {
            this._logger.log("Showing binary clock.");
            this._showed = true;
            this._showTime()
        }
    },

    _updateTime: function() {
        let time = new Date,
            aTime = [time.getHours(), time.getMinutes(), time.getSeconds()],
            table = [[],[],[]],
            timeTable = this._timeTable._sortedChildrens;

        // Try to create binmap
        for(let i = 0, l = aTime.length; i < l; i++) {
            let pow = Math.floor(Math.sqrt(aTime[i]));
            for(let j = 0; j < timeTable[i].length - pow; j++) {
                table[i].push(0);
            }
            while(pow > 0) {
                let temp = aTime[i] - Math.pow(2, pow);
                if(temp < 0) {
                    table[i].push(0);
                } else {
                    aTime[i] -= Math.pow(2, pow);
                    table[i].push(1);
                }
                pow--;
            }
        }

        // Start drawing! Hyrai!
        for(let i = 0, l0 = timeTable.length; i < l0; i++) {
            for(let j = 0, l1 = timeTable[i].length; j < l1; j++) {
                if(table[i][j]) {
                    timeTable[i][j].add_style_class_name('active');
                } else {
                    timeTable[i][j].remove_style_class_name('active');
                }
            }
        }

        // Wonder what it is
        this._timeTable.queue_redraw();
    },

    _hideTime: function() {
        Main.uiGroup.remove_actor(this._timeTable);

        this._logger.log("Pull out from pool. Rest now clockes.");
        Main.panel.statusArea.dateMenu._clock.disconnect(this._tikTak);
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

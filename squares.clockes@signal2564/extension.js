const St = imports.gi.St;
const Tweener = imports.ui.tweener;
const Lang = imports.lang;
const DateMenu = imports.ui.main.panel.statusArea.dateMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Misc = Me.imports.misc;

const CLOCK_SHOW_SECONDS_ALIAS = 'clock-show-seconds';
const CLOCK_SHOW_DATE_ALIAS = 'clock-show-date';
const COLOR_SCHEMA_ALIAS = 'color-schema';

const DEBUG = false;
const BLOCK_CLASS = 'invisible'
const LABEL_CLASS = 'clockes_label';
var TIME_BLOCK_CLASS = 'light_clockes_time';
const TIME_BIT_CLASS = 'clockes_bit_of_time';
const TIME_BIT_ACTIVE_CLASS = 'active';
const HIDING_TWEENER_TRANSACTION_ANIMATION = 'easeOutQuad';
var SHOW_SECONDS = true; // true by default
var SHOW_DATE = true; // true by default
const TIME_BLOCK_COLUMNS_COUNT = 6; // There only 6 it is.
var TIME_BLOCK_ROWS_COUNT = 3; // Can be 2 or 3, for most people

function init() {
    return new SquaresClockes();
}

function SquaresClockes() {
    Convenience.initTranslations();
    this._gnomeSettings = Convenience.getSettings('org.gnome.desktop.interface');
    SHOW_SECONDS = this._gnomeSettings.get_boolean(CLOCK_SHOW_SECONDS_ALIAS);
    SHOW_DATE = this._gnomeSettings.get_boolean(CLOCK_SHOW_DATE_ALIAS);
    this._settings = Convenience.getSettings();
    this._init();
}

SquaresClockes.prototype = {
    _init: function() {
        this._logger = new Misc.Logger(DEBUG);

        this._logger.log("Start SquaresClockes in your gnome-shell!");

        this._originalClock = DateMenu._clockDisplay;
        this._dateLabel = new St.Label({ style_class: LABEL_CLASS, text: "What day is it?" });
        this._timeTable = new St.BoxLayout({ style_class: TIME_BLOCK_CLASS, vertical: true, reactive: true });
        this._binaryClock = new St.BoxLayout({ height: this._originalClock.height });

        this._dateLabel.hide();
        if(SHOW_DATE)
            this._dateLabel.show();
        this._binaryClock.add_actor(this._dateLabel);
        this._binaryClock.add_actor(this._timeTable);

        this._buildClockesTable();
    },

    enable: function() {
        this._logger.log("Enabling...");

        this._updateTime();

        this._logger.log("Inject clock in loop for countless updates.");
        this._tikTak = DateMenu._clock.connect('notify::clock', Lang.bind(this, this._updateTime));

        this._logger.log("Looking for settings changes...");
        this._changeColor = this._settings.connect('changed::' + COLOR_SCHEMA_ALIAS, Lang.bind(this, this._updateClockesColor));
        this._changeSeconds = this._gnomeSettings.connect('changed::' + CLOCK_SHOW_SECONDS_ALIAS, Lang.bind(this, this._updateClockesSeconds));
        this._changeDate = this._gnomeSettings.connect('changed::' + CLOCK_SHOW_DATE_ALIAS, Lang.bind(this, this._updateClockesDate));

        DateMenu.actor.remove_actor(this._originalClock);
        DateMenu.actor.add_actor(this._binaryClock);
        this._logger.log("Enjoy.");
    },

    disable: function() {
        this._logger.log("Disabling...");

        this._settings.disconnect(this._changeColor);
        this._gnomeSettings.disconnect(this._changeSeconds);
        this._gnomeSettings.disconnect(this._changeDate);

        this._clearClockesTable();

        this._logger.log("Pull out from pool. Rest now, clockes.");
        DateMenu._clock.disconnect(this._tikTak);
        DateMenu.actor.add_actor(this._originalClock);
        DateMenu.actor.remove_actor(this._binaryClock);
        this._logger.log("See you soon.");
    },

    _buildClockesTable: function() {
        let table = [[], [], []],
            row_size = Math.ceil((this._originalClock.height) / TIME_BLOCK_ROWS_COUNT);

        this._logger.log("Filling clock table...");
        for(let i = 0, l0 = TIME_BLOCK_ROWS_COUNT; i < l0; i++) {
            let row = new St.BoxLayout({ x: 5, y: row_size * i});
            this._timeTable.add_child(row);
            for(let j = 0, l1 = TIME_BLOCK_COLUMNS_COUNT; j < l1; j++) {
                let bit = new St.Button({
                    style_class: TIME_BIT_CLASS,
                    x: row_size * j,
                    width: row_size - 1, // 1 for space between
                    height: row_size - 1
                });
                table[i][j] = bit;
                row.add_child(bit);
            }
        }

        this._logger.log("Adding little magic...");
        // Hah, lets just assume that its normal
        // because of dynamic nature of javascript
        this._timeTable._childrenInBuskets = table;

        // Set width, because it just did not set themselfs(or I not see where)
        // + some margin
        this._timeTable.width = row_size * TIME_BLOCK_COLUMNS_COUNT + 10;
    },

    _clearClockesTable: function() {
        this._timeTable.destroy_all_children();
    },

    _updateTime: function() {
        let time = new Date(),
            aTime = [time.getHours(), time.getMinutes()],
            timeTable = this._timeTable._childrenInBuskets;

        // Yeah, every second setting text for label
        // that changes 1 time in 24 hours
        if(SHOW_DATE)
            this._dateLabel.set_text(time.toDateString());

        if(SHOW_SECONDS)
            aTime.push(time.getSeconds());

        // Try to create binmap
        for(let i = 0, l = TIME_BLOCK_ROWS_COUNT; i < l; i++) {
            for(let j = TIME_BLOCK_COLUMNS_COUNT - 1; j >= 0; j--) {
                if(aTime[i] & 1)
                    timeTable[i][j].add_style_class_name(TIME_BIT_ACTIVE_CLASS);
                else
                    timeTable[i][j].remove_style_class_name(TIME_BIT_ACTIVE_CLASS);
                aTime[i] >>= 1;
            }
        }
    },

    _updateClockesDate: function() {
        this._logger.log('Detect changes in clock-show-date.');
        SHOW_DATE = this._gnomeSettings.get_boolean(CLOCK_SHOW_DATE_ALIAS);
        if(SHOW_DATE)
            this._dateLabel.show();
        else
            this._dateLabel.hide();
    },

    _updateClockesColor: function() {
        this._logger.log('Detect changes in color-schema.');
        let timeBlockClazz = this._settings.get_string(COLOR_SCHEMA_ALIAS);
        this._timeTable.remove_style_class_name(TIME_BLOCK_CLASS);
        this._timeTable.add_style_class_name(timeBlockClazz);
        TIME_BLOCK_CLASS = timeBlockClazz;
    },

    _updateClockesSeconds: function() {
        this._logger.log('Detect changes in clock-show-seconds.');
        SHOW_SECONDS = this._gnomeSettings.get_boolean(CLOCK_SHOW_SECONDS_ALIAS);
        TIME_BLOCK_ROWS_COUNT = SHOW_SECONDS ? 3 : 2;

        this._clearClockesTable();
        this._buildClockesTable();
    }
}

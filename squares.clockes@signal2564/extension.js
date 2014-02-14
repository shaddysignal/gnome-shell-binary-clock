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

const DEBUG = true;
const BLOCK_CLASS = 'invisible';
const LABEL_CLASS = 'clockes_label';
var TIME_BLOCK_CLASS = 'light_clockes_time';

function init() {
    return new SquaresClockes();
}

function SquaresClockes() {
    Convenience.initTranslations();
    this._gnomeSettings = Convenience.getSettings('org.gnome.desktop.interface');

    this._showSeconds = this._gnomeSettings.get_boolean(CLOCK_SHOW_SECONDS_ALIAS);
    this._timeTableRowCounts = this.showSeconds ? 3 : 2;

    this._showDate = this._gnomeSettings.get_boolean(CLOCK_SHOW_DATE_ALIAS);

    this._settings = Convenience.getSettings();
    this._init();
}

SquaresClockes.prototype = {
    _showSeconds: true,
    _showDate: true,
    _showGrid: false, // I don't like grid
    _gridWidth: 1,
    _inverseTheme: true, // If false - then bits are color of text, and background color of, well, background
    _cornerRadius: 2, // for bit
    _activeHasBorder: true, // border for active bit
    _borderWidth: 2,
    _spacing: 1, // between bits. If grid shows, the spacing show how many px between grid and bit
    _hasOuterBorder: false, // Show border around clock area(without date)
    _outerBorderWidth: 1,
    _outerCornerRadius: 0,
    _timeBlockColumnsCount: 6, // There only 6, I guess
    _timeBlockRowsCount: 3, // Can be 2 or 3, for most people

    _init: function() {
        this._logger = new Misc.Logger(DEBUG);

        this._logger.log("Start SquaresClockes in your gnome-shell!");

        this._originalClock = DateMenu._clockDisplay;
        this._dateLabel = new St.Label({ style_class: LABEL_CLASS, text: "What day is it?", visible: false });
        this._timeTable = new St.DrawingArea({ style_class: TIME_BLOCK_CLASS, reactive: true });
        this._binaryClock = new St.BoxLayout({ height: this._originalClock.height });

        if(this._showDate)
            this._dateLabel.show();
        this._binaryClock.add_actor(this._dateLabel);
        this._binaryClock.add_actor(this._timeTable);

        this._repaintTimeTableConnection = this._timeTable.connect('repaint', Lang.bind(this, this._paintClockesTable));

        let rawTimeTable = [];
        for(let i = 0; i < this._timeBlockRowsCount; i++) {
            rawTimeTable[i] = [];
            for(let j = 0; j < this._timeBlockColumnsCount; j++) {
                rawTimeTable[i][j] = 0;
            }
        }
        this._timeTable._childrenInBuskets = rawTimeTable;
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

        this._logger.log("Pull out from pool. Rest now, clockes.");
        DateMenu._clock.disconnect(this._tikTak);

        DateMenu.actor.add_actor(this._originalClock);
        DateMenu.actor.remove_actor(this._binaryClock);
        this._logger.log("See you soon.");
    },

    _paintClockesTable: function(area) {
        let c = area.get_context(),
            fgcolor = fgc = this._timeTable.get_theme_node().get_foreground_color(),
            bgcolor = bgc = this._timeTable.get_theme_node().get_background_color(),
            height = area.get_height(),
            width = area.get_width(),
            blockSideLength = Math.round(height / this._timeBlockRowsCount) - this._spacing * (this._timeBlockRowsCount - 1),
            margin = 0,
            gap = this._spacing;

        if(this._inverseTheme)
            [ fgc, bgc ] = [ bgcolor, fgcolor ];

        if(this._hasOuterBorder) {
            Clutter.cairo_set_source_color(c, fgcolor);
            c.setLineWidth(this._outerBorderWidth);

            this._cairoDrawRoundedRectangle(0, 0, height, width, this._outerCornerRadius);
            c.stroke();

            margin = this._outerBorderWidth;
            height -= margin * 2;
            blockSideLength = Math.round(height / this._timeBlockRowsCount) - this._spacing * (this._timeBlockRowsCount - 1);
        }

        if(this._showGrid) {
            blockSideLength = Math.round(height / this._timeBlockRowsCount) - (2 * this._spacing + this._gridWidth) * (this._timeBlockRowsCount - 1);

            Clutter.cairo_set_source_color(c, fgcolor);
            c.setLineWidth(this._gridWidth);

            let step = 2 * this._spacing + blockSideLength,
                positionX = margin + step,
                positionY = margin;

            for(let i = 0; i < this._timeBlockColumnsCount - 1; i++) {
                this._cairoLineFromTo(positionX, positionY, positionX, positionY + height - 2 * margin);
                positionX += step + this._gridWidth;
            }
            positionX = margin;
            positionY = margin + step;

            for(let j = 0; j < this._timeBlockRowsCount - 1; j++) {
                this._cairoLineFromTo(positionX, positionY, positionX + width - 2 * margin, positionY)
                positionY += step + this._gridWidth;
            }

            c.stroke();
            gap = 2 * this._spacing + this._gridWidth;
        }

        // Draw bits

        let positionX = margin + this._spacing,
            positionY = positionX,
            step = blockSideLength + gap,
            timeTable = this._timeTable._childrenInBuskets;

        this._logger.log(timeTable);

        for(let i = 0; i < this._timeTableRowCount; i++) {
            positionY += step;
            for(let j = 0; j < this._timeBlockColumnsCount; j++) {
                timeTable[i][j] ? Clutter.cairo_set_source_color(c, bgc) : Clutter.cairo_set_source_color(c, fgc);
                this._cairoDrawRoundedRectangle(positionX, positionY, blockSideLength, blockSideLength, this._cornerRadius);
                c.fill();

                if(this._activeHasBorder && timeTable[i][j]) {
                    Clutter.cairo_set_source_color(c, fgc);
                    c.setLineWidth(this._borderWidth);

                    this._cairoDrawRoundedRectangle(positionX, positionY, blockSideLength, blockSideLength, this._cornerRadius);
                    c.stroke();
                }

                positionX += step;
            }
            positionX = margin + this._spacing;
        }
    },

    _updateTime: function() {
        let time = new Date(),
            aTime = [time.getHours(), time.getMinutes()],
            timeTable = this._timeTable._childrenInBuskets;

        // Yeah, every second setting text for label
        // that changes 1 time in 24 hours
        if(this._showDate)
            this._dateLabel.set_text(time.toDateString());

        if(this._showSeconds)
            aTime.push(time.getSeconds());

        // Try to create bitmap
        for(let i = 0, l = this._timeBlockRowsCount; i < l; i++) {
            for(let j = this._timeBlockColumnsCount - 1; j >= 0; j--) {
                timeTable[i][j] = aTime[i] & 1;
                aTime[i] >>= 1;
            }
        }

        this._logger.log('Set to queue');
        this._timeTable.queue_repaint();
        this._timeTable.queue_redraw();
    },

    // Paint function

    _cairoDrawRoundedRectangle: function(context, x, y, w, h, r) {
        //   A****BQ
        //  H      C
        //  *      *
        //  G      D
        //   F****E

        if(r > Math.floor(w / 2))
            r = Math.floor(w / 2);

        context.moveTo(x + r, y);                                       // Move to A
        context.lineTo(x + w - r, y);                                   // Straight line to B
        context.curveTo(x + w, y, x + w, y, x + w, y + r);              // Curve to C, control points are both at Q
        context.lineTo(x + w, y + h - r);                               // Straight line to D
        context.curveTo(x + w, y + h, x + w, y + h, x + w - r, y + h);  // Curve to E
        context.lineTo(x + r, y + h);                                   // Straight line to F
        context.curveTo(x, y + h, x, y + h, x, y + h - r);              // Curve to G
        context.lineTo(x, y + r);                                       // Straight line to H
        context.curveTo(x, y, x, y, x + r, y);                          // Curve to A
    },

    _cairoLineFromTo: function(context, xf, yf, xt, yt) {
        context.moveTo(xf, yf);
        context.lineTo(xt, yt);
    },

    // Settings all over the place

    _updateClockesDate: function() {
        this._logger.log('Detect changes in clock-show-date.');
        this.showDate = this._gnomeSettings.get_boolean(CLOCK_SHOW_DATE_ALIAS);
        if(this.showDate)
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
        this.showSeconds = this._gnomeSettings.get_boolean(CLOCK_SHOW_SECONDS_ALIAS);
        this._timeBlockRowsCount = this.showSeconds ? 3 : 2;

        this._timeTable.queue_repaint();
    }
}

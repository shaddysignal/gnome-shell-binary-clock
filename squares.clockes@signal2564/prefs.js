const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Misc = Me.imports.misc;

const DEBUG = true;

function init() {
    Convenience.initTranslations();
}

const SquaresClockesPrefsWidget = new GObject.Class({
    Name: "SquaresClockes.Prefs.Widget",
    GTypeName: "SquaresClockesPrefsWidget",
    Extends: Gtk.Grid,

    _init: function(params) {
        this._logger = new Misc.Logger(DEBUG);

        this._logger.log("Start settings for Squares Clockes.");

        this.parent(params);
        this.margin = this.row_spacing = this.column_spacing = 10;

        this._settings = Convenience.getSettings();

        let labelColor = new Gtk.Label({ label: 'Color schema' }),
            labelDark = new Gtk.Label({ label: 'Dark' }),
            labelLight = new Gtk.Label({ label: 'Light' }),
            schema = new Gtk.Switch({ active: true });

        schema.connect('notify::active', Lang.bind(this, this._whenToggled));

        this.attach(labelColor, 0, 0, 3, 1);
        this.attach(labelDark, 0, 1, 1, 1);
        this.attach(schema, 1, 1, 1, 1);
        this.attach(labelLight, 2, 1, 1, 1);
    },

    _whenToggled: function(toggleButton) {
        this._settings.set_string('color-schema', toggleButton.get_active() ? 'light_clockes_time' : 'dark_clockes_time');
        this._logger.log(toggleButton.get_active());
    }
})

function buildPrefsWidget() {
    let widget = new SquaresClockesPrefsWidget();
    widget.show_all()

    return widget;
}

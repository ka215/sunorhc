export default {
    /**
     * Sunorhc.js - Library for JavaScript to handle the datetime with the Epoch time conversion method starting
     *              from the CE of the Gregorian calendar.
     * @package sunorhc
     */
    version: '1.0.0',

    /**
     * Default TimeZone
     *
     * @type {string} - Either "UTC" or "local" only
     */
    timezone: 'UTC',

    /**
     * TZ database name
     *
     * @type {string}
     */
    tzName: '',

    /**
     * The identification unit of the first numeric argument given to the constructor
     *
     * @type {string} - Either "year" or "epoch" only
     */
    firstArgument: 'year',

    /**
     * The locale used instead of browser system locale when retrieve locale date/time string
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/Locale
     * @type {string} - Depend on the Intl.Locale constructor that is a standard built-in property
     */
    locale: 'en-US',

    /**
     * Unit for retrieving epoch times
     *
     * @type {string} - Either seconds or milliseconds is allowed at unit
     */
    epochUnit: 'second',

    /**
     * Options for the `Date.prototype.toLocaleDateString()` method
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
     * @typedef {object} LocaleFormats
     * @property {string|object} common
     * @property {string|object} year
     * @property {string|object} month
     * @property {string|object} day
     * @property {string|object} weekday
     * @property {string|object} hour
     * @property {string|object} minute
     * @property {string|object} second
     * @property {string|object} era
     */
    localeFormats: {
        common:  { hour12:  false,/* calender: 'iso8601', */ },
        year:    { year:    'numeric' },
        month:   { month:   'numeric' },
        day:     { day:     'numeric' },
        weekday: { weekday: 'long' },
        hour:    { hour:    'numeric' },
        minute:  { minute:  '2-digit' },
        second:  { second:  '2-digit' },
        era:     { era:     'long' },
    },

    /**
     * Whether outputting verbose of Sunorhc behavior into browser console.
     * This option will be useful for debug.
     *
     * @type {boolean} - If false, it prevent to output the console[error, warn] too.
     */
    verbose: false,
}
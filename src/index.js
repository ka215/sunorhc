import utils from './utils'
import defaults from './defaults'

const REGEX_PARSE  = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/
const REGEX_UNITS  = /^((year|month|week|day|hour|minute|second|millisecond)s?|min|sec|ms)$/i
const REGEX_TZNAME = /^(A(frica|merica|ntarctica|sia|tlantic|ustralia)|Europe|Indian|Pacific|Etc|GMT|UTC|local)(\/[A-Z][a-zA-Z0-9_-]*)?$/
const INVALID_DATE = 'Invalid Date'
const MS_A_SECOND = 1000
const MS_A_MINUTE = MS_A_SECOND * 60
const MS_A_HOUR   = MS_A_MINUTE * 60
const MS_A_DAY    = MS_A_HOUR * 24
const MS_A_WEEK   = MS_A_DAY * 7
const MIN_MONTH_DAYS = 28
const AVG_MONTH_DAYS = Math.round(((365 + 366) / 24) * 1000) / 1000
const MIN_YEAR_DAYS  = 365
const AVG_YEAR_DAYS  = (365 * 3 + 366) / 4
const CE_EPOCH_UNIX  = -62135596800000// Elapsed times of CE epoch in UNIX time (= milliseconds difference between UNIX epoch and CE epoch)

const BI = (value) => global.BigInt(value)

const wrapper = (...payloads) => {
    try {
        return new Sunorhc(...payloads)
    } catch(e) {
        return INVALID_DATE
    }
}

export default class Sunorhc {
    /**
     * Construct Sunorhc
     *
     * @public
     * @param {?(number|string|object)} year|date - valid 1st argument as payloads
     * @param {?number} month                     - valid 2nd argument as payloads (allowed numeric are 1~12)
     * @param {?number} day                       - valid 3rd argument as payloads
     * @param {?number} hour                      - valid 4th argument as payloads
     * @param {?number} minute                    - valid 5th argument as payloads
     * @param {?number} second                    - valid 6th argument as payloads
     * @param {?number} millisecond               - valid 7th argument as payloads (allowed numeric are 0~999)
     * @param {?(string|object)} timezone|options [timezone=UTC] - last argument as payloads
     */
    constructor (...payloads) {
        // Initialize plugin configuration
        this.config = utils.deepMerge({}, defaults)
        
        return this._init(payloads)
    }

    /**
     * Parse payloads
     *
     * @private
     * @param {array} payloads
     */
    _parse (payloads) {
        const keys = ['$y', '$m', '$d', '$h', '$mi', '$s', '$ms'],
              _now = new Date()// today
        let _argsIsUTC = true,
            _fromLocalPayloads = true,
            _isParseStr = false
        //this.config.offset = _now.getTimezoneOffset() * 60000// Provisional definition (an unit is milliseconds)
        this.config.dateArgs = {
            $y:  _now.getUTCFullYear(),
            $m:  _now.getUTCMonth(),
            $d:  _now.getUTCDate(),
            $h:  _now.getUTCHours(),
            $mi: _now.getUTCMinutes(),
            $s:  _now.getUTCSeconds(),
            $ms: _now.getUTCMilliseconds(),
        }
        // parse payloads
        if (Array.isArray(payloads) && payloads.length > 0) {
            // If the constructor has more than one argument
            if (typeof payloads[0] !== 'number') {
                if (payloads[0] instanceof Date) {
                    // When the first argument is an instance of the Date object
                    let _dt = new Date(payloads[0])
                    this.config.dateArgs = {
                        $y:  _dt.getUTCFullYear(),
                        $m:  _dt.getUTCMonth(),
                        $d:  _dt.getUTCDate(),
                        $h:  _dt.getUTCHours(),
                        $mi: _dt.getUTCMinutes(),
                        $s:  _dt.getUTCSeconds(),
                        $ms: _dt.getUTCMilliseconds(),
                    }
                    payloads.shift()
                } else if (typeof payloads[0] === 'string') {
                    let _fa = payloads[0].trim().replace(/['"]/g, '')
                    if (/^(-|\+)?[0-9]{1,}$/i.test(_fa)) {
                        // When the first argument is a numeric string
                        payloads[0] = parseInt(_fa, 10)
                    } else {
                        // When the first argument is a string as kind of the date
                        const d = _fa.match(REGEX_PARSE)
                        if (d) {
                            // When the recommended datetime format
                            this.config.dateArgs = {
                                $y:  d[1],
                                $m:  typeof d[2] === 'undefined' ? 0 : d[2] - 1,
                                $d:  typeof d[3] === 'undefined' ? 1 : d[3],
                                $h:  typeof d[4] === 'undefined' ? 0 : d[4],
                                $mi: typeof d[5] === 'undefined' ? 0 : d[5],
                                $s:  typeof d[6] === 'undefined' ? 0 : d[6],
                                $ms: typeof d[7] === 'undefined' ? 0 : parseInt(d[7].substring(0, 3), 10),
                            }
                            _fromLocalPayloads = !/Z$/i.test(d[0])
                            _isParseStr = true
                            payloads.shift()
                        } else if (!_fa.match(REGEX_TZNAME)) {
                            // When an ambiguous string is given as the datetime
                            let _preDt = new Date(_fa)
                            if (this.isValid(_preDt)) {
                                this.config.dateArgs = {
                                    $y:  _preDt.getUTCFullYear(),
                                    $m:  _preDt.getUTCMonth(),
                                    $d:  _preDt.getUTCDate(),
                                    $h:  _preDt.getUTCHours(),
                                    $mi: _preDt.getUTCMinutes(),
                                    $s:  _preDt.getUTCSeconds(),
                                    $ms: _preDt.getUTCMilliseconds(),
                                }
                                _isParseStr = true
                                payloads.shift()
                            }
                        }
                    }
                }
            }
            let lastElm = payloads.splice(-1, 1)[0]
            if (typeof lastElm === 'number') {
                // If the trailing argument is a number, do nothing.
                payloads.push(lastElm)
            } else if (typeof lastElm === 'string') {
                // If the last argument is a string, set the timezone after checking value.
                lastElm = lastElm.trim().replace(/['"]/g, '')
                if (/^-?\d{1,}$/i.test(lastElm)) {
                    // If the trailing argument is a number, do nothing.
                    payloads.push(parseInt(lastElm, 10))
                } else if (/^(utc|local)$/i.test(lastElm)) {
                    // Set the timezone of "UTC" or "local"
                    this.config.timezone = /^utc$/i.test(lastElm) ? 'UTC' : 'local'
                    _argsIsUTC = this.config.timezone === 'UTC'
                } else {
                    // Set the "local" timezone with timezone name
                    if (lastElm.match(REGEX_TZNAME)) {
                        this.config.timezone = 'local'
                        this.config.tzName = lastElm
                    } else {
                        this._logger(`An invalid timezone name was given: "${lastElm}"`, 2)
                        this.config.timezone = 'UTC'
                    }
                    _argsIsUTC = this.config.timezone === 'UTC'
                }
            } else if (utils.isObject(lastElm)) {
                // If the last argument is an object, it will override the Sunorhc configration.
                if (utils.hasKey(lastElm, 'version')) {
                    delete lastElm.version
                }
                if (utils.hasKey(lastElm, 'offset')) {
                    delete lastElm.offset
                }
                if (utils.hasKey(lastElm, 'dateArgs')) {
                    delete lastElm.dateArgs
                }
                this.config = utils.mergeOptions(this.config, lastElm)
            } else {
                // If the last argument is an invalid value.
                if (typeof lastElm !== 'undefined' && utils.hasKey(this.config, 'dateArgs')) {
                    delete this.config.dateArgs
                    this._logger('The argument contains an invalid value.', 2)
                }
            }
            if (payloads.length > 0) {
                if (/^(timestamp|unix|ce(|epoch))$/i.test(this.config.firstArgument) && typeof payloads[0] === 'number') {
                    // When the first argument for constructor is interpreted as the elapsed times from the epoch time.
                    let _edt = null
                    if (/^(timestamp|unix)$/i.test(this.config.firstArgument)) {
                        _edt = new Date(payloads[0])
                    } else {
                        _edt = new Date(CE_EPOCH_UNIX + payloads[0])
                    }
                    this.config.dateArgs = {
                        $y:  _edt.getUTCFullYear(),
                        $m:  _edt.getUTCMonth(),
                        $d:  _edt.getUTCDate(),
                        $h:  _edt.getUTCHours(),
                        $mi: _edt.getUTCMinutes(),
                        $s:  _edt.getUTCSeconds(),
                        $ms: _edt.getUTCMilliseconds(),
                    }
                    _argsIsUTC = this.config.timezone === 'UTC'
                } else {
                    // When the first argument for constructor is interpreted as the numeric year (for defaults).
                    let _y = typeof payloads[0] === 'number' ? payloads[0] : parseInt(payloads[0].toString(), 10)
                    if (!isNaN(_y)) {
                        this.config.dateArgs = {
                            $y:  _y,
                            $m:  typeof payloads[1] === 'undefined' ? 0 : parseInt(payloads[1], 10) - 1,
                            $d:  typeof payloads[2] === 'undefined' ? 1 : parseInt(payloads[2], 10),
                            $h:  typeof payloads[3] === 'undefined' ? 0 : parseInt(payloads[3], 10),
                            $mi: typeof payloads[4] === 'undefined' ? 0 : parseInt(payloads[4], 10),
                            $s:  typeof payloads[5] === 'undefined' ? 0 : parseInt(payloads[5], 10),
                            $ms: typeof payloads[6] === 'undefined' ? 0 : payloads[6],
                        }
                        _argsIsUTC = false
                        _fromLocalPayloads = false
                    }
                }
            }
        } else {
            // If the constructor has no arguments
        }
        if (!utils.hasKey(this.config, 'dateArgs')) {
            throw '[Sunorhc] Failed to set options for initializing object.'
        }
        // Set the primitive datetime as "_baseDate"
        let _utcDt   = new Date(Date.UTC(...keys.map(v => this.config.dateArgs[v]))),
            _zonedDt = new Date(...keys.map(v => this.config.dateArgs[v]))
        if (this.config.dateArgs.$y < 100) {
            _utcDt   = new Date(_utcDt.setUTCFullYear(this.config.dateArgs.$y))
            _zonedDt = new Date(_zonedDt.setFullYear(this.config.dateArgs.$y))
        }
        if (_isParseStr) {
            if (_argsIsUTC) {
                this.config.offset = 0
                this.config.timezone = 'UTC'
                this._baseDate = _utcDt
            } else {
                this.config.offset = _zonedDt.getTimezoneOffset() * 60000
                this.config.timezone = 'local'
                this._baseDate = new Date(_zonedDt.getTime() - this.config.offset)
            }
        } else {
            if (!_argsIsUTC) {
                this.config.offset = _zonedDt.getTimezoneOffset() * 60000
                _zonedDt = _fromLocalPayloads
                    ? new Date(_utcDt.getTime() - this.config.offset)
                    : new Date(_utcDt.getTime())
            } else {
                this.config.offset = 0
                _zonedDt = new Date(_utcDt.getTime())
            }
            if (this.config.timezone === 'UTC') {
                this._baseDate = this.isValid(_utcDt) ? _utcDt : INVALID_DATE
                this.config.offset = 0
            } else {
                this._baseDate = this.isValid(_zonedDt) ? _zonedDt : INVALID_DATE
                if (!this.hasDST() && this.config.offset == 0) {
                    this._baseDate = this.isValid(_utcDt) ? _utcDt : INVALID_DATE
                    this.config.timezone = 'UTC'
                }
            }
        }
    }

    /**
     * Initialize instance
     *
     * @private
     */
    _init(payloads) {
        // Parse payloads
        this._parse(payloads)

        const _locale = 'en-US'
        this._i = this.isValid() ? Object.assign({}, {
            $Y:    parseInt(this.getLDE('year', 'numeric', _locale), 10),
            $MON:  parseInt(this.getLDE('month', 'numeric', _locale), 10),
            $MONL: this.getLDE('month', 'long', _locale),
            $MONS: this.getLDE('month', 'short', _locale),
            $W:    this.getWeekOfYear(),
            $D:    parseInt(this.getLDE('day', 'numeric', _locale), 10),
            $WD:   this.getWeekdayIndex('iso8601'),
            $WDL:  this.getLDE('weekday', 'long', _locale),
            $WDS:  this.getLDE('weekday', 'short', _locale),
            $O:    this.getCumulativeDays(),
            $H:    parseInt(this.getLDE('hour', {hour12: false, hour: 'numeric'}, _locale), 10),
            $M:    parseInt(this.getLDE('minute', 'numeric', _locale), 10),
            $S:    parseInt(this.getLDE('second', 'numeric', _locale), 10),
            $MS:   this.config.timezone === 'UTC' ? this._baseDate.getUTCMilliseconds() : this._baseDate.getMilliseconds(),
            $TZ:   this.config.timezone || 'UTC',
            $TZO:  this.config.timezone === 'UTC' ? 0 : this.getTZOffset(),
            $TZOL: this.getTZOffset('hhmm'),     
            $TZOF: this.getTZOffset('full'),     
            $U:    this.getUnixTime('s'),
            $UMS:  this.getUnixTime('ms'),
            $E:    this.getLDE('era', 'long', _locale),
            $CE:   this.getCEEpoch('s'),
            $CEMS: this.getCEEpoch('ms'),
            $DST:  this.isDST(),
            $DSTO: this.getDSTOffset(),
        }) : null
        //delete this.config.dateArgs

        Object.freeze(this.config)
        Object.freeze(this._cache)

        return this
    }

    /**
     * Logger
     *
     * @private
     * @param {string} msg - output message
     * @param {?number} type [type=0] - output type as console method
     */
     _logger(msg, type=0) {
        if (this.config.verbose) {
            const types = [ 'log', 'info', 'warn', 'error', 'debug' ]
            console[types[type]](`[Sunorhc] ${msg}`)
        }
    }

    // Public methods

    /**
     * Calculate the UNIX Time (UTC) for this date.
     *
     * @public
     * @param {?string} unit [unit=ms] - `s` as second or `ms` as millisecond
     */
    getUnixTime(unit='ms') {
        if (!unit) {
            unit = /^sec(|onds?)$/i.test(this.config.epochUnit) ? 's' : 'ms'
        }
        let _time = 0
        if (this.config.timezone === 'UTC') {
            _time = this._baseDate.getTime()
        } else {
            let _da = this.config.dateArgs
            _time = new Date(_da.$y, _da.$m, _da.$d, _da.$h, _da.$mi, _da.$s, _da.$ms).getTime()
        }
        return Math.floor(_time / (unit === 's' ? 1000 : 1))
    }

    /**
     * Calculate the times (UTC) epoched from the first datetime on Common Era of this date.
     *
     * @public
     * @param {?string} unit [unit=ms] - `s` as second or `ms` as millisecond
     */
    getCEEpoch(unit='ms') {
        if (!unit) {
            unit = /^sec(|onds?)$/i.test(this.config.epochUnit) ? 's' : 'ms'
        }
        let _ut = this.getUnixTime()
        return Math.floor((_ut + Math.abs(CE_EPOCH_UNIX)) / (unit === 's' ? 1000 : 1))
    }

    /**
     * Returns a string with a language sensitive representation of the date portion of this date 
     * that depending on toLocaleDateString or toLocaleTimeString method.
     *
     * @public
     * @param {string} elementName
     * @param {?(string|object)} format
     * @param {?string} locale
     * @param {?string} timezone [timezone=UTC]
     */
    getLocaleDateElement(elementName, format=null, locale=null, timezone='UTC') {
        if (!locale) {
            locale = this.config.locale
        }
        let options = utils.deepMerge(
                utils.isObject(this.config.localeFormats.common) ? this.config.localeFormats.common : {},
                { locales: locale }
            )
        if (!format) {
            if (utils.hasKey(this.config.localeFormats, elementName)) {
                options = utils.deepMerge(options, 
                    utils.isObject(this.config.localeFormats[elementName]) 
                    ? this.config.localeFormats[elementName]
                    : {[elementName]: this.config.localeFormats[elementName]}
                )
            }
        } else if (typeof format === 'string') {
            options[elementName] = format
        } else if (utils.isObject(format)) {
            options = utils.deepMerge(options, format)
        }
        if (REGEX_TZNAME.test(timezone)) {
            options.timeZone = timezone
        } else {
            //
        }
        let _tmp, _y, retval
        switch (elementName) {
            case 'year':
                _tmp = utils.deepMerge({}, options)
                if (options.year === '4-digit') {
                    _tmp.year = 'numeric'
                }
                retval = parseInt(this._baseDate.toLocaleDateString(locale, _tmp), 10)
                _y = this._baseDate.getUTCFullYear()
                if (_y < 0) {
                    retval = (retval - 1) * -1
                } else if (_y == 0) {
                    retval = retval - 1
                }
                break
            case 'month':
            case 'day':
            case 'weekday':
            case 'era':
                retval = this._baseDate.toLocaleDateString(locale, options)
                break
            case 'hour':
                retval = this._baseDate.toLocaleTimeString(locale, options)
                if (utils.hasKey(options, 'hour12')) {
                    if (options.hour12 === false && parseInt(retval, 10) == 24) {
                        retval = 0
                    }
                } else if (utils.hasKey(options, 'hourCycle')) {
                    /* "hour12" takes precedence, so "hourCycle" is disabled.
                    switch (options.hourCycle) {
                        case 'h11':
                        case 'h12':
                        case 'h23':
                        case 'h24':
                            break
                    } */
                }
                if (/^(numeric|2-digit)$/.test(options.hour)) {
                    retval = parseInt(retval, 10)
                } else {
                    let _m = retval.match(/^(\d{2}):\d{2}:\d{2}(.*)$/)
                    if (_m) {
                        retval = `${_m[1]}${_m[2]}`
                    }
                }
                break
            case 'minute':
            case 'second':
                retval = this._baseDate.toLocaleTimeString(locale, options)
                break
            case 'week':
                retval = this._i.$W
                break
            case 'millisecond':
                retval = this._i.$MS
                break
            default:
                retval = null
                break
        }
        // Filtering
        retval = retval.toString()
        if (options[elementName] === '2-digit') {
            _tmp = parseInt(retval, 10)
            return Math.abs(_tmp).toString().length < 2
                   ? (_tmp < 0 ? '-': '') + Math.abs(_tmp).toString().padStart(2, '0')
                   : retval
        } else if (elementName === 'year' && options[elementName] === '4-digit') {
            _tmp = parseInt(retval, 10)
            return Math.abs(_tmp).toString().length < 4
                   ? (_tmp < 0 ? '-': '') + Math.abs(_tmp).toString().padStart(4, '0')
                   : retval
        } else if (elementName === 'millisecond' && options[elementName] === 'zerofill') {
            return retval.length == 3 ? retval : retval.padStart(3, '0')
        } else {
            return !isNaN(retval) ? parseInt(retval.toString(), 10) : retval
        }
    }

    /**
     * Alias as shorthand of "getLocaleDateElement" method.
     *
     * @public
     */
     getLDE(elementName, format=null, locale=null, timezone='UTC') {
        return this.getLocaleDateElement(elementName, format, locale, timezone)
    }

    /**
     * Returns the instantiated date in a formatted format by PHP's date_format()-like formatter.
     *
     * @public
     * @param {string}  formatter
     * @param {?string} locale
     * @param {?object} replacer - A replacer object can be specified to further replace the formatted string.
     *                             The key and value become the 1st and 2nd arguments of `replace()` function. 
     */
    format(formatter, locale=null, replacer=null) {
        if (!locale) {
            locale = this.config.locale
        } else if (typeof locale === 'object' && !replacer) {
            replacer = locale
            locale = this.config.locale
        }
        // Alphabet reserved as matcher identifier:
        //     "B","C","D",    "F","G","H","I",    "L","M","N",    "S",    "U","V","W","Y","Z",
        // "a","b","c","d","e","f","g","h","i","j","l","m","n","r","s","t","u","v","w","y","z" 
        const matcher = {
            // Year
            Y: this._i.$Y,// = this.getLDE('year', 'numeric', locale)
            y: this.getLDE('year', '2-digit', locale),
            f: this.getLDE('year', '4-digit', locale),
            L: this.getDaysInYear() == 366 ? 1 : 0,
            // Month
            F: this.getLDE('month', 'long', locale),
            m: this._i.$MON.toString().padStart(2, '0'),// = this.getLDE('month', '2-digit', locale)
            M: this.getLDE('month', 'short', locale),
            n: this._i.$MON,// = this.getLDE('month', 'numeric', locale)
            t: this.getDaysInMonth(),
            // Week
            W: this._i.$W,// = this.getWeekOfYear()
            // Day
            d: this._i.$D.toString().padStart(2, '0'),// = this.getLDE('day', '2-digit', locale)
            j: this._i.$D,// = this.getLDE('day', 'numeric', locale)
            z: this._i.$O,// = this.getCumulativeDays()
            // Weekday
            l: this.getLDE('weekday', 'long', locale),
            D: this.getLDE('weekday', 'short', locale),
            //N: [7, 1, 2, 3, 4, 5, 6][(this._i.timezone === 'UTC' ? this._baseDate.getUTCDay() : this._baseDate.getDay())],// ISO-8601 format numeric weekday: 1 (Monday) - 7 (Sunday)
            N: this._i.$WD,// = this.getWeekdayIndex('iso8601')
            //w: this._i.timezone === 'UTC' ? this._baseDate.getUTCDay() : this._baseDate.getDay(),// numeric weekday: 0 (Sunday) - 6 (Saturday)
            w: this.getWeekdayIndex(),
            // Hour
            a: this.getLDE('hour', {hour12: false, hour: 'numeric'}, locale) > 12 ? 1 : 0,// in morning:0 or afternoon:1
            g: parseInt(this.getLDE('hour', {hour12: true, hour: 'numeric'}, 'en-US'), 10),
            G: this._i.$H,// = this.getLDE('hour', {hour12: false, hour: 'numeric'}, locale)
            h: parseInt(this.getLDE('hour', {hour12: true, hour: '2-digit'}, 'en-US'), 10).toString().padStart(2, '0'),
            H: this._i.$H.toString().padStart(2, '0'),// = this.getLDE('hour', {hour12: false, hour: '2-digit'}, locale)
            // Minute
            C: this._i.$M,// = this.getLDE('minute', 'numeric', locale)
            i: this._i.$M.toString().padStart(2, '0'),// = this.getLDE('minute', '2-digit', locale)
            // Second
            S: this._i.$S,// = this.getLDE('second', 'numeric', locale)
            s: this._i.$S.toString().padStart(2, '0'),// = this.getLDE('second', '2-digit', locale)
            // Millisecond
            V: this._i.$MS,// = this.getLDE('millisecond')
            v: this._i.$MS.toString().padStart(3, '0'),// = this.getLDE('millisecond', 'zerofill')
            // TimeZone
            e: this.timezone,// = this._i.$TZ,
            Z: this._i.$TZ === 'UTC' ? 0 : this.getTZOffset('s'),
            I: this.isDST() ? 1 : 0,
            // Full Datetime
            c: this.getISO(),
            r: this.getRFC(2822),// RFC 2822 format date
            U: this.getUnixTime('s'),
            u: this.getUnixTime('ms'),
            B: this.getCEEpoch('s'),
            b: this.getCEEpoch('ms'),
        }
        let retval = [...formatter].reduce((acc, cur, idx, src) => {
            if (Object.keys(matcher).includes(cur)) {
                acc += matcher[cur]
            } else if (/\\/.test(cur)) {
                acc += src[idx + 1]
                delete src[idx + 1]
            } else {
                acc += cur
            }
            return acc
        }, '')
        if (replacer) {
            const REGEX_STR = /^\/(.*)\/([gsdimyu]*)?$/
            for (let [key, val] of Object.entries(replacer)) {
                if (key && typeof key === 'string') {
                    let _m = key.match(REGEX_STR),
                        re = null
                    if (_m) {
                        if (_m.length > 2) {
                            re = new RegExp(_m[1], _m[2])
                        } else if (_m.length > 1) {
                            re = new RegExp(_m[1])
                        }
                    } else {
                        re = key
                    }
                    if (re && val) {
                        retval = retval.replace(re, val)
                    }
                }
            }
        }
        return retval
    }

    /**
     * Gets new Sunorhc instance with a UTC date from the local timezone date.
     *
     * @public
     */
    getUTC() {
        if (this.config.timezone === 'UTC') {
            // Clone if an origin instance is UTC
            return this.clone()
        } else {
            // Make new if an origin instance is local timezone date
            const newConfig = utils.deepMerge({}, this.config)
            newConfig.timezone = 'UTC'
            newConfig.tzName = ''
            const sysTzOffset = new Date().getTimezoneOffset() * MS_A_MINUTE
            const newPayloads = [
                this._i.$Y,
                this._i.$MON,
                this._i.$D,
                this._i.$H,
                this._i.$M,
                this._i.$S,
                this._i.$MS + sysTzOffset,
                newConfig
            ]
            return wrapper(...newPayloads)
        }
    }

    /**
     * Converts the current Sunorhc instance to a Date object with a UTC date.
     *
     * @public
     */
    toUTCDate() {
        return this.config.timezone === 'UTC'
               ? this._baseDate
               : new Date(this._baseDate.getTime() + this._baseDate.getTimezoneOffset() * MS_A_MINUTE)
    }

    /**
     * Gets new Sunorhc instance of the local timezoned date from the UTC date.
     * Specification: `new Sunorhc().getZoned()` should be equal `new Sunorhc('local')`.
     * If an instance date is already in the local timezone, the same instance will be duplicated.
     * 
     * @public
     */
    getZoned() {
        // Make new if an origin instance is UTC date
        const newConfig = utils.deepMerge({}, this.config)
        newConfig.timezone = 'local'
        newConfig.tzName = ''
        const newPayloads = [
            this._i.$Y,
            this._i.$MON,
            this._i.$D,
            this._i.$H,
            this._i.$M,
            this._i.$S,
            this._i.$MS,
            newConfig
        ]
        if (this.config.timezone === 'UTC') {
            // When to zoned date from UTC
            newPayloads[6] = this._i.$MS - (this._baseDate.getTimezoneOffset() * MS_A_MINUTE)
        }
        return wrapper(...newPayloads)
    }

    /**
     * Converts the current Sunorhc instance to a Date object with a local timezoned date.
     *
     * @public
     */
     toZonedDate() {
        if (this.config.timezone === 'local') {
            return new Date(this._baseDate.getTime() + this._baseDate.getTimezoneOffset() * MS_A_MINUTE)
        } else {
            // from UTC date
            const _dt = this._baseDate,
                  _y  = _dt.getFullYear()
            let _local = new Date(_y, _dt.getMonth(), _dt.getDate(), _dt.getHours(), _dt.getMinutes(), _dt.getSeconds(), _dt.getMilliseconds())
            if (_y < 100) {
                _local = new Date(_local.setFullYear(_y))
            }
            return _local
        }
    }


    /**
     * Get the time difference from the UTC date in the timezone of the current system.
     *
     * @public
     * @param {?string} unit [unit=ms] - `s` as second or `ms` as millisecond, `full` or `hhmm` etc.
     */
    getTZOffset(unit='ms') {
        let _utcDt   = this.toUTCDate(),
            offsetMS = _utcDt.getTime() - this._baseDate.getTime()
        switch (true) {
            case /^h(|ours?)$/i.test(unit):
                return Math.round(offsetMS / MS_A_HOUR * 100) / 100
            case /^min(|utes?)$/i.test(unit):
                return Math.floor(offsetMS / MS_A_MINUTE)
            case /^s(|(ec(|onds?)))$/i.test(unit):
                return Math.floor(offsetMS / MS_A_SECOND)
            case /^(full|hhmm)$/i.test(unit):
                if (this.config.timezone !== 'UTC') {
                    let offsetH  = Math.floor(Math.abs(offsetMS) / MS_A_HOUR),
                        offsetM  = Math.floor((Math.abs(offsetMS) - (offsetH * MS_A_HOUR)) / MS_A_MINUTE),
                        offsetS  = Math.floor((Math.abs(offsetMS) - (offsetH * MS_A_HOUR + offsetM * MS_A_MINUTE)) / MS_A_SECOND),
                        remainMS = Math.abs(offsetMS) - (offsetH * MS_A_HOUR + offsetM * MS_A_MINUTE + offsetS * MS_A_SECOND),
                        signStr  = offsetMS <= 0 ? '+' : '-'
                    return /^full$/i.test(unit)
                           ? `${signStr}${offsetH.toString().padStart(2, '0')}:${offsetM.toString().padStart(2, '0')}:${offsetS.toString().padStart(2, '0')}.${remainMS.toString().padStart(3, '0')}`
                           : `${signStr}${offsetH.toString().padStart(2, '0')}:${offsetM.toString().padStart(2, '0')}`
                } else {
                    return /^full$/i.test(unit) ? '+00:00:00.000': '+00:00'
                }
            default:
                return offsetMS
        }
    }

    /**
     * Calculates the date added or subtracted by the specified unit to the instantiated date.
     *
     * @public
     * @param {number} payload - Integer of the quantity to be increased or decreased; To decrease the value, specify a negative value
     * @param {string} unit    - Unit of quantity specified as payload
     */
    modify(payload, unit) {
        payload = parseInt(payload, 10)
        if (isNaN(payload) || typeof unit !== 'string' || !REGEX_UNITS.test(unit)) {
            return false
        }
        const _bs = {
                  y:  this._i.$Y,
                  m:  this._i.$MON,
                  w:  this._i.week,
                  d:  this._i.$D,
                  h:  this._i.$H,
                  mi: this._i.$M,
                  s:  this._i.$S,
                  ms: this._i.$MS,
                  tz: this.config.timezone,
              }
        let _modDt = null, _tmp
        switch (true) {
            case /^years?$/i.test(unit):
                _modDt = wrapper(_bs.y + payload, _bs.m, _bs.d, _bs.h, _bs.mi, _bs.s, _bs.ms, _bs.tz)
                break
            case /^months?$/i.test(unit):
                _modDt = wrapper(_bs.y, _bs.m + payload, _bs.d, _bs.h, _bs.mi, _bs.s, _bs.ms, _bs.tz)
                break
            case /^weeks?$/i.test(unit):
                _tmp = _bs.d + (payload * 7)
                if (_tmp == 0) {
                    _modDt = wrapper(_bs.y, _bs.m, _bs.d, _bs.h - 24, _bs.mi, _bs.s, _bs.ms, _bs.tz)
                } else {
                    _modDt = wrapper(_bs.y, _bs.m, _tmp, _bs.h, _bs.mi, _bs.s, _bs.ms, _bs.tz)
                }
                break
            case /^days?$/i.test(unit):
                _tmp = _bs.d + payload
                if (_tmp == 0) {
                    _modDt = wrapper(_bs.y, _bs.m, _bs.d, _bs.h - 24, _bs.mi, _bs.s, _bs.ms, _bs.tz)
                } else {
                    _modDt = wrapper(_bs.y, _bs.m, _tmp, _bs.h, _bs.mi, _bs.s, _bs.ms, _bs.tz)
                }
                break
            case /^h(|ours?)$/i.test(unit):
                _modDt = wrapper(_bs.y, _bs.m, _bs.d, _bs.h + payload, _bs.mi, _bs.s, _bs.ms, _bs.tz)
                break
            case /^min(|utes?)$/i.test(unit):
                _modDt = wrapper(_bs.y, _bs.m, _bs.d, _bs.h, _bs.mi + payload, _bs.s, _bs.ms, _bs.tz)
                break
            case /^sec(|onds?)$/i.test(unit):
                _modDt = wrapper(_bs.y, _bs.m, _bs.d, _bs.h, _bs.mi, _bs.s + payload, _bs.ms, _bs.tz)
                break
            case /^m(s|illiseconds?)$/i.test(unit):
                _modDt = wrapper(_bs.y, _bs.m, _bs.d, _bs.h, _bs.mi, _bs.s, _bs.ms + payload, _bs.tz)
                break
        }
        return _modDt.isValid() ? _modDt : INVALID_DATE
    }

    /**
     * Alias as shorthand of "modify" method.
     *
     * @public
     */
    mod(payload, unit) {
        return this.modify(payload, unit)
    }

    /**
     * Get calculated interval between the instantiated date and a specific date, with the 
     * specified unit.
     *
     * @public
     * @param {string} compare
     * @param {?string} unit
     */
    interval(compare, unit=null) {
        const compareObj = wrapper(compare)
        if (!compare || compareObj === INVALID_DATE || !compareObj.isValid()) {
            return false
        }
        let diffMs = compareObj.instant.$UMS - this._i.$UMS,
            diffDays = Math.ceil(diffMs / MS_A_DAY)
        switch (true) {
            case /^years?$/i.test(unit):
                if (Math.abs(diffDays) < MIN_YEAR_DAYS) {
                    return 0
                } else
                    if (Math.abs(diffDays) > AVG_YEAR_DAYS) {
                    return (Math.ceil(diffDays / AVG_YEAR_DAYS * 10) / 10)
                } else {
                    return 1
                }
            case /^months?$/i.test(unit):
                if (Math.abs(diffDays) < MIN_MONTH_DAYS) {
                    return 0
                } else
                if (Math.abs(diffDays) > AVG_MONTH_DAYS) {
                    return (Math.ceil(diffDays / AVG_MONTH_DAYS * 10) / 10)
                } else {
                    return 1
                }
            case /^weeks?$/i.test(unit):
                return (Math.ceil(diffMs / MS_A_WEEK * 10) / 10)
            case /^days?$/i.test(unit):
                return Math.ceil(diffMs / MS_A_DAY)
            case /^hours?$/i.test(unit):
                return Math.ceil(diffMs / MS_A_HOUR)
            case /^min(|utes?)$/i.test(unit):
                return Math.ceil(diffMs / MS_A_MINUTE)
            case /^sec(|onds?)$/i.test(unit):
                return Math.ceil(diffMs / MS_A_SECOND)
            case /^m(s|illiseconds?)$/i.test(unit):
            default:
                if (Number.MAX_SAFE_INTEGER < diffMs) {
                    diffMs = BI(diffMs)
                }
                return diffMs
        }
    }

    /**
     * Duplicate an instance of a Sunorhc object.
     *
     * @public
     */
    clone() {
        const datePayloads = [
            this._i.$Y,
            this._i.$MON,
            this._i.$D,
            this._i.$H,
            this._i.$M,
            this._i.$S,
            this._i.$MS,
            utils.deepMerge({}, this.config)
        ]
        return wrapper(...datePayloads)
    }

    /**
     * Determines if the Date object given in the argument is valid.
     * Evaluates the instance's own date if there are no arguments or if the argument is not 
     * a date object.
     *
     * @public
     * @param {?any} date 
     */
    isValid(date=null) {
        let chkDate = date
                      ? (date instanceof Date ? date : new Date(date))
                      : this._baseDate
        return !(chkDate.toString() === INVALID_DATE)
    }

    /**
     * The week number for the year is calculated.
     *
     * @public
     */
    getWeekOfYear() {
        const _isUTC = this.config.timezone === 'UTC',
              _y = utils.hasKey(this, '_i')
                   ? this._i.$Y
                   : (_isUTC ? this._baseDate.getUTCFullYear() : this._baseDate.getFullYear())
        let firstDayOfYear = _isUTC
                            ? new Date(Date.UTC(_y, 0, 1))
                            : new Date(_y, 0, 1)
        if (_y < 100) {
            firstDayOfYear = _isUTC
                            ? new Date(firstDayOfYear.setUTCFullYear(_y))
                            : new Date(firstDayOfYear.setFullYear(_y))
        }
        let dayOfYear = (this._baseDate.getTime() - firstDayOfYear.getTime() + MS_A_DAY) / MS_A_DAY
        return Math.ceil(dayOfYear / 7)
    }

    /**
     * The total number of days in the year on the instantiated date is calculated.
     *
     * @public
     */
    getDaysInYear() {
        let _y  = this.config.timezone === 'UTC' ? this._baseDate.getUTCFullYear() : this.toZonedDate().getFullYear(),
            isLeapYear = _y % 4 == 0
        return isLeapYear ? 366 : 365
    }

    /**
     * The total number of days in the month on the instantiated date is calculated.
     *
     * @public
     */
    getDaysInMonth() {
        const _y = this.config.timezone === 'UTC' ? this._baseDate.getUTCFullYear() : this.toUTCDate().getUTCFullYear(),
              _m = this.config.timezone === 'UTC' ? this._baseDate.getUTCMonth() : this.toUTCDate().getUTCMonth()
        let _nmDt = new Date(Date.UTC(_y, _m + 1, 1, 0, 0, 0, 0)),
            _lmDt, lastDay
        if (_y < 100) {
            _nmDt = new Date(_nmDt.setUTCFullYear(_y))
        }
        _lmDt = new Date(_nmDt.getTime() - 1)
        lastDay = _lmDt.getUTCDate()
        return lastDay
    }

    /**
     * Get cumulative days in year untill current day from first day of year.
     *
     * @public
     */
    getCumulativeDays() {
        const _y = this._baseDate.getUTCFullYear()
        let _fDt = new Date(Date.UTC(_y, 0, 1, 0, 0, 0, 0)),
            _mtime = utils.hasKey(this, '_i') ? this._i.$UMS : this.getUnixTime('ms')
        if (_y < 100) {
            _fDt = new Date(_fDt.setUTCFullYear(_y)) 
        }
        if (this.config.timezone === 'local') {
            _mtime -= this.config.offset
        }
        return Math.abs(Math.floor((_mtime - _fDt.getTime()) / MS_A_DAY))
    }

    /**
     * Get the numeric index of weekday depended on specified format.
     *
     * @public
     * @param {?string} format - "iso8601" or that else can be specified; otherwise, no argument is specified
     */
    getWeekdayIndex(format=null) {
        if (/^iso8601$/i.test(format)) {
            // ISO-8601 format numeric weekday: 1 (Monday) - 7 (Sunday)
            return [7, 1, 2, 3, 4, 5, 6][(this.config.timezone === 'UTC' ? this._baseDate.getUTCDay() : this.toUTCDate().getDay())]
        } else {
            // numeric weekday: 0 (Sunday) - 6 (Saturday)
            return this.config.timezone === 'UTC' ? this._baseDate.getUTCDay() : this.toUTCDate().getDay()
        }
     }

    /**
     * Get the ISO 8601 string of date and time depended on specified format.
     * Note: If the instance datetime is local time, it will be formatted as UTC datetime.
     *
     * @public
     * @param {?string} format [format=full] - "date", "week", "weekday", "ordinal", "time", "offset", "noz" or "full".
     */
    getISO(format="full") {
        const _i = this._i,
              _dtP = {
                y:  Math.abs(_i.$Y) < 1000
                    ? (_i.$Y < 0 ? '-': '') + Math.abs(_i.$Y).toString().padStart(4, '0')
                    : _i.$Y.toString(),
                m:  _i.$MON.toString().padStart(2, '0'),
                d:  _i.$D.toString().padStart(2, '0'),
                w:  `W${_i.$W.toString().padStart(2, '0')}`,
                wd: _i.$WD,
                o:  this.getCumulativeDays(),
                h:  _i.$H.toString().padStart(2, '0'),
                mi: _i.$M.toString().padStart(2, '0'),
                s:  _i.$S.toString().padStart(2, '0'),
                ms: _i.$MS.toString().padStart(3, '0'),
                of: _i.$TZOL,
            }
        switch (true) {
            case /^date$/i.test(format):
                return `${_dtP.y}-${_dtP.m}-${_dtP.d}`
            case /^week$/i.test(format):
                return `${_dtP.y}-${_dtP.w}`
            case /^weekday$/i.test(format):
                return `${_dtP.y}-${_dtP.w}-${_dtP.wd}`
            case /^ordinal$/i.test(format):
                return `${_dtP.y}-${_dtP.o}`
            case /^time$/i.test(format):
                return `${_dtP.h}:${_dtP.mi}:${_dtP.s}.${_dtP.ms}`
            case /^offset$/i.test(format):
                return _dtP.of
            case /^noz$/i.test(format):
                // The offset in "HH:mm" format is given instead of the suffix "Z" in the UTC time zone.
                return `${_dtP.y}-${_dtP.m}-${_dtP.d}T${_dtP.h}:${_dtP.mi}:${_dtP.s}.${_dtP.ms}${_dtP.of}`
            default:
                if (this.config.timezone === 'UTC') {
                    _dtP.of = 'Z'
                }
                return `${_dtP.y}-${_dtP.m}-${_dtP.d}T${_dtP.h}:${_dtP.mi}:${_dtP.s}.${_dtP.ms}${_dtP.of}`
        }
     }

    /**
     * Get the RFC xxxx string as legacy date and time format.
     * We no longer recommend the use of this format.
     *
     * @public
     * @param {?number} format - enabled format is 2822, 3339
     */
    getRFC(format=null) {
        let _origin = this._baseDate.toString(),
            _i      = this._i,
            _year   = Math.abs(_i.$Y) < 1000
                      ? (_i.$Y < 0 ? '-': '') + Math.abs(_i.$Y).toString().padStart(4, '0')
                      : _i.$Y,
            _month  = _i.$MON.toString().padStart(2, '0'),
            _day    = _i.$D.toString().padStart(2, '0'),
            _hour   = _i.$H.toString().padStart(2, '0'),
            _minute = _i.$M.toString().padStart(2, '0'),
            _second = _i.$S.toString().padStart(2, '0'),
            _offset = _i.$TZOL.replace(':', ''),
            _parsed = _origin.split(/\s*\(/).pop().replace(')', '') || null
        switch (true) {
            case /^2822$/.test(format):
                _offset = _i.$TZO == 0 && !this.hasDST() ? 'GMT' : _offset
                return `${_i.$WDS}, ${_day} ${_i.$MONS} ${_year} ${_hour}:${_minute}:${_second} ${_offset}`
            case /^3339$/i.test(format):
                return `${_year}-${_month}-${_day}T${_hour}:${_minute}:${_second}${_offset}`
            default:
                _offset = `GMT${_offset}`
                if (_parsed) {
                    _offset += this.config.timezone === 'UTC' ? ` (UTC)` : ` (${_parsed})`
                }
                return `${_i.$WDS} ${_i.$MONS} ${_day} ${_year} ${_hour}:${_minute}:${_second} ${_offset}`
        }
    }

    /**
     * Whether or not the timezone to which the instance's primitive datatime belongs observes DST.
     *
     * @public
     */
    hasDST() {
        if (this.config.timezone === 'UTC') {
            return false
        }
        if (!utils.hasKey(this, '_cacheDST')) {
            const fy  = this._baseDate.getFullYear()
            let _dt = new Date(fy, 0, 1)
            if (fy < 100) {
                _dt = new Date(_dt.setFullYear(fy))
            }
            this._cacheDST = [_dt.getTimezoneOffset()]
            for (let mi = 1; mi < 12; mi++) {
                let _tmp = new Date(fy, mi, 1)
                if (fy < 100) {
                    _tmp = new Date(_tmp.setFullYear(fy))
                }
                this._cacheDST.push(_tmp.getTimezoneOffset())
            }
        }
        return Math.min(...this._cacheDST) < Math.max(...this._cacheDST)
    }

    /**
     * Whether the primitive datetime of the instance is during DST or not.
     *
     * @public
     */
     isDST() {
        if (!this.hasDST()) {
            return false
        }
        return this._baseDate.getTimezoneOffset() == Math.min(...this._cacheDST)
    }

    /**
     * Get the time difference when the instance's timezone observes DST.
     * Returns the relative value of the time difference between local time and DST.
     *
     * @public
     * @param {?string} unit [unit=ms] - allowed units are "hour", "minute", "second" or "millisecond".
     */
     getDSTOffset(unit='ms') {
        if (!this.isDST()) {
            return 0
        }
        const offsetMS = (Math.min(...this._cacheDST) * MS_A_MINUTE) - (Math.max(...this._cacheDST) * MS_A_MINUTE)
        switch (true) {
            case /^h(|ours)?$/i.test(unit):
                return offsetMS / MS_A_HOUR
            case /^min(|utes?)$/i.test(unit):
                return offsetMS / MS_A_MINUTE
            case /^s(|(ec(|onds?)))$/i.test(unit):
                return offsetMS / MS_A_SECOND
            case /^(ms|milliseconds?)$/i.test(unit):
            default:
                return offsetMS
        }
    }

    /**
     * Getters
     *
     * @public
     */
    get version() {
        return `v${this.config.version}`
    }

    get instant() {
        return Object.assign({}, this._i)
    }

    get toDate() {
        return this._baseDate
    }

    get toString() {
        return this.getRFC()
    }

    get toISOString() {
        return this.getISO()
    }

    get year() {
        return this._i.$Y
    }

    get month() {
        return this._i.$MON
    }

    get monthLong() {
        return this._i.$MONL
    }

    get monthShort() {
        return this._i.$MONS
    }

    get week() {
        return this._i.$W
    }

    get day() {
        return this._i.$D
    }

    get weekday() {
        return this._i.$WD
    }

    get weekdayLong() {
        return this._i.$WDL
    }

    get weekdayShort() {
        return this._i.$WDS
    }

    get ordinalDays() {
        return this._i.$O
    }

    get hour() {
        return this._i.$H
    }

    get minute() {
        return this._i.$M
    }

    get second() {
        return this._i.$S
    }

    get millisecond() {
        return this._i.$MS
    }

    get timezone() {
        return utils.hasKey(this.config, 'tzName') && this.config.tzName !== '' ? this.config.tzName : this._i.$TZ
    }

    get tzOffset() {
        return this._i.$TZO
    }

    get tzOffsetHM() {
        return this._i.$TZOL
    }

    get tzOffsetFull() {
        return this._i.$TZOF
    }

    get era() {
        return this._i.$E
    }

    get unix() {
        return /^(ms|milliseconds?)$/i.test(this.config.epochUnit) ? this._i.$UMS : this._i.$U
    }

    get ce() {
        return /^(ms|milliseconds?)$/i.test(this.config.epochUnit) ? this._i.$CEMS : this._i.$CE
    }


}

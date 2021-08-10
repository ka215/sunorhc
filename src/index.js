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
        
        //console.log('::constructor:', payloads)
        return this._init(payloads)
        //return this
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
        let _argsIsUTC = true
        this.config.offset = _now.getTimezoneOffset() * 60000// an unit is milliseconds
        this.config.dateArgs = {
            $y:  _now.getUTCFullYear(),
            $m:  _now.getUTCMonth(),
            $d:  _now.getUTCDate(),
            $h:  _now.getUTCHours(),
            $mi: _now.getUTCMinutes(),
            $s:  _now.getUTCSeconds(),
            $ms: _now.getUTCMilliseconds(),
        }
        //console.log('::_parse():', payloads)
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
                            this.config.dateArgs = {
                                $y:  d[1],
                                $m:  typeof d[2] === 'undefined' ? 0 : d[2] - 1,
                                $d:  typeof d[3] === 'undefined' ? 1 : d[3],
                                $h:  typeof d[4] === 'undefined' ? 0 : d[4],
                                $mi: typeof d[5] === 'undefined' ? 0 : d[5],
                                $s:  typeof d[6] === 'undefined' ? 0 : d[6],
                                $ms: typeof d[7] === 'undefined' ? 0 : parseInt(d[7].substring(0, 3), 10),
                            }
                            _argsIsUTC = false
                            payloads.shift()
                        } else if (!_fa.match(REGEX_TZNAME)) {
                            // When an ambiguous string is given as the datetime
                            let _preDt = new Date(_fa)
                            //console.log('String argument given!:', _fa, _preDt, this.isValid(_preDt))
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
                                payloads.shift()
                            }
                        }
                    }
                }
            }
            let lastElm = payloads.splice(-1, 1)[0]
            //console.log('!_:', lastElm, payloads, this.config.dateArgs)
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
                } else {
                    // Set the "local" timezone with timezone name
                    this.config.timezone = 'local'
                    if (lastElm.match(REGEX_TZNAME)) {
                        this.config.tzName = lastElm
                    } else {
                        console.warn(`[Sunorhc] An invalid timezone name was given: "${lastElm}"`)
                    }
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
                    console.warn(`[Sunorhc] The argument contains an invalid value.`)
                }
            }
            //console.log('!!_:', payloads)
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
                } else {
                    // When the first argument for constructor is interpreted as the numeric year (for defaults).
                    let _y = typeof payloads[0] === 'number' ? payloads[0] : parseInt(payloads[0].toString(), 10)
                    //console.log('@-@:', _y)
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
                    }
                }
            }
        } else {
            // If the constructor has no arguments
            //console.log('!!!_:', this.config.dateArgs)
        }
        if (!utils.hasKey(this.config, 'dateArgs')) {
            throw '[Sunorhc] Failed to set options for initializing object.'
        }
        // Set the primitive datetime as "_baseDate"
        let _utcDt   = new Date(Date.UTC(...keys.map(v => this.config.dateArgs[v]))),
            _zonedDt = null
        if (this.config.dateArgs.$y < 100) {
            _utcDt = new Date(_utcDt.setUTCFullYear(this.config.dateArgs.$y))
        }
        _zonedDt = _argsIsUTC ? new Date(_utcDt.getTime() - this.config.offset): new Date(_utcDt.getTime())
        //console.log('!_:', this.config.dateArgs, _argsIsUTC, _utcDt, _zonedDt)
        if (this.config.timezone === 'UTC') {
            this._baseDate = this.isValid(_utcDt) ? _utcDt : INVALID_DATE
            this.config.offset = 0
        } else {
            this._baseDate = this.isValid(_zonedDt) ? _zonedDt : INVALID_DATE
        }
        //console.log('_baseDate:', this._baseDate)
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
            $Y:    parseInt(this.getLocaleDateElement('year', 'numeric', _locale), 10),
            $MON:  parseInt(this.getLocaleDateElement('month', 'numeric', _locale), 10),
            $MONL: this.getLocaleDateElement('month', 'long', _locale),
            $MONS: this.getLocaleDateElement('month', 'short', _locale),
            $W:    this.getWeekOfYear(),
            $D:    parseInt(this.getLocaleDateElement('day', 'numeric', _locale), 10),
            $WD:   this.getWeekdayIndex('iso8601'),
            $WDL:  this.getLocaleDateElement('weekday', 'long', _locale),
            $WDS:  this.getLocaleDateElement('weekday', 'short', _locale),
            $H:    parseInt(this.getLocaleDateElement('hour', {hour12: false, hour: 'numeric'}, _locale), 10),
            $M:    parseInt(this.getLocaleDateElement('minute', 'numeric', _locale), 10),
            $S:    parseInt(this.getLocaleDateElement('second', 'numeric', _locale), 10),
            $MS:   this.config.timezone === 'UTC' ? this._baseDate.getUTCMilliseconds() : this._baseDate.getMilliseconds(),
            $TZ:   this.config.timezone || 'UTC',
            $TZO:  this.config.timezone === 'UTC' ? 0 : this.getTZOffset(),
            $TZOL: this.getTZOffset('hhmm'),     
            $TZOF: this.getTZOffset('full'),     
            $U:    this.getUnixTime('s'),
            $UMS:  this.getUnixTime('ms'),
            $E:    this.getLocaleDateElement('era', 'long', _locale),
            $CE:   this.getCEEpoch('s'),
            $CEMS: this.getCEEpoch('ms'),
        }) : null
        //delete this.config.dateArgs

        Object.freeze(this.config)

        return this
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
            unit = /^sec(|onds)?$/i.test(this.config.epochUnit) ? 's' : 'ms'
        }
        let _time = this._baseDate.getTime(),
            _tzos = this.getTZOffset()
        if (this.config.timezone !== 'UTC' && _tzos != 0) {
            _time = _time + _tzos
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
            unit = /^sec(|onds)?$/i.test(this.config.epochUnit) ? 's' : 'ms'
        }
        /*
        let _dt   = this._baseDate,
            _ceDt = new Date(Date.UTC(1, 0, 1, 0, 0, 0, 0)),
            _ceEpoch = _ceDt.setUTCFullYear(1)
        console.log('getCEEpoch:', _ceEpoch, CE_EPOCH_UNIX)
        return Math.floor((_dt.getTime() + Math.abs(_ceEpoch)) / (unit === 's' ? 1000 : 1))
        */
        return Math.floor((this._baseDate.getTime() + Math.abs(CE_EPOCH_UNIX)) / (unit === 's' ? 1000 : 1))

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
            //if (Object.prototype.hasOwnProperty.call(this.config.localeFormats, elementName)) {
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
        if (timezone !== 'local') {
            options.timeZone = timezone
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
                //console.log(options)
                if (utils.hasKey(options, 'hour12')) {
                    retval = options.hour12 ? retval : (retval == 24 ? 0 : retval)
                } else if (utils.hasKey(options, 'hourCycle')) {
                    // "hour12" takes precedence, so "hourCycle" is disabled.
                    /*
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
            //console.log('year.4-digit:', retval, _tmp)
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
        return this.modify(elementName, format, locale, timezone)
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
        const matcher = {
            // Year
            Y: this._i.$Y,// this.getLocaleDateElement('year', 'numeric', locale),
            y: this.getLocaleDateElement('year', '2-digit', locale),
            f: this.getLocaleDateElement('year', '4-digit', locale),
            L: this.getDaysInYear() == 366 ? 1 : 0,
            // Month
            F: this.getLocaleDateElement('month', 'long', locale),
            m: this._i.$MON.toString().padStart(2, '0'),// this.getLocaleDateElement('month', '2-digit', locale),
            M: this.getLocaleDateElement('month', 'short', locale),
            n: this._i.$MON,// this.getLocaleDateElement('month', 'numeric', locale),
            t: this.getDaysInMonth(),
            // Week
            W: this.getWeekOfYear(),
            // Day
            d: this._i.$D.toString().padStart(2, '0'),// this.getLocaleDateElement('day', '2-digit', locale),
            j: this._i.$D,// this.getLocaleDateElement('day', 'numeric', locale),
            z: this.getCumulativeDays(),
            // Weekday
            l: this.getLocaleDateElement('weekday', 'long', locale),
            D: this.getLocaleDateElement('weekday', 'short', locale),
            //N: [7, 1, 2, 3, 4, 5, 6][(this._i.timezone === 'UTC' ? this._baseDate.getUTCDay() : this._baseDate.getDay())],// ISO-8601 format numeric weekday: 1 (Monday) - 7 (Sunday)
            N: this.getWeekdayIndex('iso8601'),
            //w: this._i.timezone === 'UTC' ? this._baseDate.getUTCDay() : this._baseDate.getDay(),// numeric weekday: 0 (Sunday) - 6 (Saturday)
            w: this.getWeekdayIndex(),
            // Hour
            a: this.getLocaleDateElement('hour', {hour12: false, hour: 'numeric'}, locale) > 12 ? 1 : 0,// in morning:0 or afternoon:1
            g: parseInt(this.getLocaleDateElement('hour', {hour12: true, hour: 'numeric'}, 'en-US'), 10),
            G: this._i.$H,// this.getLocaleDateElement('hour', {hour12: false, hour: 'numeric'}, locale),
            h: parseInt(this.getLocaleDateElement('hour', {hour12: true, hour: '2-digit'}, 'en-US'), 10).toString().padStart(2, '0'),
            H: this._i.$H.toString().padStart(2, '0'),// this.getLocaleDateElement('hour', {hour12: false, hour: '2-digit'}, locale),
            // Minute
            I: this._i.$M,// this.getLocaleDateElement('minute', 'numeric', locale),
            i: this._i.$M.toString().padStart(2, '0'),// this.getLocaleDateElement('minute', '2-digit', locale),
            // Second
            S: this._i.$S,// this.getLocaleDateElement('second', 'numeric', locale),
            s: this._i.$S.toString().padStart(2, '0'),// this.getLocaleDateElement('second', '2-digit', locale),
            // Millisecond
            V: this._i.$MS,// this.getLocaleDateElement('millisecond'),
            v: this._i.$MS.toString().padStart(3, '0'),// this.getLocaleDateElement('millisecond', 'zerofill'),
            // TimeZone
            e: this.timezone,// this._i.$TZ,
            Z: this._i.$TZ === 'UTC' ? 0 : this.getTZOffset('s'),
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
     * 
     * @public
     */
    getZoned() {
        if (this.config.timezone === 'local') {
            // Clone if an origin instance is local timezoned
            return this.clone()
        } else {
            // Make new if an origin instance is UTC date
            const newConfig = utils.deepMerge({}, this.config)
            newConfig.timezone = 'local'
            newConfig.tzName = ''
            const sysTzOffset = new Date().getTimezoneOffset() * MS_A_MINUTE
            const newPayloads = [
                this._i.$Y,
                this._i.$MON,
                this._i.$D,
                this._i.$H,
                this._i.$M,
                this._i.$S,
                this._i.$MS - sysTzOffset,
                newConfig
            ]
            return wrapper(...newPayloads)
        }
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
                return Math.round(offsetMS / MS_A_HOUR * 10) / 10
            case /^min(|utes?)$/i.test(unit):
                return Math.floor(offsetMS / MS_A_MINUTE)
            case /^sec(|onds?)$/i.test(unit):
                return Math.floor(offsetMS / MS_A_SECOND)
            case /^(full|hhmm)$/i.test(unit):
                if (this.config.timezone !== 'UTC') {
                    let offsetH  = Math.floor(Math.abs(offsetMS) / MS_A_HOUR),
                        offsetM  = Math.floor((Math.abs(offsetMS) - (offsetH * MS_A_HOUR)) / MS_A_MINUTE),
                        offsetS  = Math.floor((Math.abs(offsetMS) - (offsetH * MS_A_HOUR + offsetM * MS_A_MINUTE)) / MS_A_SECOND),
                        remainMS = Math.abs(offsetMS) - (offsetH * MS_A_HOUR + offsetM * MS_A_MINUTE + offsetS * MS_A_SECOND),
                        signStr  = offsetMS < 0 ? '+' : '-'
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
            case /^hours?$/i.test(unit):
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
     * @param {?object} date - must be the Date object if given
     */
    getWeekOfYear(date=null) {
        let _dt = date ? date : this._baseDate,
            firstDayOfYear = this.config.timezone === 'UTC'
                             ? new Date(Date.UTC(_dt.getUTCFullYear(), 0, 1))
                             : new Date(_dt.getFullYear(), 0, 1)
        if (_dt.getFullYear() < 100) {
            firstDayOfYear = this.config.timezone === 'UTC'
                             ? new Date(firstDayOfYear.setUTCFullYear(_dt.getUTCFullYear()))
                             : new Date(firstDayOfYear.setFullYear(_dt.getFullYear()))
        }
        let dayOfYear = (_dt.getTime() - firstDayOfYear.getTime() + MS_A_DAY) / MS_A_DAY
        return Math.ceil(dayOfYear / 7)
    }

    /**
     * The total number of days in the year on the instantiated date is calculated.
     *
     * @public
     * @param {?object} date - must be the Date object if given
     */
    getDaysInYear(date=null) {
        let _dt = date ? date : this._baseDate,
            _y  = this.config.timezone === 'UTC' ? _dt.getUTCFullYear() : _dt.getFullYear(),
            isLeapYear = _y % 4 == 0
        return isLeapYear ? 366 : 365
    }

    /**
     * The total number of days in the month on the instantiated date is calculated.
     *
     * @public
     * @param {?object} date - must be the Date object if given
     */
    getDaysInMonth(date=null) {
        let _dt = date ? date : this._baseDate,
            _y, _m, _nmDt, _lmDt, lastDay
        if (this.config.timezone === 'UTC') {
            _y  = _dt.getUTCFullYear()
            _m  = _dt.getUTCMonth()
            _nmDt = new Date(Date.UTC(_y, _m + 1, 1, 0, 0, 0, 0))
            if (_y < 100) {
                _nmDt = new Date(_nmDt.setUTCFullYear(_y))
            }
            _lmDt = new Date(_nmDt.getTime() - 1)
            lastDay = _lmDt.getUTCDate()
        } else {
            _y  = _dt.getFullYear()
            _m  = _dt.getMonth()
            _nmDt = new Date(_y, _m + 1, 1, 0, 0, 0, 0)
            if (_y < 100) {
                _nmDt = new Date(_nmDt.setFullYear(_y))
            }
            _lmDt = new Date(_nmDt.getTime() - 1)
            lastDay = _lmDt.getDate()
        }
        return lastDay
    }

    /**
     * Get cumulative days in year untill current day from first day of year.
     *
     * @public
     * @param {?object} date - must be the Date object if given
     */
    getCumulativeDays(date=null) {
        let _dt = date ? date : this._baseDate,
            _y, _fDt, _diff
        if (this.config.timezone === 'UTC') {
            _y = _dt.getUTCFullYear()
            _fDt = new Date(Date.UTC(_y, 0, 1, 0, 0, 0, 0))
            if (_y < 100) {
                _fDt = new Date(_fDt.setUTCFullYear(_y))
            }
        } else {
            _y = _dt.getFullYear()
            _fDt = new Date(_y, 0, 1, 0, 0, 0, 0)
            if (_y < 100) {
                _fDt = new Date(_fDt.setFullYear(_y))
            }
        }
        _diff = _dt.getTime() - _fDt.getTime()
        return Math.floor(_diff / MS_A_DAY)
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
            return [7, 1, 2, 3, 4, 5, 6][(this.config.timezone === 'UTC' ? this._baseDate.getUTCDay() : this._baseDate.getDay())]
        } else {
            // numeric weekday: 0 (Sunday) - 6 (Saturday)
            return this.config.timezone === 'UTC' ? this._baseDate.getUTCDay() : this._baseDate.getDay()
        }
     }

    /**
     * Get the ISO 8601 string of date and time depended on specified format.
     *
     * @public
     * @param {?string} format [format=full] - "date", "week", "weekday", "ordinal", "time", "offset", "noz" or "full".
     */
    getISO(format="full") {
        let _dtP = {
            y:  Math.abs(this._i.$Y) < 1000
                ? (this._i.$Y < 0 ? '-': '') + Math.abs(this._i.$Y).toString().padStart(4, '0')
                : this._i.$Y.toString(),
            m:  this._i.$MON.toString().padStart(2, '0'),
            d:  this._i.$D.toString().padStart(2, '0'),
            w:  `W${this._i.$W.toString().padStart(2, '0')}`,
            wd: this.getWeekdayIndex('iso8601'),
            o:  this.getCumulativeDays().toString().padStart(3, '0'),
            h:  this._i.$H.toString().padStart(2, '0'),
            mi: this._i.$M.toString().padStart(2, '0'),
            s:  this._i.$S.toString().padStart(2, '0'),
            ms: this._i.$MS.toString().padStart(3, '0'),
            of: this._i.$TZOL,
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
                return `${_dtP.y}-${_dtP.m}-${_dtP.d}T${_dtP.h}:${_dtP.mi}:${_dtP.s}.${_dtP.ms}${_dtP.of}`
            default:
                if (this.config.timezone === 'UTC' && this._i.$TZO == 0) {
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
                _offset = _i.$TZO == 0 ? 'GMT' : _offset
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

import utils from './utils'
import defaults from './defaults'

const REGEX_PARSE  = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/
const REGEX_UNITS  = /^((year|month|week|day|hour|minute|second|millisecond)s?|min|sec|ms)$/i
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
        //console.log(utils.cloneObject(this.config))
        // Parse payloads
        this.parse(payloads)
        
        this.init()
        
        return this
    }

    /**
     * Parse payloads
     *
     * @param {array} payloads
     */
    parse (payloads) {
        const keys = ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond']
        let _now = new Date()// today
        this.config.offset = _now.getTimezoneOffset() * 60000// an unit is milliseconds
        this.config.dateArgs = {
            year:        _now.getFullYear(),
            month:       _now.getMonth(),
            day:         _now.getDate(),
            hour:        _now.getHours(),
            minute:      _now.getMinutes(),
            second:      _now.getSeconds(),
            millisecond: _now.getMilliseconds(),
        }
        // parse payloads
        if (Array.isArray(payloads) && payloads.length > 0) {
            if (typeof payloads[0] !== 'number') {
                if (payloads[0] instanceof Date) {
                    // When the first argument is an instance of the Date object
                    let _dt = new Date(payloads[0])
                    this.config.dateArgs = {
                        year:        _dt.getFullYear(),
                        month:       _dt.getMonth(),
                        day:         _dt.getDate(),
                        hour:        _dt.getHours(),
                        minute:      _dt.getMinutes(),
                        second:      _dt.getSeconds(),
                        millisecond: _dt.getMilliseconds(),
                    }
                    payloads.shift()
                } else
                if (typeof payloads[0] === 'string') {
                    if (/^[0-9]{1,}$/i.test(payloads[0])) {
                        // When the first argument is a numeric string
                        payloads[0] = parseInt(payloads[0], 10)
                    } else {
                        // When the first argument is a string as kind of the date
                        const d = payloads[0].match(REGEX_PARSE)
                        if (d) {
                            this.config.dateArgs = {
                                year:        d[1],
                                month:       d[2] - 1 || 0,
                                day:         d[3] || 1,
                                hour:        d[4] || 0,
                                minute:      d[5] || 0,
                                second:      d[6] || 0,
                                millisecond: parseInt((d[7] || '0').substring(0, 3), 10),
                            }
                        } else {
                            let _preDt = new Date(payloads[0])
                            if (this.isValid(_preDt)) {
                                this.config.dateArgs = {
                                    year:        _preDt.getFullYear(),
                                    month:       _preDt.getMonth(),
                                    day:         _preDt.getDate(),
                                    hour:        _preDt.getHours(),
                                    minute:      _preDt.getMinutes(),
                                    second:      _preDt.getSeconds(),
                                    millisecond: _preDt.getMilliseconds(),
                                }
                            }
                        }
                        payloads.shift()
                    }
                }
            }
            let lastElm = payloads.splice(-1, 1)[0]
            if (typeof lastElm === 'number') {
                payloads.push(lastElm)
            } else if (typeof lastElm === 'string') {
                lastElm = lastElm.trim()
                if (/^-?\d{1,}$/i.test(lastElm)) {
                    payloads.push(parseInt(lastElm, 10))
                } else if (/^(utc|local)$/i.test(lastElm)) {
                    this.config.timezone = /^utc$/i.test(lastElm) ? 'UTC' : 'local'
                } else {
                    this.config.timezone = 'local'
                }
            } else if (utils.isObject(lastElm)) {
                this.config = utils.mergeOptions(this.config, lastElm)
            } else {
                //console.log('o_:', lastElm, typeof lastElm, this.config.dateArgs)
                if (typeof lastElm !== 'undefined' && utils.hasKey(this.config, 'dateArgs')) {
                    delete this.config.dateArgs
                }
            }
            //console.log('!_:', lastElm, payloads.length)
            if (payloads.length > 0) {
                if (/^epoch$/i.test(this.config.firstArgument)) {
                    let _edt = new Date(payloads[0])
                    this.config.dateArgs = {
                        year:        _edt.getUTCFullYear(),
                        month:       _edt.getUTCMonth(),
                        day:         _edt.getUTCDate(),
                        hour:        _edt.getUTCHours(),
                        minute:      _edt.getUTCMinutes(),
                        second:      _edt.getUTCSeconds(),
                        millisecond: _edt.getUTCMilliseconds(),
                    }
                } else {
                    let _y = typeof payloads[0] === 'number' ? payloads[0] : (parseInt(String(payloads[0]), 10) || 1)
                    this.config.dateArgs = {
                        year:        _y,
                        month:       parseInt(payloads[1], 10) - 1 || 0,
                        day:         parseInt(payloads[2], 10) || 1,
                        hour:        parseInt(payloads[3], 10) || 0,
                        minute:      parseInt(payloads[4], 10) || 0,
                        second:      parseInt(payloads[5], 10) || 0,
                        millisecond: payloads[6] || 0,
                    }
                }
            }
        }
        if (!utils.hasKey(this.config, 'dateArgs')) {
            throw 'Failed to set options for initializing object.'
        }
        //console.log('!_:', ...keys.map(v => this.config.dateArgs[v]))
        // Set date
        let _zonedDt = new Date(...keys.map(v => this.config.dateArgs[v])),
            _utcDt   = new Date(Date.UTC(...keys.map(v => this.config.dateArgs[v]))),
            _fixedDt = null
        if (this.config.dateArgs.year < 100) {
            if (this.config.timezone === 'UTC') {
                _fixedDt = new Date(_utcDt.setUTCFullYear(this.config.dateArgs.year))
                this.config.offset = 0
            } else {
                _fixedDt = new Date(_zonedDt.setFullYear(this.config.dateArgs.year))
            }
            this.baseDate = this.isValid(_fixedDt) ? _fixedDt : INVALID_DATE
        } else {
            if (this.config.timezone === 'UTC') {
                this.baseDate = _utcDt
                this.config.offset = 0
            } else {
                this.baseDate = _zonedDt
            }
        }
        //console.log('!!_:', _zonedDt, _utcDt, this.config.timezone, this.config.offset)
        /*
        if (this.isValid(_fixedDt)) {
            if (this.config.timezone === 'UTC') {
                // UTC datetime
                _utcDt = new Date(_zonedDt.getTime() + this.config.offset)
                console.log('!!!_:', _utcDt)
                /*
                _preDt = new Date(Date.UTC(_tmpDt.getFullYear(), _tmpDt.getMonth(), _tmpDt.getDate(), _tmpDt.getHours(), _tmpDt.getMinutes(), _tmpDt.getSeconds(), _tmpDt.getMilliseconds()))
                if (this.config.dateArgs.year < 100) {
                    _preDt = new Date(_preDt.setUTCFullYear(this.config.dateArgs.year))
                }
            console.log('!!!_:', _preDt)
                this.baseDate = this.isValid(_preDt) ? _preDt : INVALID_DATE
                * /
                this.baseDate = _utcDt
                this.config.offset = 0
            } else {
                // zoned datetime
                this.baseDate = _zonedDt
            }
        } else {
            this.baseDate = INVALID_DATE
        }
        */
        //console.log(utils.cloneObject(this.config))
    }

    /**
     * Initialize instance
     */
    init() {
        const instantLocale = 'en-US'
        this.instance = this.isValid() ? Object.assign({}, {
            year:         parseInt(this.getLocaleDateElement('year', 'numeric', instantLocale), 10),
            month:        parseInt(this.getLocaleDateElement('month', 'numeric', instantLocale), 10),
            monthLong:    this.getLocaleDateElement('month', 'long', instantLocale),
            monthShort:   this.getLocaleDateElement('month', 'short', instantLocale),
            week:         this.getWeekOfYear(),
            day:          parseInt(this.getLocaleDateElement('day', 'numeric', instantLocale), 10),
            weekday:      this.getLocaleDateElement('weekday', 'long', instantLocale),
            weekdayShort: this.getLocaleDateElement('weekday', 'short', instantLocale),
            hour:         parseInt(this.getLocaleDateElement('hour', {hour12: false, hour: 'numeric'}, instantLocale), 10),
            minute:       parseInt(this.getLocaleDateElement('minute', 'numeric', instantLocale), 10),
            second:       parseInt(this.getLocaleDateElement('second', 'numeric', instantLocale), 10),
            millisecond:  this.config.timezone === 'UTC' ? this.baseDate.getUTCMilliseconds() : this.baseDate.getMilliseconds(),
            timezone:     this.config.timezone,
            tzOffset:     this.config.timezone === 'UTC' ? 0 : this.getTZOffset(),
            unix:         this.getUnixEpoch('s'),
            unixms:       this.getUnixEpoch('ms'),
            era:          this.getLocaleDateElement('era', 'long', instantLocale),
            ce:           this.getCEEpoch('s'),
            cems:         this.getCEEpoch('ms'),
        }) : null
    }

    /**
     * Calculate the UNIX epoch time for this date.
     *
     * @param {?string} unit [unit=ms] - `s` as second or `ms` as millisecond
     */
    getUnixEpoch(unit='ms') {
        if (!unit) {
            unit = /^sec(|onds)?$/i.test(this.config.epochUnit) ? 's' : 'ms'
        }
        let _time = this.baseDate.getTime(),
            _tzos = this.getTZOffset()
        if (this.config.timezone !== 'UTC' && _tzos != 0) {
            _time = _time + _tzos
        }
        return Math.floor(_time / (unit === 's' ? 1000 : 1))
    }

    /**
     * Calculate the epoch time starting from the first year C.E. of this date.
     *
     * @param {?string} unit [unit=ms] - `s` as second or `ms` as millisecond
     */
    getCEEpoch(unit='ms') {
        if (!unit) {
            unit = /^sec(|onds)?$/i.test(this.config.epochUnit) ? 's' : 'ms'
        }
        let _dt   = this.baseDate,
            _ceDt = new Date(Date.UTC(1, 0, 1, 0, 0, 0, 0)),
            _ceEpoch = _ceDt.setUTCFullYear(1)
        return Math.floor((_dt.getTime() + Math.abs(_ceEpoch)) / (unit === 's' ? 1000 : 1))
    }

    /**
     * Returns a string with a language sensitive representation of the date portion of this date 
     * that depending on toLocaleDateString or toLocaleTimeString method.
     *
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
            ), retval  = null
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
        //console.log('getLocaleDateElement::', elementName, utils.cloneObject(options))
        switch (elementName) {
            case 'year':
                if (timezone === 'UTC' && this.baseDate.getUTCFullYear() == 0) {
                    retval = 0
                } else
                if (this.baseDate.getFullYear() == 0) {
                    retval = 0
                } else {
                    retval = this.baseDate.toLocaleDateString(locale, options)
                }
                break
            case 'month':
            case 'day':
            case 'weekday':
            case 'era':
                retval = this.baseDate.toLocaleDateString(locale, options)
                break
            case 'hour':
                retval = this.baseDate.toLocaleTimeString(locale, options)
                if (utils.hasKey(options, 'hour12') && !options.hour12) {
                    retval = (utils.hasKey(options, 'hourCycle') && options.hourCycle === 'h24') ? retval : (retval == 24 ? 0 : retval)
                }
                break
            case 'minute':
            case 'second':
                retval = this.baseDate.toLocaleTimeString(locale, options)
                break
            case 'week':
            case 'millisecond':
                retval = this.instance[elementName]
                break
            default:
                retval = null
                break
        }
        // Filtering
        if (options[elementName] === '2-digit') {
            return String(retval).length == 1 ? String(retval).padStart(2, '0') : retval
        } else if (elementName === 'millisecond' && options[elementName] === 'zerofill') {
            return String(retval).length == 3 ? retval : String(retval).padStart(3, '0')
        } else {
            return !isNaN(retval) ? String(parseInt(retval, 10)) : retval
        }
    }

    /**
     * Returns the instantiated date in a formatted format by PHP's date_format()-like formatter.
     *
     * @param {?string} formatter
     * @param {?string} locale
     */
    format(formatter=null, locale=null) {
        if (!locale) {
            locale = this.config.locale
        }
        const matcher = {
            // Year
            Y: this.getLocaleDateElement('year', 'numeric', locale),
            y: this.getLocaleDateElement('year', '2-digit', locale),
            L: this.getDaysInYear() == 366 ? 1 : 0,
            // Month
            F: this.getLocaleDateElement('month', 'long', locale),
            m: this.getLocaleDateElement('month', '2-digit', locale),
            M: this.getLocaleDateElement('month', 'short', locale),
            n: this.getLocaleDateElement('month', 'numeric', locale),
            t: this.getDaysInMonth(),
            // Week
            W: this.getWeekOfYear(),
            // Day
            d: this.getLocaleDateElement('day', '2-digit', locale),
            j: this.getLocaleDateElement('day', 'numeric', locale),
            z: this.getCumulativeDays(),
            // Weekday
            l: this.getLocaleDateElement('weekday', 'long', locale),
            D: this.getLocaleDateElement('weekday', 'short', locale),
            N: [7, 1, 2, 3, 4, 5, 6][(this.instance.timezone === 'UTC' ? this.baseDate.getUTCDay() : this.baseDate.getDay())],// ISO-8601 format numeric weekday: 1 (Monday) - 7 (Sunday)
            w: this.instance.timezone === 'UTC' ? this.baseDate.getUTCDay() : this.baseDate.getDay(),// numeric weekday: 0 (Sunday) - 6 (Saturday)
            // Hour
            a: this.getLocaleDateElement('hour', {hour12: false, hour: 'numeric'}, locale) > 12 ? 1 : 0,// in morning:0 or afternoon:1
            g: parseInt(this.getLocaleDateElement('hour', {hour12: true, hour: 'numeric'}, locale), 10),
            G: this.getLocaleDateElement('hour', {hour12: false, hour: 'numeric'}, locale),
            h: String(parseInt(this.getLocaleDateElement('hour', {hour12: true, hour: '2-digit'}, locale), 10)).padStart(2, '0'),
            H: this.getLocaleDateElement('hour', {hour12: false, hour: '2-digit'}, locale),
            // Minute
            I: this.getLocaleDateElement('minute', 'numeric', locale),
            i: this.getLocaleDateElement('minute', '2-digit', locale),
            // Second
            S: this.getLocaleDateElement('second', 'numeric', locale),
            s: this.getLocaleDateElement('second', '2-digit', locale),
            // Millisecond
            V: this.getLocaleDateElement('millisecond'),
            v: this.getLocaleDateElement('millisecond', 'zerofill'),
            // TimeZone
            e: this.instance.timezone,
            Z: this.instance.timezone === 'UTC' ? 0 : this.getTZOffset('s'),
            // Full Datetime
            c: this.instance.timezone === 'UTC' ? this.baseDate.toISOString().replace(/Z$/, '') : this.baseDate.toISOString(),
            r: this.baseDate.toString(),// RFC 2822 format date
            U: this.getUnixEpoch('s'),
            u: this.getUnixEpoch('ms'),
            B: this.getCEEpoch('s'),
            b: this.getCEEpoch('ms'),
        }
        return [...formatter].reduce((acc, cur, idx, src) => {
            if (Object.keys(matcher).includes(cur)) {
                acc += matcher[cur]
            } else
            if (/\\/.test(cur)) {
                acc += src[idx + 1]
                delete src[idx + 1]
            } else {
                acc += cur
            }
            return acc
        }, '')
    }

    /**
     * Get the UTC date from the local timezone date.
     *
     * @param {?object} date - must be the Date object if given
     */
    getUTC(date=null) {
        let _dt  = date ? date : this.baseDate,
            _y   = _dt.getFullYear(),
            _utc = new Date(Date.UTC(_y, _dt.getMonth(), _dt.getDate(), _dt.getHours(), _dt.getMinutes(), _dt.getSeconds(), _dt.getMilliseconds()))
        if (_y < 100) {
            _utc = new Date(_utc.setUTCFullYear(_y))
        }
        return _utc
    }

    /**
     * Get the time difference from the UTC date in the timezone of the current system.
     *
     * @param {?string} unit [unit=ms] - `s` as second or `ms` as millisecond
     */
    getTZOffset(unit='ms') {
        let _utcDt   = this.getUTC(),
            offsetMS = this.baseDate.getTime() - _utcDt.getTime()
        switch (true) {
            case /^h(|ours?)$/i.test(unit):
                return Math.round(offsetMS / MS_A_HOUR * 10) / 10
            case /^min(|utes?)$/i.test(unit):
                return Math.floor(offsetMS / MS_A_MINUTE)
            case /^sec(|onds?)$/i.test(unit):
                return Math.floor(offsetMS / MS_A_SECOND)
            default:
                return offsetMS
        }
    }

    /**
     * Calculates the date added or subtracted by the specified unit to the instantiated date.
     *
     * @param {number} payload - 
     * @param {string} unit
     */
    modify(payload, unit) {
        payload = parseInt(payload, 10)
        if (isNaN(payload) || typeof unit !== 'string' || !REGEX_UNITS.test(unit)) {
            return false
        }
        const _base  = {
                  y:  this.instance.year,
                  m:  this.instance.month,
                  w:  this.instance.week,
                  d:  this.instance.day,
                  h:  this.instance.hour,
                  mi: this.instance.minute,
                  s:  this.instance.second,
                  ms: this.instance.millisecond,
                  tz: this.config.timezone,
              }
        let _modDt = null, _tmp
        switch (true) {
            case /^years?$/i.test(unit):
                _modDt = wrapper(_base.y + payload, _base.m, _base.d, _base.h, _base.mi, _base.s, _base.ms, _base.tz)
                break
            case /^months?$/i.test(unit):
                _modDt = wrapper(_base.y, _base.m + payload, _base.d, _base.h, _base.mi, _base.s, _base.ms, _base.tz)
                break
            case /^weeks?$/i.test(unit):
                _tmp = _base.d + (payload * 7)
                if (_tmp == 0) {
                    _modDt = wrapper(_base.y, _base.m, _base.d, _base.h - 24, _base.mi, _base.s, _base.ms, _base.tz)
                } else {
                    _modDt = wrapper(_base.y, _base.m, _tmp, _base.h, _base.mi, _base.s, _base.ms, _base.tz)
                }
                break
            case /^days?$/i.test(unit):
                _tmp = _base.d + payload
                if (_tmp == 0) {
                    _modDt = wrapper(_base.y, _base.m, _base.d, _base.h - 24, _base.mi, _base.s, _base.ms, _base.tz)
                } else {
                    _modDt = wrapper(_base.y, _base.m, _tmp, _base.h, _base.mi, _base.s, _base.ms, _base.tz)
                }
                break
            case /^hours?$/i.test(unit):
                _modDt = wrapper(_base.y, _base.m, _base.d, _base.h + payload, _base.mi, _base.s, _base.ms, _base.tz)
                break
            case /^min(|utes?)$/i.test(unit):
                _modDt = wrapper(_base.y, _base.m, _base.d, _base.h, _base.mi + payload, _base.s, _base.ms, _base.tz)
                break
            case /^sec(|onds?)$/i.test(unit):
                _modDt = wrapper(_base.y, _base.m, _base.d, _base.h, _base.mi, _base.s + payload, _base.ms, _base.tz)
                break
            case /^m(s|illiseconds?)$/i.test(unit):
                _modDt = wrapper(_base.y, _base.m, _base.d, _base.h, _base.mi, _base.s, _base.ms + payload, _base.tz)
                break
        }
        return _modDt.isValid() ? _modDt : INVALID_DATE
    }

    /**
     * Get calculated interval between the instantiated date and a specific date, with the 
     * specified unit.
     *
     * @param {string} compare
     * @param {?string} unit
     */
    interval(compare, unit=null) {
        const compareObj = wrapper(compare)
        if (compareObj === INVALID_DATE || !compareObj.isValid()) {
            return false
        }
        let diffMs = compareObj.instance.unixms - this.instance.unixms,
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
     */
    clone() {
        //return new Sunorhc(this.baseDate, this.config)
        const datePayloads = [
            this.instance.year,
            this.instance.month,
            this.instance.week,
            this.instance.day,
            this.instance.hour,
            this.instance.minute,
            this.instance.second,
            this.instance.millisecond,
            this.config
        ]
        
        return wrapper(...datePayloads)
    }

    /**
     * Determines if the Date object given in the argument is valid.
     * Evaluates the instance's own date if there are no arguments or if the argument is not 
     * a date object.
     *
     * @param {?any} date 
     */
    isValid(date=null) {
        let chkDate = date ? date : this.baseDate
        return !(chkDate.toString() === INVALID_DATE)
    }

    /**
     * The week number for the year is calculated.
     *
     * @param {?object} date - must be the Date object if given
     */
    getWeekOfYear(date=null) {
        let _dt = date ? date : this.baseDate,
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
     * @param {?object} date - must be the Date object if given
     */
    getDaysInYear(date=null) {
        let _dt = date ? date : this.baseDate,
            _y  = this.config.timezone === 'UTC' ? _dt.getUTCFullYear() : _dt.getFullYear(),
            isLeapYear = _y % 4 == 0
        return isLeapYear ? 366 : 365
    }

    /**
     * The total number of days in the month on the instantiated date is calculated.
     *
     * @param {?object} date - must be the Date object if given
     */
    getDaysInMonth(date=null) {
        let _dt = date ? date : this.baseDate,
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
     * @param {?object} date - must be the Date object if given
     */
    getCumulativeDays(date=null) {
        let _dt = date ? date : this.baseDate,
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
     * Getters
     */
    get version() {
        return `v${this.config.version}`
    }

    get instant() {
        return Object.assign({}, this.instance)
    }

    get toDate() {
        return this.baseDate
    }

    get toISOString() {
        return this.baseDate.toISOString()
    }

    get year() {
        return this.instance.year
    }

    get month() {
        return this.instance.month
    }

    get week() {
        return this.instance.week
    }

    get day() {
        return this.instance.day
    }

    get weekday() {
        return this.instance.weekday
    }

    get hour() {
        return this.instance.hour
    }

    get minute() {
        return this.instance.minute
    }

    get second() {
        return this.instance.second
    }

    get millisecond() {
        return this.instance.millisecond
    }

    get unix() {
        return /^(ms|milliseconds?)$/i.test(this.config.epochUnit) ? this.instance.unixms : this.instance.unix
    }

    get ce() {
        return /^(ms|milliseconds?)$/i.test(this.config.epochUnit) ? this.instance.cems : this.instance.ce
    }

    get tz() {
        return this.instance.timezone
    }

    get tzOffset() {
        return this.instance.tzOffset
    }

}

/*
export default function(...payloads) {
    return new Sunorhc(...payloads)
}
*/
/*
~(() => {
    if (!window.Sunorhc) window.Sunorhc = Sunorhc
})()
*/
/*
((root, factory) => {
    console.log(root, factory)
    if (typeof define === 'function' && define.amd) {
        define([], factory)
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory
    } else {
        root.Sunorhc = factory
    }
})(this, Sunorhc)
*/

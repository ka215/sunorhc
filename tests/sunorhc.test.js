import {default as Sunorhc} from '../src/index'

const PACKAGE_VERSON  = process.env.npm_package_version
const INSTANT_PROPS   = [
    "$CE", "$CEMS", "$D", "$E", "$H", "$M",
    "$MON", "$MONL", "$MONS", "$MS", "$S", "$TZ",
    "$TZO", "$TZOF", "$TZOL", "$U", "$UMS", "$W",
    "$WD", "$WDL", "$WDS", "$Y",
]
const CE_EPOCH_UNIX = -62135596800000
// UTC datetime based on the current local datetime. (: 現地時間をベースにした"UTC日時"
// Same values are below:
// - new Date(Date.UTC(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getHours(), NOW.getMinutes() + NOW.getTimezoneOffset(), NOW.getSeconds(), NOW.getMilliseconds()))
// - new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate(), NOW.getUTCHours(), NOW.getUTCMinutes(), NOW.getUTCSeconds(), NOW.getUTCMilliseconds()))
const NOW = new Date()
const convLocalISOString = (date) => {
    let offset = 0, zoned = null
    if (date instanceof Date) {
        offset = date.getTimezoneOffset() * 60000
        zoned  = new Date(date.getTime() - offset)
    } else {
        return convLocalISOString(new Date(date))
    }
    if (offset == 0) {
        return date.toISOString().replace(/z$/i, '+00:00')
    } else {
        let offsetHours   = Math.floor(Math.abs(offset) / 3600000),
            offsetMinutes = Math.floor((Math.abs(offset) - (offsetHours * 3600000)) / 60000),
            signString    = offset < 0 ? '+' : '-'
        return zoned.toISOString().replace(/z$/i, `${signString}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`)
    }
}
const getDateElements = (date, isUTC=false) => {
    return isUTC ? [
        date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()
    ] : [
        date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()
    ]
}
// Current datetime ISO 8601 strings for verification
const NOW_UTC   = NOW.toISOString()
const NOW_LOCAL = convLocalISOString(NOW_UTC)

beforeEach(() => {
    global.START_TIMER = Date.now()
    global.getTimer = () => {
        const NOW_TIMER = Date.now()
        return NOW_TIMER - START_TIMER
    }
    global.randDate = () => {
        return new Date(+(new Date()) - Math.floor(Math.random() * 10000000000))
    }
    //console.log(`NOW_UTC: %s (%d) | NOW_LOCAL: %s`, NOW_UTC, NOW.getTime(), NOW_LOCAL)
})

afterEach(() => {
    delete global.START_TIMER
    delete global.getTimer
})

describe('Constructor arguments acceptance behavior', () => {

    test('Instantiate with no arguments', () => {
        const s = new Sunorhc(),
              ntSec = Math.ceil(getTimer() / 1000) * 1000
        expect(Object.keys(s.instant).sort()).toEqual(INSTANT_PROPS)
        expect(s.timezone).toBe('UTC')
        expect(s.toISOString).toBe(s.toUTCDate().toISOString())
        expect(s.instant.$UMS - NOW.getTime()).toBeLessThanOrEqual(ntSec)
    })

    test('Instantiation with only numerical arguments', () => {
        const chk = {
            '2020-01-01T00:00:00.000Z': [2020],
            '2019-01-01T00:00:00.000Z': [2019,1],
            '2018-02-01T00:00:00.000Z': [2018,2,1],
            '2017-03-02T00:00:00.000Z': [2017,3,2],
            '2016-04-03T01:00:00.000Z': [2016,4,3,1],
            '2015-05-04T02:01:00.000Z': [2015,5,4,2,1],
            '2014-06-05T03:02:01.000Z': [2014,6,5,3,2,1],
            '2013-07-06T04:03:02.001Z': [2013,7,6,4,3,2,1],
            '2012-08-07T05:04:03.002Z': [2012,8,7,5,4,3,2,1],// Argument overload
            'NOW'                     : ['test',2011,9,8,6,5,4,999],// First argument invalid
            '2010-10-09T07:06:06.000Z': [2010,10,9,7,6,5,1000],// Millisecond over the digits
            '2009-11-11T00:00:00.000Z': [2009,11,10,23,59,60,0],// Seconds overload
            '2008-12-11T13:00:59.000Z': [2008,12,11,12,60,59,0],// Minutes overload
            '2007-12-13T00:59:59.000Z': [2007,12,12,24,59,59,0],// Hours overload
            '2006-07-01T23:59:59.999Z': [2006,6,31,23,59,59,999],// Days oveload
            '2006-01-20T23:59:59.999Z': [2005,13,20,23,59,59,999],// Months overload
            '1965-07-23T08:45:33.512Z': ['1965','7','23','8','45','33','512'],// Numeric string is given
            '1914-10-14T11:22:33.444Z': [1914,10,14,11,22,33,'444'],// Last argument is a non-numeric type
            '275760-09-13T00:00:00.000Z': [275760,9,13,0,0,0,0],// Specifying the maximum value of a Date object
            '0188-09-17T13:24:43.012Z': [188,9,17,13,24,43,12],
            '0079-04-09T01:04:03.009Z': [79,4,9,1,4,3,9],
            '0000-01-02T03:04:05.000Z': [0,1,2,3,4,5],// BCE. 1 (CE. -1)
            '0001-01-01T00:00:00.000Z': [1],// CE. 1
            '0000-01-01T00:00:00.000Z': [0],
            '-0001-01-01T00:00:00.000Z': [-1],
            '-0331-03-14T00:00:00.000Z': [-331, 3, 14],// BCE 332 (CE. -332)
        }
        for (let [cor, args] of Object.entries(chk)) {
            const s = new Sunorhc(...args)
            if (cor === 'NOW') {
                cor = NOW_UTC.replace(/\d{2}\.\d{3}Z$/, `${s.instant.$S.toString().padStart(2, '0')}.${s.instant.$MS.toString().padStart(3, '0')}Z`)
            }
            expect(s.toISOString).toBe(cor)
        }
    })

    test('Year designation from -100 to 100', () => {
        for (let _y = -100; _y <= 100; _y++) {
            const s = new Sunorhc(_y)
            if (_y < 0) {
                expect(s.toISOString).toBe(`-${(Math.abs(_y).toString()).padStart(4, '0')}-01-01T00:00:00.000Z`)
            } else {
                expect(s.toISOString).toBe(`${(_y.toString()).padStart(4, '0')}-01-01T00:00:00.000Z`)
            }
            expect(s.year).toBe(_y)
        }
    })

    test('Instantiation by Date Object', () => {
        const s1 = new Sunorhc(NOW),// Should be instanted datetime on UTC.
              s2 = new Sunorhc(NOW, 'local')// Should be instanted datetime on local timezone.
        expect(s1.toISOString).not.toBe(NOW_LOCAL)
        expect(s1.toISOString).toBe(NOW_UTC)
        expect(s2.toISOString).not.toBe(NOW_UTC)
        expect(s2.toISOString).toBe(NOW_LOCAL)
    })

    test('Instantiation by unix time', () => {
        const opt1 = {firstArgument: 'unix'},
              opt2 = {firstArgument: 'timestamp'},
              s1 = new Sunorhc(NOW.getTime(), opt1),
              s2 = new Sunorhc(0, opt1),
              s3 = new Sunorhc(NOW.getTime(), opt2),
              s4 = new Sunorhc(0, opt2)
        expect(s1.toISOString).toBe(NOW.toISOString())
        expect(s1.unix).toBe(Math.floor(NOW.getTime() / 1000))
        expect(s1.instant.$UMS).toBe(NOW.getTime())
        expect(s2.toISOString).toBe('1970-01-01T00:00:00.000Z')
        expect(s2.unix).toBe(0)
        expect(s2.instant.$UMS).toBe(0)
        expect(s3.toISOString).toBe(NOW.toISOString())
        expect(s3.unix).toBe(Math.floor(NOW.getTime() / 1000))
        expect(s3.instant.$UMS).toBe(NOW.getTime())
        expect(s4.toISOString).toBe('1970-01-01T00:00:00.000Z')
        expect(s4.unix).toBe(0)
        expect(s4.instant.$UMS).toBe(0)
    })

    test('Instantiation by CE epoch time', () => {
        const opt1 = {firstArgument: 'ce'},
              opt2 = {firstArgument: 'ceepoch'},
              opt3 = {firstArgument: 'ce', epochUnit: 'ms'},
              s1 = new Sunorhc(NOW.getTime(), opt1),
              s2 = new Sunorhc(0, opt1),
              s3 = new Sunorhc(NOW.getTime(), opt2),
              s4 = new Sunorhc(0, opt2)
        expect(s1.toISOString).not.toBe(NOW.toISOString())
        expect(s1.toISOString).toBe(new Date(CE_EPOCH_UNIX + NOW.getTime()).toISOString())
        expect(s1.instant.$CE).toBe(Math.floor(NOW.getTime() / 1000))
        expect(s1.instant.$CEMS).toBe(NOW.getTime())
        expect(s2.toISOString).toBe('0001-01-01T00:00:00.000Z')
        expect(s2.toISOString).toBe(new Date(CE_EPOCH_UNIX).toISOString())
        expect(s2.unix).toBe(CE_EPOCH_UNIX / 1000)
        expect(s2.ce).toBe(0)
        expect(s2.instant.$CEMS).toBe(0)
        expect(s3.toISOString).not.toBe(NOW.toISOString())
        expect(s3.toISOString).toBe(new Date(CE_EPOCH_UNIX + NOW.getTime()).toISOString())
        expect(s3.instant.$CE).toBe(Math.floor(NOW.getTime() / 1000))
        expect(s3.instant.$CEMS).toBe(NOW.getTime())
        expect(s4.toISOString).toBe('0001-01-01T00:00:00.000Z')
        expect(s4.toISOString).toBe(new Date(CE_EPOCH_UNIX).toISOString())
        expect(s4.unix).toBe(CE_EPOCH_UNIX / 1000)
        expect(s4.ce).toBe(0)
        expect(s4.instant.$CEMS).toBe(0)
        expect(new Sunorhc(NOW.getTime() * -1, opt3).ce).toBe(NOW.getTime() * -1)
        expect(new Sunorhc(NOW.getTime() * -1, opt3).toISOString).toBe(new Date(CE_EPOCH_UNIX - NOW.getTime()).toISOString().replace('-00', '-'))
        expect(new Sunorhc(-1, opt1).toISOString).toBe('0000-12-31T23:59:59.999Z')
    })

    test('Instantiation by string as like date', () => {
        const chk = {
            // As like RFC 2822 format string
            'December 17, 1995 03:24:00': {
                local: '1995-12-17T03:24:00.000',
                // This format string is parsed as local timezone date on the Date object.
                utc:   new Date(1995,11,17,3,24,0).toISOString()
            },
            // As kind of ISO 8601 format
            '1996-11-16T04:35:11': {// without timezone offset
                local: '1996-11-16T04:35:11.000',
                // This format string is parsed as UTC date on the Date object.
                utc:   new Date(Date.UTC(1996,10,16,4,35,11)).toISOString()
            },
            '2011-07-12T04:01:23.789+09:00': {// with timezone offset
                local: '2011-07-12T04:01:23.789',
                // This format string is parsed as local timezoned date on the Date object.
                utc:   new Date(2011,6,12,4,1,23,789).toISOString()
            },
            '1999-03-22 05:06:07.089+0100': {// with timezone offset
                // The hour on UTC date is 4 by offset +0100, then that convert on system timezone from such UTC date. 
                local: convLocalISOString(new Date(Date.UTC(1999,2,22,4,6,7,89))),
                utc:   '1999-03-22T04:06:07.089Z'
            },
            // As like "yyyy/MM/dd H:mm" format is mainly used in the "ja-JP" locale
            '1997/8/13 9:10': {
                local: '1997-08-13T09:10:00.000',
                // This format string is parsed as UTC date on the Date object.
                utc:   new Date(Date.UTC(1997,7,13,9,10)).toISOString()
            },
            // As like "EEE, d MMM yyyy HH:mm:ss Z" format is mainly used the "en_US" locale
            'Sat, 24 Aug 2002 16:23:07 -0500': {
                local: convLocalISOString(new Date(Date.UTC(2002,7,24,16 + 5,23,7))),
                utc:   '2002-08-24T21:23:07.000Z'
            },
            // As like "EEE, d MMM yyyy HH:mm:ss" format is mainly used the "en_US" locale
            'Sat, 24 Aug 2002 16:23:07': {// without timezone offset
                local: '2002-08-24T16:23:07.000',
                // This format string is parsed as local timezone date on the Date object.
                utc:   new Date(2002,7,24,16,23,7).toISOString()
            },
            // As like "M/d/yyyy h:mm:ss a" format is mainly used the "en_US" locale
            '9/4/2004 2:34:56 PM': {
                local: '2004-09-04T14:34:56.000',
                utc:   new Date(2004,8,4,14,34,56).toISOString()
            },
            // As like "d-MMM-yyyy HH:mm:ss" format is mainly used the "en_GB" locale
            '7-Mar-2005 10:08:01': {
                local: '2005-03-07T10:08:01.000',
                utc:   new Date(2005,2,7,10,8,1).toISOString()
            },
            // As like "M-d-yy HH:mm" format is mainly used the "fr_FR" locale
            '7-14-94 08:30': {
                local: '1994-07-14T08:30:00.000',
                utc:   new Date(1994,6,14,8,30).toISOString()
            },
            // As like "yyyy.MM.dd. H:mm:ss" format is mainly used the "hu" locale
            '2006.11.09. 9:09:09': {
                local: '2006-11-09T09:09:09.000',
                utc:   new Date(2006,10,9,9,9,9).toISOString()
            },
            // As RFC format generated by Date::toString()
            'Fri Feb 01 2008 10:20:30': {// without timezone offset
                local: '2008-02-01T10:20:30.000',
                utc:   new Date(2008,1,1,10,20,30).toISOString()
            },
            'Wed May 05 2010 04:12:06 GMT+0000 (GMT)': {// with timezone offset
                local: convLocalISOString(new Date(Date.UTC(2010,4,5,4,12,6))),
                utc:   '2010-05-05T04:12:06.000Z'
            },
        }
        for (let [str, cor] of Object.entries(chk)) {
            const sl = new Sunorhc(str, 'local'),
                  su = new Sunorhc(str),
                  offsetStr = sl.instant.$TZOL
            if (!cor.local.match(/\+.*$/)) {
                cor.local += offsetStr
            }
            //console.log(sl.toISOString === cor.local + offsetStr, su.toISOString === cor.utc)
            expect(sl.toISOString).toBe(cor.local)
            expect(su.toISOString).toBe(cor.utc)
        }
        // An invalid date string given
        const sn = new Sunorhc('invalid date string'),
              s2 = new Sunorhc('22 marzo 1999 5.06.07'),// as like "it_IT" locale format
              ntSec = Math.ceil(getTimer() / 1000) * 1000
        expect(sn.toDate).not.toBe('Invalid Date')
        expect(s2.toDate).not.toBe('Invalid Date')
        expect(sn.instant.$UMS - NOW.getTime()).toBeLessThanOrEqual(ntSec)
        expect(s2.instant.$UMS - NOW.getTime()).toBeLessThanOrEqual(ntSec * 2)
    })

    test('Overriding by object for the plugin configuration', () => {
        const matcher = {
                // Final option configuration when instantiated
                version: expect.stringMatching(/^\d{1,}\.\d{1,}\.\d{1,}$/),
                timezone: expect.any(String),
                firstArgument: expect.stringMatching(/^(year|timestamp|unix|ce(|epoch))$/),
                locale: expect.any(String),
                epochUnit: expect.stringMatching(/^(sec|seconds?|ms|milliseconds?)$/),
                localeFormats: {
                  common:  expect.anything(),
                  year:    expect.anything(),
                  month:   expect.anything(),
                  day:     expect.anything(),
                  weekday: expect.anything(),
                  hour:    expect.anything(),
                  minute:  expect.anything(),
                  second:  expect.anything(),
                  era:     expect.anything(),
                },
                dateArgs: {// Be automatically added by plugin
                  $y:  expect.any(Number),
                  $m:  expect.any(Number),
                  $d:  expect.any(Number),
                  $h:  expect.any(Number),
                  $mi: expect.any(Number),
                  $s:  expect.any(Number),
                  $ms: expect.any(Number),
                },
                offset: expect.any(Number),// Be automatically added by plugin
                tzName: expect.any(String),// Only added when a detailed timezone name is specified
              },
              opt1 = {
                version: '0.9.1a',
                timezone: 'America/New_York',
                firstArgument: 'year',
                locale: 'en-US',
                epochUnit: 'millisecond',
                localeFormats: {
                  common:  {
                    dateStyle: 'full',
                    timeStyle: 'full',
                    calendar: 'iso8601',
                    dayPeriod: 'narrow',
                    numberingSystem: 'fullwide',
                    localeMatcher: 'best fit',
                    timeZone: 'Asia/Shanghai',
                    hour12: true,
                    hourCycle: 'h23',
                    formatMatcher: 'basic',
                    fractionalSecondDigits: 3,// 0-3 allowed
                    timeZoneName: 'long',// or "short"
                  },
                  year:    { year: '2-digit' },// or "numeric"
                  month:   { month: 'long' },// or "numeric", "2-digit", "short", "narrow"
                  day:     { day: '2-digit' },// or "numeric"
                  weekday: { weekday: 'short' },// or "long", "narrow"
                  hour:    { hour: '2-digit' },// or "numeric"
                  minute:  { minute: 'numeric' },// or "2-digit"
                  second:  { second: 'numeric' },// or "2-digit"
                  era:     { era: 'long' },// or "short", "narrow"
                },
              },
              opt2 = {// Contains options that are not allowed
                version: () => { alert('Show plugin version!') },
                timezone: Symbol('Asia/Tokyo'),
                locale: ['en-GB', 'en-US', 'en'],
                localeFormats: {
                  common:  { hour12: true },
                  year:    'long',
                  month:   Symbol('short'),
                  day:     ['2-digit'],
                  weekday: () => String('short'),
                },
              },
              opt3 = {
                dateArgs: { year: 1980 },
                offset: -9999,
                tzName: 'GMT',
              },
              s1 = new Sunorhc(NOW, opt1),
              s2 = new Sunorhc(NOW, opt2),
              s3 = new Sunorhc(NOW),
              s4 = new Sunorhc(NOW, 'local'),
              s5 = new Sunorhc(NOW, opt3)
        expect(s1.config).toEqual(matcher)
        expect(s2.config).toEqual(matcher)
        expect(s1.config.version).not.toEqual(opt1.version)// cannot be overwritten
        expect(s1.config.version).toBe(PACKAGE_VERSON)// cannot be overwritten
        expect(s1.config.tzName).toBe(opt1.timezone)
        expect(s3.config.timezone).toBe('UTC')
        expect(s3.config.tzName).toBe('')
        expect(s4.config.timezone).toBe('local')
        expect(s4.config.tzName).toBe('')
        expect(s5.config.dateArgs.$y).toBe(NOW.getFullYear())// cannot be overwritten
        expect(s5.config.offset).toBe(0)// cannot be overwritten
        expect(s4.config.offset).toBe(NOW.getTimezoneOffset() * 60 * 1000)
        expect(s5.config.tzName).toBe('')// cannot be overwritten
        expect(s1.config.localeFormats).toStrictEqual(opt1.localeFormats)
        // Configuration properties cannot be changed after instantiation.
        try {
            s1.config.tzName = 'Asia/Tokyo'
        } catch (error) {
            // console.error(error.message) -> Cannot assign to read only property 'tzName' of object '#<Object>'
        }
        expect(s1.config.tzName).toBe('America/New_York')
    })

    test('Instantiation by Irregular cases', () => {
        const sf = (...payloads) => {
            try {
                return new Sunorhc(...payloads)
            } catch(e) {
                return e
            }
        }
        expect(sf(null)).toBe('[Sunorhc] Failed to set options for initializing object.')
        expect(sf(null).toISOString).toBe(undefined)
        expect(sf(Symbol('2021/2/4'))).toBe('[Sunorhc] Failed to set options for initializing object.')
        expect(sf(undefined).isValid()).toBe(true)
        expect(sf(undefined).timezone).toBe('UTC')
        expect(sf('now').isValid()).toBe(true)
        expect(sf('now').timezone).toBe('local')
    })

})

describe('Getters test', () => {
    const s1 = new Sunorhc(NOW),// UTC
          s2 = new Sunorhc(NOW, 'local')// local
 
    test('Get package version', () => {
        expect(s1.version).toBe(`v${PACKAGE_VERSON}`)
        expect(s2.version).toBe(`v${PACKAGE_VERSON}`)
        expect(new Sunorhc(NOW, {version: '0.0.1'}).version).toBe(`v${PACKAGE_VERSON}`)
    })

    test('Get instant object', () => {
        expect(Object.keys(s1.instant).sort()).toEqual(INSTANT_PROPS)
    })

    test('Get Date object', () => {
        expect(s1.toDate instanceof Date).toBe(true)
        expect(s1.toDate.toISOString()).toBe(NOW_UTC)
        expect(s2.toDate.toISOString().replace(/z$/i, '')).toBe(NOW_LOCAL.replace(/\+.*$/, ''))
    })

    test('Get ISO 8601 date string', () => {
        expect(s1.toISOString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)// UTC
        expect(s2.toISOString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(-|\+)\d{2}:\d{2}$/)// local
        expect(s1.toISOString).toBe(NOW_UTC)
        expect(s2.toISOString).toBe(NOW_LOCAL)
    })

    test('Get RFC formatted string', () => {
        const su = new Sunorhc(2021,8,10,15,14,26,632),
              sl = new Sunorhc(2021,8,10,15,14,26,632,'local'),
              getLocalTZOffsetString = (...args) => {
                let date = args.length == 0 ? NOW : new Date(...args),
                    _m = date.toString().match(/\sGMT(-|\+)(.*)\s/)
                return _m[1] + _m[2].slice(0, 2) + ':' + _m[2].slice(2)
              },
              tzOffsetStr1 = getLocalTZOffsetString(),
              tzOffsetStr2 = getLocalTZOffsetString().replace(':', '')
        expect(su.toString).toBe('Tue Aug 10 2021 15:14:26 GMT+0000 (UTC)')
        expect(sl.toString).toBe(`Tue Aug 10 2021 15:14:26 GMT${tzOffsetStr2} (GMT${tzOffsetStr1})`)
    })

    test('Get year', () => {
        for (let _y = -2046; _y <= 2046; _y++) {
          expect(new Sunorhc(_y).year).toBe(_y)
        }
    })

    test('Get month', () => {
        expect(new Sunorhc(2020,-1).month).toBe(11)
        expect(new Sunorhc(2020,-1).year).toBe(2019)
        expect(new Sunorhc(2020,0).month).toBe(12)
        expect(new Sunorhc(2020,0).year).toBe(2019)
        for (let _m = 1; _m <= 12; _m++) {
            expect(new Sunorhc(2020, _m).month).toBe(_m)
        }
        expect(new Sunorhc(2020,13).month).toBe(1)
        expect(new Sunorhc(2020,13).year).toBe(2021)
    })

    test('Get monthShort', () => {
        // The value is retrieved by the getter is independent of the language setting.
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              opt1 = {locale: 'fr-FR', localeFormats: {month: {month: 'long'}}},
              opt2 = {locale: 'ja-JP', localeFormats: {month: {month: 'long'}}}
        for (let _m = 1; _m <= 12; _m++) {
            expect(new Sunorhc(2020,_m,opt1).monthShort).toBe(months[_m - 1])
            expect(new Sunorhc(2020,_m,opt2).monthShort).toBe(months[_m - 1])
        }
        expect(new Sunorhc(2020,0).monthShort).toBe('Dec')
        expect(new Sunorhc(2020,13).monthShort).toBe('Jan')
    })

    test('Get monthLong', () => {
        // The value is retrieved by the getter is independent of the language setting.
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
              opt1 = {locale: 'fr-FR', localeFormats: {month: {month: 'short'}}},
              opt2 = {locale: 'ja-JP', localeFormats: {month: {month: 'short'}}}
        for (let _m = 1; _m <= 12; _m++) {
            expect(new Sunorhc(2020,_m,opt1).monthLong).toBe(months[_m - 1])
            expect(new Sunorhc(2020,_m,opt2).monthLong).toBe(months[_m - 1])
        }
        expect(new Sunorhc(2020,0).monthLong).toBe('December')
        expect(new Sunorhc(2020,13).monthLong).toBe('January')
    })

    test('Get week', () => {
        expect(new Sunorhc(2019,12,31).week).toBe(53)
        expect(new Sunorhc(2020,1,1).week).toBe(1)
    })

    test('Get day', () => {
        expect(new Sunorhc(2020,1,-1).day).toBe(30)
        expect(new Sunorhc(2020,1,-1).month).toBe(12)
        expect(new Sunorhc(2020,1,-1).year).toBe(2019)
        expect(new Sunorhc(2020,1,0).day).toBe(31)
        expect(new Sunorhc(2020,1,0).month).toBe(12)
        expect(new Sunorhc(2020,1,0).year).toBe(2019)
        for (let _d = 1; _d <= 31; _d++) {
            expect(new Sunorhc(2020,1,_d).day).toBe(_d)
        }
        expect(new Sunorhc(2020,1,32).day).toBe(1)
        expect(new Sunorhc(2020,1,32).month).toBe(2)
        expect(new Sunorhc(2020,2,29).day).toBe(29)
        expect(new Sunorhc(2021,2,29).day).toBe(1)
    })

    test('Get weekday', () => {
        // ISO 8601: Monday = 1 ~ Sunday = 7
        const opt1 = {locale: 'fr-FR', localeFormats: {weekday: {weekday: 'Short'}}},
              opt2 = {locale: 'ja-JP', localeFormats: {weekday: {weekday: 'long'}}}
        for (let _d = 6; _d < 13; _d++) {
            // 2020/1/6 Mon ~ 2020/1/12 Sun
            let s1 = new Sunorhc(2020,1,_d,opt1),
                s2 = new Sunorhc(2020,1,_d,opt2)
            expect(s1.weekday).toBe(_d - 5)
            expect(s2.weekday).toBe(_d - 5)
        }
        expect(new Sunorhc(2020,1,13).weekday).toBe(1)
    })

    test('Get weekdayShort', () => {
        // The value is retrieved by the getter is independent of the language setting.
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
              opt1 = {locale: 'fr-FR', localeFormats: {weekday: {weekday: 'long'}}},
              opt2 = {locale: 'ja-JP', localeFormats: {weekday: {weekday: 'long'}}}
        for (let _d = 5; _d < 12; _d++) {
            // 2020/1/5 Sun ~ 2020/1/11 Sat
            expect(new Sunorhc(2020,1,_d,opt1).weekdayShort).toBe(weekdays[_d - 5])
            expect(new Sunorhc(2020,1,_d,opt2).weekdayShort).toBe(weekdays[_d - 5])
        }
        expect(new Sunorhc(2020,1,12).weekdayShort).toBe('Sun')
    })

    test('Get weekdayLong', () => {
        // The value is retrieved by the getter is independent of the language setting.
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              opt1 = {locale: 'fr-FR', localeFormats: {weekday: {weekday: 'short'}}},
              opt2 = {locale: 'ja-JP', localeFormats: {weekday: {weekday: 'short'}}}
        for (let _d = 5; _d < 12; _d++) {
            // 2020/1/5 Sun ~ 2020/1/11 Sat
            expect(new Sunorhc(2020,1,_d,opt1).weekdayLong).toBe(weekdays[_d - 5])
            expect(new Sunorhc(2020,1,_d,opt2).weekdayLong).toBe(weekdays[_d - 5])
        }
        expect(new Sunorhc(2020,1,12).weekdayLong).toBe('Sunday')
    })

    test('Get hour', () => {
        expect(new Sunorhc(2020,1,1,-1).hour).toBe(23)
        for (let _h = 0; _h < 24; _h++) {
            expect(new Sunorhc(2020,1,1,_h).hour).toBe(_h)
        }
        expect(new Sunorhc(2020,1,1,24).hour).toBe(0)
    })

    test('Get minute', () => {
        expect(new Sunorhc(2020,1,1,1,-1).minute).toBe(59)
        for (let _m = 0; _m < 60; _m++) {
            expect(new Sunorhc(2020,1,1,1,_m).minute).toBe(_m)
        }
        expect(new Sunorhc(2020,1,1,1,60).minute).toBe(0)
    })

    test('Get second', () => {
        expect(new Sunorhc(2020,1,1,1,1,-1).second).toBe(59)
        for (let _s = 0; _s < 60; _s++) {
            expect(new Sunorhc(2020,1,1,1,1,_s).second).toBe(_s)
        }
        expect(new Sunorhc(2020,1,1,1,1,60).second).toBe(0)
    })

    test('Get millisecond', () => {
        expect(new Sunorhc(2020,1,1,1,1,1,-1).millisecond).toBe(999)
        for (let _ms = 0; _ms < 1000; _ms++) {
            expect(new Sunorhc(2020,1,1,1,1,1,_ms).millisecond).toBe(_ms)
        }
        expect(new Sunorhc(2020,1,1,1,1,1,1000).millisecond).toBe(0)
    })

    test('Get unix time', () => {
        const opts1 = {firstArgument: 'unix', epochUnit: 'millisecond'},
              opts2 = {firstArgument: 'unix', epochUnit: 'second'},
              opts3 = {firstArgument: 'timestamp', epochUnit: 'millisecond'},
              opts4 = {firstArgument: 'timestamp'}
        for (let _i = 0; _i < 3; _i++) {
            let _ts = randDate().getTime(),// Unit: Millisecond
                s1 = new Sunorhc(_ts, opts1),
                s2 = new Sunorhc(_ts, opts2),
                s3 = new Sunorhc(_ts, opts3),
                s4 = new Sunorhc(_ts, opts4)
            expect(s1.unix).toBe(_ts)
            expect(s2.unix).not.toBe(_ts)
            expect(s2.unix).toBe(Math.floor(_ts / 1000))
            expect(s3.unix).toBe(_ts)
            expect(s4.unix).not.toBe(_ts)
            expect(s4.unix).toBe(Math.floor(_ts / 1000))
        }
    })

    test('Get CE epoch time', () => {
        const opts1 = {firstArgument: 'year', epochUnit: 'millisecond'},
              opts2 = {firstArgument: 'year', epochUnit: 'second'},
              opts3 = {firstArgument: 'ce', epochUnit: 'millisecond'},
              opts4 = {firstArgument: 'ceepoch'},
              ceEpochTimes = [
                -1 * 366 * 24 * 60 * 60 * 1000,// BCE 1 (leapYearMS: 366 * 86400000 = 31,622,400,000)
                0,// CE 1
                365 * 24 * 60 * 60 * 1000,// CE 2 (yearMS: 365 * 86400000 = 31,536,000,000)
              ]
        for (let _y = 0; _y < 3; _y++) {
            expect(new Sunorhc(_y, opts1).ce).toBe(ceEpochTimes[_y])
            expect(new Sunorhc(_y, opts2).ce).toBe(Math.floor(ceEpochTimes[_y] / 1000))
        }
        for (let _ce = -1; _ce < 2; _ce++) {
            expect(new Sunorhc(_ce, opts3).ce).toBe(_ce)
            expect(new Sunorhc(_ce, opts4).ce).toBe(Math.floor(_ce / 1000))
        }
    })

    test('Get TimeZone', () => {
        expect(new Sunorhc().timezone).toBe('UTC')
        expect(new Sunorhc('local').timezone).toBe('local')
        expect(new Sunorhc('America/New_York').timezone).toBe('America/New_York')
        expect(new Sunorhc('Europe/Berlin').timezone).toBe('Europe/Berlin')
        expect(new Sunorhc('Asia/Tokyo').timezone).toBe('Asia/Tokyo')
        expect(new Sunorhc(2001,4,2,'Etc/UTC').timezone).toBe('Etc/UTC')
        expect(new Sunorhc('Singapore').timezone).toBe('local')// Deprecated timezone name
    })

    test('Get TimeZone offset', () => {
        const getLocalTZOffset = (...args) => {
            return new Date(...args).getTimezoneOffset() * 60000
        }
        expect(new Sunorhc().tzOffset).toBe(0)// UTC
        expect(new Sunorhc(1867,11,7).tzOffset).toBe(0)// UTC
        expect(new Sunorhc(1867,11,7,'local').tzOffset).toBe(getLocalTZOffset(1867,11,7))// local
        expect(new Sunorhc(2001,4,2,'local').tzOffset).toBe(getLocalTZOffset(2001,4,2))// local
        // The time zone offset that can be obtained by the getter is the time zone of the system in which Sunorhc is running.
        expect(new Sunorhc(2021,2,3,'America/New_York').tzOffset).not.toBe(18000000)// Timezone "America/New_York" offset is "UTC-05:00" (= 18000000 ms)
        expect(new Sunorhc(2021,2,3,'America/New_York').tzOffset).toBe(getLocalTZOffset(2021,2,3))
    })

    test('Get TimeZone offset string as the "HH:MM" format', () => {
        const getLocalTZOffsetString = (...args) => {
                let date = args.length == 0 ? NOW : new Date(...args),
                    _m = date.toString().match(/\sGMT(-|\+)(.*)\s/)
                return _m[1] + _m[2].slice(0, 2) + ':' + _m[2].slice(2)
              },
              localOffsetString = getLocalTZOffsetString()
        expect(new Sunorhc().tzOffsetHM).toBe('+00:00')
        expect(new Sunorhc('local').tzOffsetHM).toBe(localOffsetString)
        expect(new Sunorhc(1867,11,7).tzOffsetHM).toBe('+00:00')
        expect(new Sunorhc(1867,11,7,'local').tzOffsetHM).toBe(getLocalTZOffsetString(1867,11,7))
        expect(new Sunorhc('America/New_York').tzOffsetHM).toBe(localOffsetString)
        expect(new Sunorhc('Europe/Berlin').tzOffsetHM).toBe(localOffsetString)
        expect(new Sunorhc('Asia/Tokyo').tzOffsetHM).toBe(localOffsetString)
        expect(new Sunorhc(2001,4,2,'Etc/UTC').tzOffsetHM).toBe(getLocalTZOffsetString(2001,4,2))
        expect(new Sunorhc('Singapore').tzOffsetHM).toBe(localOffsetString)// Deprecated timezone name
    })

    test('Get TimeZone offset string as the "HH:MM.SS.mmm" format', () => {
        const getLocalTZOffsetString = (...args) => {
                let date = args.length == 0 ? NOW : new Date(...args),
                    _m = date.toString().match(/\sGMT(-|\+)(.*)\s/)
                return _m[1] + _m[2].slice(0, 2) + ':' + _m[2].slice(2) + ':00.000'
              },
              localOffsetString = getLocalTZOffsetString()
        expect(new Sunorhc().tzOffsetFull).toBe('+00:00:00.000')
        expect(new Sunorhc('local').tzOffsetFull).toBe(localOffsetString)
        expect(new Sunorhc(1867,11,7).tzOffsetFull).toBe('+00:00:00.000')
        expect(new Sunorhc(1867,11,7,'local').tzOffsetFull).toBe(getLocalTZOffsetString(1867,11,7))
        expect(new Sunorhc('America/New_York').tzOffsetFull).toBe(localOffsetString)
        expect(new Sunorhc('Europe/Berlin').tzOffsetFull).toBe(localOffsetString)
        expect(new Sunorhc('Asia/Tokyo').tzOffsetFull).toBe(localOffsetString)
        expect(new Sunorhc(2001,4,2,'Etc/UTC').tzOffsetFull).toBe(getLocalTZOffsetString(2001,4,2))
        expect(new Sunorhc('Singapore').tzOffsetFull).toBe(localOffsetString)// Deprecated timezone name
    })

    test('Get the date string with era', () => {
        expect(new Sunorhc().era).toMatch(/Anno\sDomini$/)
        expect(new Sunorhc(0).era).toMatch(/Before\sChrist$/)
    })
})

describe('Methods test', () => {

    test('"getUnixTime" method', () => {
        // Used as calculation core process of the instant value `unix` and `unixms`.
        const opts = {firstArgument: 'timestamp'}
        for (let _i = 0; _i < 3; _i++) {
            let _ts = randDate().getTime(),
                s = new Sunorhc(_ts, opts)
            expect(s.getUnixTime()).toBe(_ts)
            expect(s.getUnixTime('ms')).toBe(_ts)
            expect(s.getUnixTime('s')).toBe(Math.floor(_ts / 1000))
        }
    })

    test('"getCEEpoch" method', () => {
        // Used as calculation core process of the instant value `ce` and `cems`.
        const epochTimes = [
                -1 * 366 * 24 * 60 * 60 * 1000,// BCE 1 (leapYearMS: 366 * 86400000 = 31,622,400,000)
                0,// CE 1
                365 * 24 * 60 * 60 * 1000,// CE 2 (yearMS: 365 * 86400000 = 31,536,000,000)
              ]
        for (let _y = 0; _y < 3; _y++) {
            expect(new Sunorhc(_y).getCEEpoch()).toBe(epochTimes[_y])
            expect(new Sunorhc(_y).getCEEpoch('ms')).toBe(epochTimes[_y])
            expect(new Sunorhc(_y).getCEEpoch('s')).toBe(Math.floor(epochTimes[_y] / 1000))
        }
    })

    test('"getLocaleDateElement" method', () => {
        // Returns a string with a language sensitive representation of the date portion of this date 
        // that depending on toLocaleDateString or toLocaleTimeString method.
        const s1 = new Sunorhc(2021, 4, 9, 7, 3, 8, 4),
              s2 = new Sunorhc(1234, 5, 6, 7, 8, 9, 10),
              s3 = new Sunorhc(1998, 10, 1, 0),// 0 hour
              s4 = new Sunorhc(1996, 9, 10, 12),// 12 hour
              s5 = new Sunorhc(1994, 5, 23, 24),// 24 hour
              s6 = new Sunorhc(-678),// BCE. 679
              s7 = new Sunorhc(-1),// BCE. 2
              s8 = new Sunorhc(0),// BCE. 1
              s9 = new Sunorhc(1),// CE. 1
              s10 = new Sunorhc(50, 11, 12, 14, 15, 26, 37),// 2-digets
              s11 = new Sunorhc(189),// 3-digit year
              locale  = 'en-US',
              locale2 = 'fr-FR',
              locale3 = 'ja-JP-u-ca-japanese'
        // year
        expect( s1.getLocaleDateElement('year', 'numeric', locale)).toBe(2021)
        expect( s2.getLocaleDateElement('year', 'numeric', locale)).toBe(1234)
        expect( s1.getLocaleDateElement('year', '2-digit', locale)).toBe('21')
        expect( s2.getLocaleDateElement('year', '2-digit', locale)).toBe('34')
        expect( s6.getLocaleDateElement('year', '2-digit', locale)).toBe('-78')
        expect( s7.getLocaleDateElement('year', '2-digit', locale)).toBe('-01')
        expect( s8.getLocaleDateElement('year', '2-digit', locale)).toBe('00')
        expect( s9.getLocaleDateElement('year', '2-digit', locale)).toBe('01')
        expect(s10.getLocaleDateElement('year', '2-digit', locale)).toBe('50')
        expect(s11.getLocaleDateElement('year', '2-digit', locale)).toBe('89')
        expect( s1.getLocaleDateElement('year', '4-digit', locale)).toBe('2021')
        expect( s2.getLocaleDateElement('year', '4-digit', locale)).toBe('1234')
        expect( s6.getLocaleDateElement('year', '4-digit', locale)).toBe('-0678')
        expect( s7.getLocaleDateElement('year', '4-digit', locale)).toBe('-0001')
        expect( s8.getLocaleDateElement('year', '4-digit', locale)).toBe('0000')
        expect( s9.getLocaleDateElement('year', '4-digit', locale)).toBe('0001')
        expect(s10.getLocaleDateElement('year', '4-digit', locale)).toBe('0050')
        expect(s11.getLocaleDateElement('year', '4-digit', locale)).toBe('0189')
        // month
        expect(s1.getLocaleDateElement('month', 'numeric', locale)).toBe(4)
        expect(s1.getLocaleDateElement('month', '2-digit', locale)).toBe('04')
        expect(s1.getLocaleDateElement('month', 'long', locale)).toBe('April')
        expect(s1.getLocaleDateElement('month', 'short', locale)).toBe('Apr')
        expect(s1.getLocaleDateElement('month', 'narrow', locale)).toBe('A')
        expect(s3.getLocaleDateElement('month', 'long', locale)).toBe('October')
        expect(s3.getLocaleDateElement('month', 'short', locale)).toBe('Oct')
        expect(s3.getLocaleDateElement('month', 'narrow', locale)).toBe('O')
        // day
        expect(s1.getLocaleDateElement('day', 'numeric', locale)).toBe(9)
        expect(s5.getLocaleDateElement('day', 'numeric', locale)).toBe(24)
        expect(s1.getLocaleDateElement('day', '2-digit', locale)).toBe('09')
        expect(s4.getLocaleDateElement('day', '2-digit', locale)).toBe('10')
        // weekday
        expect(s1.getLocaleDateElement('weekday', 'long', locale)).toBe('Friday')
        expect(s1.getLocaleDateElement('weekday', 'short', locale)).toBe('Fri')
        expect(s1.getLocaleDateElement('weekday', 'narrow', locale)).toBe('F')
        // hour
        expect(s1.getLocaleDateElement('hour', 'numeric', locale)).toBe(7)
        expect(s1.getLocaleDateElement('hour', '2-digit', locale)).toBe('07')
        expect(s1.getLocaleDateElement('hour', {hour12: true, hour: 'numeric'}, locale)).toBe(7)
        expect(s1.getLocaleDateElement('hour', {hour12: true, hour: '2-digit'}, locale)).toBe('07')
        // - at 0 hour
        expect(s3.getLocaleDateElement('hour', 'numeric', locale)).toBe(0)
        expect(s3.getLocaleDateElement('hour', '2-digit', locale)).toBe('00')
        expect(s3.getLocaleDateElement('hour', {hour12: true, hour: 'numeric'}, locale)).toBe(12)
        expect(s3.getLocaleDateElement('hour', {hour12: true, hour: '2-digit'}, locale)).toBe('12')
        expect(s3.getLocaleDateElement('hour', {hour12: true}, locale)).toBe('12 AM')
        expect(s3.getLocaleDateElement('hour', {hour12: false}, locale)).toBe(0)
        expect(s3.getLocaleDateElement('hour', {hourCycle: 'h11', hour: 'numeric'}, locale)).toBe(0)
        expect(s3.getLocaleDateElement('hour', {hourCycle: 'h12', hour: 'numeric'}, locale)).toBe(0)
        expect(s3.getLocaleDateElement('hour', {hourCycle: 'h23', hour: 'numeric'}, locale)).toBe(0)
        expect(s3.getLocaleDateElement('hour', {hourCycle: 'h24', hour: 'numeric'}, locale)).toBe(0)
        // - at 12 hour 
        expect(s4.getLocaleDateElement('hour', 'numeric', locale)).toBe(12)
        expect(s4.getLocaleDateElement('hour', '2-digit', locale)).toBe('12')
        expect(s4.getLocaleDateElement('hour', {hour12: true, hour: 'numeric'}, locale)).toBe(12)
        expect(s4.getLocaleDateElement('hour', {hour12: true, hour: '2-digit'}, locale)).toBe('12')
        expect(s4.getLocaleDateElement('hour', {hour12: true}, locale)).toBe('12 PM')
        expect(s4.getLocaleDateElement('hour', {hour12: false}, locale)).toBe(12)
        expect(s4.getLocaleDateElement('hour', {hourCycle: 'h11', hour: 'numeric'}, locale)).toBe(12)
        expect(s4.getLocaleDateElement('hour', {hourCycle: 'h12', hour: 'numeric'}, locale)).toBe(12)
        expect(s4.getLocaleDateElement('hour', {hourCycle: 'h23', hour: 'numeric'}, locale)).toBe(12)
        expect(s4.getLocaleDateElement('hour', {hourCycle: 'h24', hour: 'numeric'}, locale)).toBe(12)
        // - at 24 hour
        expect(s5.getLocaleDateElement('hour', 'numeric', locale)).toBe(0)
        expect(s5.getLocaleDateElement('hour', '2-digit', locale)).toBe('00')
        expect(s5.getLocaleDateElement('hour', {hour12: true, hour: 'numeric'}, locale)).toBe(12)
        expect(s5.getLocaleDateElement('hour', {hour12: true, hour: '2-digit'}, locale)).toBe('12')
        expect(s5.getLocaleDateElement('hour', {hour12: true}, locale)).toBe('12 AM')
        expect(s5.getLocaleDateElement('hour', {hour12: false}, locale)).toBe(0)
        expect(s5.getLocaleDateElement('hour', {hourCycle: 'h11', hour: 'numeric'}, locale)).toBe(0)
        expect(s5.getLocaleDateElement('hour', {hourCycle: 'h12', hour: 'numeric'}, locale)).toBe(0)
        expect(s5.getLocaleDateElement('hour', {hourCycle: 'h23', hour: 'numeric'}, locale)).toBe(0)
        expect(s5.getLocaleDateElement('hour', {hourCycle: 'h24', hour: 'numeric'}, locale)).toBe(0)
        // minute
        expect(s1.getLocaleDateElement('minute', 'numeric', locale)).toBe(3)
        expect(s1.getLocaleDateElement('minute', '2-digit', locale)).toBe('03')
        // second
        expect(s1.getLocaleDateElement('second', 'numeric', locale)).toBe(8)
        expect(s1.getLocaleDateElement('second', '2-digit', locale)).toBe('08')
        // week
        expect(s1.getLocaleDateElement('week')).toBe(15)
        // millisecond
        expect(s1.getLocaleDateElement('millisecond')).toBe(4)
        expect(s1.getLocaleDateElement('millisecond', 'zerofill')).toBe('004')
        expect(s2.getLocaleDateElement('millisecond', 'zerofill')).toBe('010')
        // era
        expect(s1.getLocaleDateElement('era', 'long', locale)).toBe('4 9, 2021 Anno Domini')
        expect(s1.getLocaleDateElement('era', 'short', locale)).toBe('4 9, 2021 AD')
        expect(s1.getLocaleDateElement('era', 'narrow', locale)).toBe('4 9, 2021 A')
        // locale2
        expect(s1.getLocaleDateElement('year', 'numeric', locale2)).toBe(2021)
        expect(s1.getLocaleDateElement('year', '2-digit', locale2)).toBe('21')
        expect(s2.getLocaleDateElement('month', 'long', locale2)).toBe('M05')
        expect(s2.getLocaleDateElement('month', 'short', locale2)).toBe('M05')
        expect(s2.getLocaleDateElement('month', 'narrow', locale2)).toBe(5)
        expect(s1.getLocaleDateElement('day', 'numeric', locale2)).toBe(9)
        expect(s1.getLocaleDateElement('day', '2-digit', locale2)).toBe('09')
        expect(s1.getLocaleDateElement('weekday', 'long', locale2)).toBe('Fri')
        expect(s1.getLocaleDateElement('weekday', 'short', locale2)).toBe('Fri')
        expect(s1.getLocaleDateElement('weekday', 'narrow', locale2)).toBe('F')
        expect(s1.getLocaleDateElement('hour', 'numeric', locale2)).toBe(7)
        expect(s1.getLocaleDateElement('hour', '2-digit', locale2)).toBe('07')
        expect(s1.getLocaleDateElement('minute', 'numeric', locale2)).toBe(3)
        expect(s1.getLocaleDateElement('minute', '2-digit', locale2)).toBe('03')
        expect(s1.getLocaleDateElement('second', 'numeric', locale2)).toBe(8)
        expect(s1.getLocaleDateElement('second', '2-digit', locale2)).toBe('08')
        expect(s1.getLocaleDateElement('millisecond', locale2)).toBe(4)
        expect(s1.getLocaleDateElement('millisecond', 'zerofill', locale2)).toBe('004')
        expect(s1.getLocaleDateElement('era', {era: 'long'}, locale2)).toBe('2021-4-9 ├F0: CE┤')
        expect(s1.getLocaleDateElement('era', 'short', locale2)).toBe('2021-4-9 ├F0: CE┤')
        expect(s1.getLocaleDateElement('era', 'narrow', locale2)).toBe('2021-4-9 ├F0: CE┤')
        // locale3
        expect(s1.getLocaleDateElement('year', 'numeric', locale3)).toBe(2021)
        expect(s1.getLocaleDateElement('year', '2-digit', locale3)).toBe('21')
        expect(s2.getLocaleDateElement('month', 'long', locale3)).toBe('M05')
        expect(s2.getLocaleDateElement('month', 'short', locale3)).toBe('M05')
        expect(s2.getLocaleDateElement('month', 'narrow', locale3)).toBe(5)
        expect(s1.getLocaleDateElement('day', 'numeric', locale3)).toBe(9)
        expect(s1.getLocaleDateElement('day', '2-digit', locale3)).toBe('09')
        expect(s1.getLocaleDateElement('weekday', 'long', locale3)).toBe('Fri')
        expect(s1.getLocaleDateElement('weekday', 'short', locale3)).toBe('Fri')
        expect(s1.getLocaleDateElement('weekday', 'narrow', locale3)).toBe('F')
        expect(s1.getLocaleDateElement('hour', 'numeric', locale3)).toBe(7)
        expect(s1.getLocaleDateElement('hour', '2-digit', locale3)).toBe('07')
        expect(s1.getLocaleDateElement('minute', 'numeric', locale3)).toBe(3)
        expect(s1.getLocaleDateElement('minute', '2-digit', locale3)).toBe('03')
        expect(s1.getLocaleDateElement('second', 'numeric', locale3)).toBe(8)
        expect(s1.getLocaleDateElement('second', '2-digit', locale3)).toBe('08')
        expect(s1.getLocaleDateElement('millisecond', locale3)).toBe(4)
        expect(s1.getLocaleDateElement('millisecond', 'zerofill', locale3)).toBe('004')
        expect(s1.getLocaleDateElement('era', {era: 'long'}, locale3)).toBe('2021-4-9 ├F0: CE┤')
        expect(s1.getLocaleDateElement('era', 'short', locale3)).toBe('2021-4-9 ├F0: CE┤')
        expect(s1.getLocaleDateElement('era', 'narrow', locale3)).toBe('2021-4-9 ├F0: CE┤')
    })

    test('"format" method', () => {
        // Returns the instantiated date in a formatted format by PHP's date_format()-like formatter.
        const s1 = new Sunorhc(1, 2, 3, 4, 5, 6, 7),// C.E. 1 & all elements 1-digit & Saturday
              s2 = new Sunorhc(46, 12, 31, 23, 59, 59, 99),// all elements 2-digit & Monday
              s3 = new Sunorhc(794, 11, 18, 13, 10, 22, 123),// 3-digit year & Friday
              s4 = new Sunorhc(1970, 1, 1, 0, 0, 0, 0),// Unix epoch beginning & Thursday
              s5 = new Sunorhc(1996, 10, 9, 3, 4, 56, 789),// leap year & Wednesday
              s6 = new Sunorhc(2021, 3, 23, 12, 34, 45, 77),// not leap year & Tuesday
              s7 = new Sunorhc(2011, 3, 6, 14, 'local'),// Sunday & local timezone
              s8 = new Sunorhc(1983, 7, 15, 'Asia/Tokyo'),
              s9 = new Sunorhc(1),// C.E. 1 first datetime
              sysTzOffset = String(new Date().getTimezoneOffset() * 60 * 1000),
              getLocalTZOffsetString = (...args) => {
                let date = args.length == 0 ? NOW : new Date(...args),
                    _m = date.toString().match(/\sGMT(-|\+)(.*)\s/)
                return _m[1] + _m[2].slice(0, 2) + ':' + _m[2].slice(2)
              },
              localOffsetString = getLocalTZOffsetString()
        
        expect(s1.format('Y-m-d H:i:s.v')).toBe('1-02-03 04:05:06.007')
        expect(s2.format('Y-m-d H:i:s.v')).toBe('46-12-31 23:59:59.099')
        expect(s3.format('Y-m-d H:i:s.v')).toBe('794-11-18 13:10:22.123')
        expect(s4.format('Y-m-d H:i:s.v')).toBe('1970-01-01 00:00:00.000')
        expect(s5.format('Y-m-d H:i:s.v\\Z')).toBe('1996-10-09 03:04:56.789Z')
        expect(s6.format('Y-m-dTH:i:s')).toBe('2021-03-23T12:34:45')
        // Year
        expect(s1.format('Y')).toBe('1')
        expect(s2.format('Y')).toBe('46')
        expect(s3.format('Y')).toBe('794')
        expect(s4.format('Y')).toBe('1970')
        expect(s1.format('y')).toBe('01')
        expect(s2.format('y')).toBe('46')
        expect(s3.format('y')).toBe('94')
        expect(s4.format('y')).toBe('70')
        expect(s5.format('L')).toBe('1')
        expect(s5.format('L')).toBeTruthy()
        expect(s6.format('L')).toBe('0')
        expect(s6.format('L')).not.toBeFalsy()// because return "0"
        // Month
        expect(s1.format('F')).toBe('February')
        expect(s2.format('F')).toBe('December')
        expect(s5.format('F')).toBe('October')
        expect(s6.format('F')).toBe('March')
        expect(s1.format('m')).toBe('02')
        expect(s2.format('m')).toBe('12')
        expect(s5.format('m')).toBe('10')
        expect(s6.format('m')).toBe('03')
        expect(s1.format('M')).toBe('Feb')
        expect(s2.format('M')).toBe('Dec')
        expect(s5.format('M')).toBe('Oct')
        expect(s6.format('M')).toBe('Mar')
        expect(s1.format('n')).toBe('2')
        expect(s2.format('n')).toBe('12')
        expect(s5.format('n')).toBe('10')
        expect(s6.format('n')).toBe('3')
        // Week
        expect(s1.format('W')).toBe('5')
        expect(s2.format('W')).toBe('53')
        expect(s5.format('W')).toBe('41')
        expect(s6.format('W')).toBe('12')
        // Day
        expect(s1.format('d')).toBe('03')
        expect(s2.format('d')).toBe('31')
        expect(s4.format('d')).toBe('01')
        expect(s5.format('d')).toBe('09')
        expect(s1.format('j')).toBe('3')
        expect(s2.format('j')).toBe('31')
        expect(s4.format('j')).toBe('1')
        expect(s5.format('j')).toBe('9')
        expect(s1.format('z')).toBe('33')
        expect(s2.format('z')).toBe('364')
        expect(s4.format('z')).toBe('0')
        expect(s5.format('z')).toBe('282')
        // Weekday
        expect(s1.format('l')).toBe('Saturday')
        expect(s2.format('l')).toBe('Monday')
        expect(s3.format('l')).toBe('Friday')
        expect(s4.format('l')).toBe('Thursday')
        expect(s1.format('D')).toBe('Sat')
        expect(s2.format('D')).toBe('Mon')
        expect(s3.format('D')).toBe('Fri')
        expect(s4.format('D')).toBe('Thu')
        expect(s2.format('N')).toBe('1')// Mon
        expect(s6.format('N')).toBe('2')// Tue
        expect(s5.format('N')).toBe('3')// Wed
        expect(s4.format('N')).toBe('4')// Thu
        expect(s3.format('N')).toBe('5')// Fri
        expect(s1.format('N')).toBe('6')// Sat
        expect(s7.format('N')).toBe('7')// Sun
        expect(s7.format('w')).toBe('0')// Sun
        expect(s2.format('w')).toBe('1')// Mon
        expect(s6.format('w')).toBe('2')// Tue
        expect(s5.format('w')).toBe('3')// Wed
        expect(s4.format('w')).toBe('4')// Thu
        expect(s3.format('w')).toBe('5')// Fri
        expect(s1.format('w')).toBe('6')// Sat
        // Hour
        expect(s1.format('a')).toBe('0')// A.M.
        expect(s1.format('a')).not.toBeFalsy()// because return "0"
        expect(s3.format('a')).toBe('1')// P.M.
        expect(s3.format('a')).toBeTruthy()
        expect(s1.format('g')).toBe('4')// A.M. 1-digit hour
        expect(s6.format('g')).toBe('12')// A.M. 2-digit hour
        expect(s3.format('g')).toBe('1')// P.M. 1-digit hour in hour12
        expect(s2.format('g')).toBe('11')// P.M. 2-digit hour in hour12
        expect(s1.format('G')).toBe('4')
        expect(s6.format('G')).toBe('12')
        expect(s3.format('G')).toBe('13')
        expect(s2.format('G')).toBe('23')
        expect(s1.format('h')).toBe('04')
        expect(s6.format('h')).toBe('12')
        expect(s3.format('h')).toBe('01')
        expect(s2.format('h')).toBe('11')
        expect(s1.format('H')).toBe('04')
        expect(s6.format('H')).toBe('12')
        expect(s3.format('H')).toBe('13')
        expect(s2.format('H')).toBe('23')
        // Minute
        expect(s1.format('I')).toBe('5')// 1-digit minute
        expect(s6.format('I')).toBe('34')// 2-digit minute
        expect(s4.format('I')).toBe('0')
        expect(s2.format('I')).toBe('59')
        expect(s1.format('i')).toBe('05')// 1-digit minute
        expect(s6.format('i')).toBe('34')// 2-digit minute
        expect(s4.format('i')).toBe('00')
        expect(s2.format('i')).toBe('59')
        // Second
        expect(s1.format('S')).toBe('6')// 1-digit second
        expect(s3.format('S')).toBe('22')// 2-digit second
        expect(s4.format('S')).toBe('0')
        expect(s2.format('S')).toBe('59')
        expect(s1.format('s')).toBe('06')// 1-digit second
        expect(s3.format('s')).toBe('22')// 2-digit second
        expect(s4.format('s')).toBe('00')
        expect(s2.format('s')).toBe('59')
        // Millisecond
        expect(s1.format('V')).toBe('7')// 1-digit millisecond
        expect(s6.format('V')).toBe('77')// 2-digit millisecond
        expect(s3.format('V')).toBe('123')// 3-digit millisecond
        expect(s4.format('V')).toBe('0')
        expect(s1.format('v')).toBe('007')// 1-digit millisecond
        expect(s6.format('v')).toBe('077')// 2-digit millisecond
        expect(s3.format('v')).toBe('123')// 3-digit millisecond
        expect(s4.format('v')).toBe('000')
        // TimeZone
        expect(s1.format('e')).toBe('UTC')
        expect(s7.format('e')).toBe('local')
        expect(s8.format('e')).toBe('Asia/Tokyo')
        expect(s1.format('Z')).toBe('0')
        expect(s7.format('Z')).toBe(sysTzOffset)
        expect(s8.format('Z')).toBe(sysTzOffset)
        // Full Datetime
        expect(s1.format('c')).toBe('0001-02-03T04:05:06.007Z')
        expect(s2.format('c')).toBe('0046-12-31T23:59:59.099Z')
        expect(s3.format('c')).toBe('0794-11-18T13:10:22.123Z')
        expect(s4.format('c')).toBe('1970-01-01T00:00:00.000Z')
        expect(s7.format('c')).toBe('2011-03-06T14:00:00.000' + localOffsetString)// Local timezone date
        expect(s1.format('r')).toBe('Sat, 03 Feb 0001 04:05:06 GMT')
        expect(s2.format('r')).toBe('Mon, 31 Dec 0046 23:59:59 GMT')
        expect(s3.format('r')).toBe('Fri, 18 Nov 0794 13:10:22 GMT')
        expect(s4.format('r')).toBe('Thu, 01 Jan 1970 00:00:00 GMT')
        expect(s7.format('r')).toBe('Sun, 06 Mar 2011 14:00:00 ' + localOffsetString.replace(':', ''))// Local timezone date
        expect(s9.format('U')).toBe('-62135596800')
        expect(s1.format('U')).toBe('-62132730894')
        expect(s2.format('U')).toBe('-60683990401')
        expect(s3.format('U')).toBe('-37083178178')
        expect(s4.format('U')).toBe('0')
        expect(s7.format('U')).toBe('1299387600')
        expect(s9.format('u')).toBe('-62135596800000')
        expect(s1.format('u')).toBe('-62132730893993')
        expect(s2.format('u')).toBe('-60683990400901')
        expect(s3.format('u')).toBe('-37083178177877')
        expect(s4.format('u')).toBe('0')
        expect(s7.format('u')).toBe('1299387600000')
        expect(s9.format('B')).toBe('0')
        expect(s1.format('B')).toBe('2865906')
        expect(s2.format('B')).toBe('1451606399')
        expect(s3.format('B')).toBe('25052418622')
        expect(s4.format('B')).toBe('62135596800')
        expect(s7.format('B')).toBe('63435016800')
        expect(s9.format('b')).toBe('0')
        expect(s1.format('b')).toBe('2865906007')
        expect(s2.format('b')).toBe('1451606399099')
        expect(s3.format('b')).toBe('25052418622123')
        expect(s4.format('b')).toBe('62135596800000')
        expect(s7.format('b')).toBe('63435016800000')
        // escape formatter
        expect(s1.format('.v\\Z')).toBe('.007Z')
        expect(s8.format('\\Y\\Y\\Y\\Y: Y')).toBe('YYYY: 1983')
    })

    test('"getUTC" method', () => {
        // Gets new Sunorhc instance with a UTC date from the local timezone date.
        const su = new Sunorhc(NOW),
              sz = new Sunorhc(NOW, 'local')
        // from UTC
        expect(Object.keys(su.getUTC().instant).sort()).toEqual(INSTANT_PROPS)
        expect(su.getUTC().timezone).toBe('UTC')
        expect(su.getUTC().toISOString).toBe(NOW_UTC)
        // from Zoned
        expect(Object.keys(sz.getUTC().instant).sort()).toEqual(INSTANT_PROPS)
        expect(sz.getUTC().timezone).toBe('UTC')
        expect(sz.toISOString).toBe(NOW_LOCAL)
        expect(sz.getUTC().toISOString).toBe(NOW_UTC)
    })

    test('"toUTCDate" method', () => {
        // Converts the current Sunorhc instance to a Date object with a UTC date.
        const su = new Sunorhc(NOW),
              sz = new Sunorhc(NOW, 'local')
        // from UTC
        expect(su.toUTCDate() instanceof Date).toBeTruthy()
        expect(su.toUTCDate().toISOString()).toBe(NOW_UTC)
        expect(su.toUTCDate().toString()).toStrictEqual(NOW.toString())
        // from Zoned
        expect(sz.toISOString).toBe(NOW_LOCAL)
        expect(sz.toUTCDate() instanceof Date).toBeTruthy()
        expect(sz.toUTCDate().toISOString()).toBe(NOW_UTC)
        expect(sz.toUTCDate().toString()).toStrictEqual(NOW.toString())
    })

    test('"getZoned" method', () => {
        // Gets new Sunorhc instance with a local timezoned date from the UTC date.
        const su = new Sunorhc(NOW),
              sz = new Sunorhc(NOW, 'local')
        // from UTC
        expect(Object.keys(su.getZoned().instant).sort()).toEqual(INSTANT_PROPS)
        expect(su.getZoned().timezone).toBe('local')
        expect(su.toISOString).toBe(NOW_UTC)
        expect(su.getZoned().toISOString).toBe(NOW_LOCAL)
        // from Zoned
        expect(Object.keys(sz.getZoned().instant).sort()).toEqual(INSTANT_PROPS)
        expect(sz.getZoned().timezone).toBe('local')
        expect(sz.getZoned().toISOString).toBe(NOW_LOCAL)
    })

    test('"toZonedDate" method', () => {
        // Converts the current Sunorhc instance to a Date object with a local timezoned date.
        const su = new Sunorhc(NOW),
              sz = new Sunorhc(NOW, 'local')
        // from UTC
        expect(su.toISOString).toBe(NOW_UTC)
        expect(su.toZonedDate() instanceof Date).toBeTruthy()
        expect(su.toZonedDate().toISOString()).toBe(NOW_UTC)
        expect(su.toZonedDate().toString()).toStrictEqual(NOW.toString())
        // from Zoned
        expect(sz.toZonedDate() instanceof Date).toBeTruthy()
        expect(sz.toZonedDate().toISOString()).toBe(NOW_UTC)
        expect(sz.toZonedDate().toString()).toStrictEqual(NOW.toString())
    })

    test('"getTZOffset" method', () => {
        // Get the time difference from the UTC date in the timezone of the current system.
        expect(new Sunorhc(NOW, 'local').getTZOffset('min')).toBe(NOW.getTimezoneOffset())
        expect(new Sunorhc(NOW_UTC).getTZOffset('minute')).toBe(0)
        expect(new Sunorhc().getTZOffset('h')).toBe(0)
        expect(new Sunorhc('local').getTZOffset('hour')).toBe(NOW.getTimezoneOffset() / 60)
        expect(new Sunorhc().getTZOffset('sec')).toBe(0)
        expect(new Sunorhc('local').getTZOffset('second')).toBe(NOW.getTimezoneOffset() * 60)
        expect(new Sunorhc().getTZOffset()).toBe(0)
        expect(new Sunorhc('local').getTZOffset()).toBe(new Date().getTimezoneOffset() * 60 * 1000)
    })

    test('"modify" method', () => {
        // Calculates the date added or subtracted by the specified unit to the instantiated date.
        const s1  = new Sunorhc(2000, 1, 1, 0, 0, 0, 0),
              s2  = new Sunorhc(1),// C.E. 1 first datetime
              mod = (payload, unit, obj) => {
                  return obj.modify(payload, unit).toISOString
              }
        
        expect(s1.modify()).toBe(false)
        expect(s1.modify(0)).toBe(false)
        expect(s1.modify(1)).toBe(false)
        expect(s1.modify(1, true)).toBe(false)
        expect(s1.modify(1, '')).toBe(false)
        expect(s1.modify(1, 'Mins')).toBe(false)
        expect(s1.modify('one', 'year')).toBe(false)
        expect(s1.modify('3rd', 'DAYs')).toBeTruthy()
        // year
        expect(mod(0, 'YEARs', s1)).toBe('2000-01-01T00:00:00.000Z')
        expect(mod('-1', 'Years', s1)).toBe('1999-01-01T00:00:00.000Z')
        expect(mod('+1', 'Year', s1)).toBe('2001-01-01T00:00:00.000Z')
        expect(mod(12, 'year', s1)).toBe('2012-01-01T00:00:00.000Z')
        expect(mod(-2345, 'year', s1)).toBe('-0345-01-01T00:00:00.000Z')
        expect(mod(-1, 'year', s2)).toBe('0000-01-01T00:00:00.000Z')
        expect(mod(-2, 'year', s2)).toBe('-0001-01-01T00:00:00.000Z')
        // month
        expect(mod(0, 'MONTHs', s1)).toBe('2000-01-01T00:00:00.000Z')
        expect(mod('-1', 'Months', s1)).toBe('1999-12-01T00:00:00.000Z')
        expect(mod('+1', 'Month', s1)).toBe('2000-02-01T00:00:00.000Z')
        expect(mod(6, 'month', s1)).toBe('2000-07-01T00:00:00.000Z')
        expect(mod(-14, 'month', s1)).toBe('1998-11-01T00:00:00.000Z')
        // week
        expect(mod(0, 'WEEKs', s1)).toBe('2000-01-01T00:00:00.000Z')
        expect(mod('-1', 'Weeks', s1)).toBe('1999-12-25T00:00:00.000Z')
        expect(mod('+1', 'Week', s1)).toBe('2000-01-08T00:00:00.000Z')
        expect(mod(6, 'week', s1)).toBe('2000-02-12T00:00:00.000Z')
        expect(mod(-14, 'week', s1)).toBe('1999-09-25T00:00:00.000Z')
        expect(mod(53, 'week', s1)).toBe('2001-01-06T00:00:00.000Z')
        // day
        expect(mod(0, 'DAYs', s1)).toBe('2000-01-01T00:00:00.000Z')
        expect(mod('-1', 'Days', s1)).toBe('1999-12-31T00:00:00.000Z')
        expect(mod('+1', 'Day', s1)).toBe('2000-01-02T00:00:00.000Z')
        expect(mod(15, 'day', s1)).toBe('2000-01-16T00:00:00.000Z')
        expect(mod(-20, 'day', s1)).toBe('1999-12-12T00:00:00.000Z')
        expect(mod(-31, 'day', s1)).toBe('1999-12-01T00:00:00.000Z')
        // hour
        expect(mod(0, 'HOURs', s1)).toBe('2000-01-01T00:00:00.000Z')
        expect(mod('-1', 'Hours', s1)).toBe('1999-12-31T23:00:00.000Z')
        expect(mod('+1', 'hour', s1)).toBe('2000-01-01T01:00:00.000Z')
        expect(mod(+24, 'hour', s1)).toBe('2000-01-02T00:00:00.000Z')
        expect(mod(-30, 'hour', s1)).toBe('1999-12-30T18:00:00.000Z')
        // minute
        expect(mod(0, 'MINUTEs', s1)).toBe('2000-01-01T00:00:00.000Z')
        expect(mod('-1', 'Minutes', s1)).toBe('1999-12-31T23:59:00.000Z')
        expect(mod('+1', 'minute', s1)).toBe('2000-01-01T00:01:00.000Z')
        expect(mod(+63, 'Min', s1)).toBe('2000-01-01T01:03:00.000Z')
        expect(mod(-540, 'min', s1)).toBe('1999-12-31T15:00:00.000Z')
        // second
        expect(mod(0, 'SECONDs', s1)).toBe('2000-01-01T00:00:00.000Z')
        expect(mod('-1', 'Seconds', s1)).toBe('1999-12-31T23:59:59.000Z')
        expect(mod('+1', 'second', s1)).toBe('2000-01-01T00:00:01.000Z')
        expect(mod(180, 'Sec', s1)).toBe('2000-01-01T00:03:00.000Z')
        expect(mod(-966, 'sec', s1)).toBe('1999-12-31T23:43:54.000Z')
        // millisecond
        expect(mod(0, 'MILLISECONDs', s1)).toBe('2000-01-01T00:00:00.000Z')
        expect(mod('-1', 'MilliSeconds', s1)).toBe('1999-12-31T23:59:59.999Z')
        expect(mod('+1', 'millisecond', s1)).toBe('2000-01-01T00:00:00.001Z')
        expect(mod(777, 'MS', s1)).toBe('2000-01-01T00:00:00.777Z')
        expect(mod(-1223, 'ms', s1)).toBe('1999-12-31T23:59:58.777Z')
    })

    test('"interval" method', () => {
        // Get calculated interval between the instantiated date and a specific date, 
        // with the specified unit.
        const s1 = new Sunorhc(2000, 1, 1, 0, 0, 0, 0),
              s2 = new Sunorhc(1),// C.E. 1 first date
              c1 = '2000-01-10T12:34:45.678',// comparison with date on the future from the base date
              c2 = '2000-01-08T00:00:00.000',// just 1 week after
              c3 = '1999-12-25T00:00:00.000',// just 1 week before
              c4 = '1999-12-01T00:00:00.000',// comparison with date on the past from the base date
              c5 = '0001-01-01T00:00:00.000',
              c6 = '+275760-09-13T00:00:00.000',
              c7 = '2000-06-01T00:00:00.000',
              c8 = '1999-06-01T00:00:00.000',
              c9 = '2000-03-01T00:00:00.000',
              c0 = '1998-10-13T01:02:03.444',
              ca = '2021-07-10T12:00:00.000'
        expect(s1.interval()).toBe(false)
        expect(s1.interval(null)).toBe(false)
        expect(s1.interval('now')).toBeTruthy()// Compare with the current date. Unit is millisecond.
        expect(s1.interval({})).toBeTruthy()// Compare with the current date. Unit is millisecond.
        // year
        expect(s1.interval(c1, 'years')).toBe(0)
        expect(s1.interval(c1, 'year')).toBe(0)
        expect(s1.interval(c2, 'year')).toBe(0)
        expect(s1.interval(c4, 'year')).toBe(0)
        expect(s1.interval(c5, 'year')).toBe(-1998.9)
        expect(s1.interval(c7, 'year')).toBe(0)
        expect(s1.interval(c0, 'year')).toBe(-1.2)
        expect(s1.interval(ca, 'year')).toBe(21.6)
        // month
        expect(s1.interval(c1, 'months')).toBe(0)
        expect(s1.interval(c1, 'month')).toBe(0)
        expect(s1.interval(c2, 'month')).toBe(0)
        expect(s1.interval(c3, 'month')).toBe(0)
        expect(s1.interval(c4, 'month')).toBe(-1)
        expect(s1.interval(c7, 'month')).toBe(5)
        expect(s1.interval(c8, 'month')).toBe(-7)
        expect(s1.interval(c9, 'month')).toBe(2)
        expect(s1.interval(c0, 'month')).toBe(-14.5)
        // week
        expect(s1.interval(c1, 'weeks')).toBe(1.4)
        expect(s1.interval(c1, 'week')).toBe(1.4)
        expect(s1.interval(c2, 'week')).toBe(1)
        expect(s1.interval(c3, 'week')).toBe(-1)
        expect(s1.interval(c4, 'week')).toBe(-4.4)
        // day
        expect(s1.interval(c1, 'days')).toBe(10)
        expect(s1.interval(c1, 'day')).toBe(10)
        expect(s1.interval(c2, 'day')).toBe(7)
        expect(s1.interval(c3, 'day')).toBe(-7)
        expect(s1.interval(c4, 'day')).toBe(-31)
        // hour
        expect(s1.interval(c1, 'hours')).toBe(229)
        expect(s1.interval(c1, 'hour')).toBe(229)
        expect(s1.interval(c2, 'hour')).toBe(168)
        expect(s1.interval(c3, 'hour')).toBe(-168)
        expect(s1.interval(c4, 'hour')).toBe(-744)
        // minute
        expect(s1.interval(c1, 'minutes')).toBe(13715)
        expect(s1.interval(c1, 'minute')).toBe(13715)
        expect(s1.interval(c1, 'min')).toBe(13715)
        expect(s1.interval(c2, 'min')).toBe(10080)
        expect(s1.interval(c3, 'min')).toBe(-10080)
        expect(s1.interval(c4, 'min')).toBe(-44640)
        // second
        expect(s1.interval(c1, 'seconds')).toBe(822886)
        expect(s1.interval(c1, 'second')).toBe(822886)
        expect(s1.interval(c1, 'sec')).toBe(822886)
        expect(s1.interval(c2, 'sec')).toBe(604800)
        expect(s1.interval(c3, 'sec')).toBe(-604800)
        expect(s1.interval(c4, 'sec')).toBe(-2678400)
        // millisecond
        expect(s1.interval(c1, 'milliseconds')).toBe(822885678)
        expect(s1.interval(c1, 'millisecond')).toBe(822885678)
        expect(s1.interval(c1, 'ms')).toBe(822885678)
        expect(s1.interval(c2, 'ms')).toBe(604800000)
        expect(s1.interval(c3, 'ms')).toBe(-604800000)
        expect(s1.interval(c4, 'ms')).toBe(-2678400000)
        expect(s1.interval(c5, 'ms')).toBe(-63082281600000)
        expect(s2.interval(c6, 'ms')).toBe(8702135564400000)// epoch ms to max Datetime from CE 1 first datetime < Number.MAX_SAFE_INTEGER (9007199254740991)
    })

    test('"clone" method', () => {
        // Duplicate an instance of a Sunorhc object.
        const s1 = new Sunorhc(),
              s2 = s1.clone()
        expect(s1).toStrictEqual(s2)
        expect(s1.toISOString).toBe(s2.toISOString)
    })

    test('"isValid" method', () => {
        // Determines if the Date object given in the argument is valid.
        // Evaluates the instance's own date if there are no arguments or 
        // if the argument is not a date object.
        const s1 = new Sunorhc()
        expect(s1.isValid()).toBe(true)
        expect(s1.isValid(NOW)).toBe(true)
        expect(s1.isValid(NOW_UTC)).toBe(true)
        expect(s1.isValid(new Date(''))).toBe(false)
        expect(s1.isValid('2012-3-4')).toBe(true)
        expect(s1.isValid([])).toBe(false)
        expect(s1.isValid({})).toBe(false)
    })

    test('"getWeekOfYear" method', () => {
        // Used as calculation core process of the instant value `week`.
        // The week number for the year is calculated.
        expect(new Sunorhc(2019,12,31).getWeekOfYear()).toBe(53)
        expect(new Sunorhc(2020,1,1).getWeekOfYear()).toBe(1)
        expect(new Sunorhc(2020,1,8).getWeekOfYear()).toBe(2)
    })

    test('"getDaysInYear" method', () => {
        // The total number of days in the year on the instantiated date is calculated.
        for (let _y = 0; _y <= 2021; _y++) {
            expect(new Sunorhc(_y).getDaysInYear()).toBe((_y % 4 == 0 ? 366: 365))
        }
        expect(new Sunorhc(2020, 12, 31, 24).getDaysInYear()).toBe(365)
        expect(new Sunorhc().getDaysInYear(new Date(1998, 7, 6, 11, 22, 33))).toBe(365)
        expect(new Sunorhc().getDaysInYear(new Date(2000, 7, 7))).toBe(366)
    })

    test('"getDaysInMonth" method', () => {
        // The total number of days in the month on the instantiated date is calculated.
        expect(new Sunorhc(2020, 1, 1).getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2020, 2, 2).getDaysInMonth()).toBe(29)
        expect(new Sunorhc(2020, 3, 3).getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2020, 4, 4).getDaysInMonth()).toBe(30)
        expect(new Sunorhc(2020, 5, 5).getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2020, 6, 6).getDaysInMonth()).toBe(30)
        expect(new Sunorhc(2020, 7, 7).getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2020, 8, 8).getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2020, 9, 9).getDaysInMonth()).toBe(30)
        expect(new Sunorhc(2020, 10, 10).getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2020, 11, 11).getDaysInMonth()).toBe(30)
        expect(new Sunorhc(2020, 12, 12).getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2021, 1, 13, 'local').getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2021, 2, 14, 'local').getDaysInMonth()).toBe(28)
        expect(new Sunorhc(2021, 3, 15, 'local').getDaysInMonth()).toBe(31)
        expect(new Sunorhc(2021, 4, 16, 'local').getDaysInMonth()).toBe(30)
    })

    test('"getCumulativeDays" method', () => {
        // Get cumulative days in year untill current day from first day of year.
        for (let _d = 1; _d <= 366; _d++) {
            expect(new Sunorhc(2020, 1, _d).getCumulativeDays()).toBe(_d - 1)
        }
        expect(new Sunorhc().getCumulativeDays( new Date(Date.UTC(1998, 0, 1)) )).toBe(0)// UTC
        expect(new Sunorhc().getCumulativeDays( new Date('1998-01-01T00:00:00.000+09:00') )).toBe(364)// local
        expect(new Sunorhc().getCumulativeDays( new Date('1998-01-01T09:00:00.000+09:00') )).toBe(0)// local
        expect(new Sunorhc().getCumulativeDays( new Date('1998-02-03T00:00:00Z') )).toBe(33)// UTC
        expect(new Sunorhc().getCumulativeDays( new Date('1999-12-31T23:59:59.999Z') )).toBe(364)// UTC
        expect(new Sunorhc().getCumulativeDays( new Date('2000-12-31T00:00:00Z') )).toBe(365)// UTC
    })

    test('"getWeekdayIndex" method', () => {
        // Get the numeric index of weekday depended on specified format.
        // 2021-07-05: Monday ~ 2021-07-11: Sunday
        expect(new Sunorhc(2021,7,5).getWeekdayIndex()).toBe(1)
        expect(new Sunorhc(2021,7,5).getWeekdayIndex('iso8601')).toBe(1)
        expect(new Sunorhc(2021,7,6).getWeekdayIndex()).toBe(2)
        expect(new Sunorhc(2021,7,6).getWeekdayIndex('iso8601')).toBe(2)
        expect(new Sunorhc(2021,7,7).getWeekdayIndex()).toBe(3)
        expect(new Sunorhc(2021,7,7).getWeekdayIndex('iso8601')).toBe(3)
        expect(new Sunorhc(2021,7,8).getWeekdayIndex()).toBe(4)
        expect(new Sunorhc(2021,7,8).getWeekdayIndex('iso8601')).toBe(4)
        expect(new Sunorhc(2021,7,9).getWeekdayIndex()).toBe(5)
        expect(new Sunorhc(2021,7,9).getWeekdayIndex('iso8601')).toBe(5)
        expect(new Sunorhc(2021,7,10).getWeekdayIndex()).toBe(6)
        expect(new Sunorhc(2021,7,10).getWeekdayIndex('iso8601')).toBe(6)
        expect(new Sunorhc(2021,7,11).getWeekdayIndex()).toBe(0)
        expect(new Sunorhc(2021,7,11).getWeekdayIndex('iso8601')).toBe(7)
        expect(new Sunorhc(2021,7,12).getWeekdayIndex()).toBe(1)
        expect(new Sunorhc(2021,7,12).getWeekdayIndex('iso8601')).toBe(1)
    })

    test('"getISO" method', () => {
        // Get the ISO 8601 string of date and time depended on specified format.
        const p1 = [2021,7,14,8,12,43,478],
              p2 = [2021,6,14,8,12,43,478],
              s1 = new Sunorhc(...p1),// UTC
              s2 = new Sunorhc(...p1,'local'),// local
              getLocalTZOffsetString = (...args) => {
                let date = args.length == 0 ? NOW : new Date(...args),
                    _m = date.toString().match(/\sGMT(-|\+)(.*)\s/)
                return _m[1] + _m[2].slice(0, 2) + ':' + _m[2].slice(2)
              },
              localOffsetString = getLocalTZOffsetString()
        // format: none or "full"
        expect(s1.getISO()).toBe('2021-07-14T08:12:43.478Z')
        expect(s1.getISO('full')).toBe('2021-07-14T08:12:43.478Z')
        expect(s2.getISO()).toBe(convLocalISOString(new Date(...p2)))
        expect(s2.getISO('full')).toBe(convLocalISOString(new Date(...p2)))
        // format: "date"
        expect(s1.getISO('date')).toBe('2021-07-14')
        expect(s2.getISO('date')).toBe('2021-07-14')
        // format: "week"
        expect(s1.getISO('week')).toBe('2021-W28')
        expect(s2.getISO('week')).toBe('2021-W28')
        // format: "weekday"
        expect(s1.getISO('weekday')).toBe('2021-W28-3')
        expect(s2.getISO('weekday')).toBe('2021-W28-3')
        // format: "ordinal"
        expect(s1.getISO('ordinal')).toBe('2021-194')
        expect(s2.getISO('ordinal')).toBe('2021-194')
        // format: "time"
        expect(s1.getISO('time')).toBe('08:12:43.478')
        expect(s2.getISO('time')).toBe('08:12:43.478')
        // format: "offset"
        expect(s1.getISO('offset')).toBe('+00:00')
        expect(s2.getISO('offset')).toBe(localOffsetString)
        // format: "noz"
        expect(s1.getISO('noz')).toBe('2021-07-14T08:12:43.478+00:00')
        expect(s2.getISO('noz')).toBe(convLocalISOString(new Date(...p2)))
    })

    test('"getRFC" method', () => {
        // Get the RFC xxxx string as legacy date and time format.
        const p1 = [2021,7,14,8,12,43,478],
              p2 = [2021,6,14,8,12,43,478],
              s1 = new Sunorhc(...p1),// UTC
              s2 = new Sunorhc(...p1,'local'),// local
              getLocalTZOffsetString = (...args) => {
                let date = args.length == 0 ? NOW : new Date(...args),
                    _m = date.toString().match(/\sGMT(-|\+)(.*)\s/)
                return _m[1] + _m[2].slice(0, 2) + ':' + _m[2].slice(2)
              },
              tzOffsetStr1 = getLocalTZOffsetString(),
              tzOffsetStr2 = getLocalTZOffsetString().replace(':', '')
        // format: none
        expect(s1.getRFC()).toBe('Wed Jul 14 2021 08:12:43 GMT+0000 (UTC)')
        expect(s2.getRFC()).toBe(`Wed Jul 14 2021 08:12:43 GMT${tzOffsetStr2} (GMT${tzOffsetStr1})`)
        // format: 2822
        expect(s1.getRFC(2822)).toBe('Wed, 14 Jul 2021 08:12:43 GMT')
        expect(s2.getRFC(2822)).toBe(`Wed, 14 Jul 2021 08:12:43 ${tzOffsetStr2}`)
        // format: 3339
        expect(s1.getRFC(3339)).toBe('2021-07-14T08:12:43+0000')
        expect(s2.getRFC(3339)).toBe(`2021-07-14T08:12:43${tzOffsetStr2}`)
    })

})


# Sunorhc

Sunorhc is a library for handling dates and times for JavaScript. The library wraps a native JavaScript Date object to create its own immutable date and time instance. The instance contains property values of date and time elements and various getters that can be used immediately. It also provides a rich set of instance methods to easily perform date and time calculations and comparisons against a primitive base date and time.

## Reason for Development

I've been working on a jQuery.Timeline plugin, and I'm planning the next version for VanillaJS.
However, the native JavaScript Date object is not easy to use, and I have always been dissatisfied with it as follows.

* Because the primitive value as base Date is mutable, the date and time as the processing base point always fluctuates, making it difficult to check the current date and time value of the object.
* The base datetime is UNIX time, making it difficult to intuitively understand the values to be handled (e.g., before 1970/1/1 00:00:00 or when handling BCE dates and times).
* The specification that rounds off years from 0 to 99 is evil (since there is no setFullYear() like processing in the constructor, there is more trouble when initializing the corresponding date and time).
* It is not possible to compare dates and times or update dates and times flexibly.
* The output format of the date and time cannot be customized.
* The methods for handling local time and UTC are mixed up, making it difficult to understand. Is the internal value of the object UTC or local time? Isn't it better to just use UTC because it's too much trouble already? (I'm tired of thinking about daylight saving time and time zones.

I'm wondering if there is a library that can solve these problems and make date/time data more intuitive and easier to handle.

A library that seems to be good so far is "Luxon" or "Temporal". I particularly like its "Luxon".

However, none of the libraries support the timestamp with the epoch time on the first date and time of the C.E.(Common Era), which is what I want. Therefore, I am planning to evaluate various date libraries first, develop an extension library "Sunorhc" that inherits their good points, and create "Sunorhc.Timeline" based on it.

## Concept

Sunorhc is being developed to handle date and time as a core library for Sunorhc.Timeline (under development as of August 2021), the successor to "jQuery.Timeline". The main objective is to be able to map the first year of the A.D. (January 1, 2012, 0:00:0:0) of the time axis as the original period so that the date and time can be easily handled as a single coordinate on the timeline. In addition, instance methods for adding and subtracting dates and getting periods are implemented "with the shortest possible method names". It is also worth mentioning that it has like `date_format()` formatter in PHP.
Also the setter is intentionally left out of the implementation, since overwriting the primitive value makes it difficult to understand the immutability of the instance itself.
In developing Sunorhc, we took inspiration from various JavaScript date/time libraries such as "Luxon", "DAYJS", and "Temporal", and enthusiastically incorporated specifications and features that we judged to be superior in each library.
In addition, Sunorhc has been short-coded to be able to withstand use as a general-purpose date/time library, emphasizing a balance between generalization of implementation functions and readability. As a result, the final build file size after Minify is 26.2kB (as of version 1.0.2), and the Gzip compressed distribution size is further minimized to 6.96kB.
Sunorhc will be able to be adopted as a front-end date/time library by itself (if you understand and can tolerate that features).

## Installations

### NPM

```bash
npm install sunorhc
```

If you are using Yarn, it will be `yarn add sunorhc`.

### GitHub

```bash
git clone https://github.com/ka215/sunorhc.git
```

The built JS files are stored in the dist directory of the repository.


## Usage

Sunorhc can be used by itself by loading the script file after it is built.

### Node

```js
const Sunorhc = require('sunorhc') 

const NOW_UTC = new Sunorhc()
```

### HTML5

```html
<script src="/path/to/sunorhc.min.js"></script>
<script>
const NOW_UTC = new Sunorhc()
</script>
```

## Supported browsers

The working environment and supported browsers of Sunorhc are as follows.

| Chrome (>= 92) | firefox (>= 91) | Safari (>=13) | Edge (>= 92) | Android | iOS |
|:---:|:---:|:---:|:---:|:---:|:---:|
| &check; | &check; | &check; (&ast;) | &check; | &check; | &check; |

**&ast;** Note: "Intl.Locale" object is not supported by native JavaScript in Safari 13, so a separate [Polyfill](https://formatjs.io/docs/polyfills/intl-locale/) is required for formatter language resolution.

In addition, we have not tested the software on legacy browsers such as IE. We do not plan to provide support for these legacy browsers.

## Examples of use

### Constructor

```js
const NOW_UTC = new Sunorhc()

const DateTime = new Sunorhc(2021, 8, 23, 22, 57, 'local')
console.log(DataTime.toISOString) //=> 2021-08-23T22:57:00.000+09:00

const DT1 = new Sunorhc(123456789000, { firstArgument: "timestamp" }),
      DT2 = new Sunorhc(123456789000, { firstArgument: "ceepoch" })
console.log(
  DT1.toISOString, //=> 1973-11-29T21:33:09.000Z
  DT2.toISOString, //=> 0004-11-29T21:33:09.000Z
)
```

### Getter

```js
const NOW_UTC = new Sunorhc()

console.log(
  NOW_UTC.toISOString, //=> 2021-08-23T14:11:34.249Z
  NOW_UTC.monthLong, //=> August
  NOW_UTC.weekdayLong, //=> Monday
  NOW_UTC.hour, //=> 14
  NOW_UTC.tzOffsetHM, //=> +00:00
  NOW_UTC.era, //=> 8 23, 2021 Anno Domini
)
```

### Instance Methods

```js
const DateTime = new Sunorhc()

console.log(
  DateTime.format('Y-m-d H:i:s'), //=> 2021-08-23 15:21:02
  DateTime.getLDE('weekday', 'long', 'en-US'), //=> Monday
  DateTime.modify(+1, 'month').toISOString, //=> 2021-09-23T15:24:20.070Z
  DateTime.modify(-1, 'day').toString, //=> Sun Aug 22 2021 15:24:20 GMT+0000 (UTC)
  DateTime.interval('2021-10-20', 'day'), //=> 58
  DateTime.getISO('ordinal'), //=> 2021-234
)
```

## Documentation

Sorry, currently writing.

## References & Respect

* [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) - MDN Web Docs
* [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) - MDN Web Docs
* [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) - MDN Web Docs
* [tz database](https://en.wikipedia.org/wiki/Tz_database) - Wikipedia
* [Talend Data Preparation](https://help.talend.com/r/snjvjYAhTLG68D9qu4ModQ/cjWKaXEBhjamPMA~JnTpiA) - talend
* [dmfilipenko/timezones.json](https://github.com/dmfilipenko/timezones.json)
* [Luxon](https://moment.github.io/luxon/)
* [DAYJS](https://day.js.org/en/)
* [Temporal](https://tc39.es/proposal-temporal/docs/index.html)

Great respect and acknowledgement to the developers and the community!

## License

Code released under the MIT License.

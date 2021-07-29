# Sunorhc

## Occasion

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

An instance has CE epoch.

## Memo

* Julian calendar: 1 year = 365.25 days = 8,766 hours = 525,960 minutes = 31,557,600 seconds = 31,557,600,000 ms
* Gregorian calendar: 1 year = 365.2425 days = 8,765.82 hours = 525,949.2 minutes = 31,556,952 seconds = 31,556,952,000 ms

* 2020 year is since CE Epoch (sec): 31,556,952 sec × 2020 year = 63,745,043,040 sec
* 2020 year is since CE Epoch (ms): 31,556,952,000 ms × 2020 year = 63,745,043,040,000 ms

JavaScript Number.MAX_SAFE_INTEGER (= BigInt): 9,007,199,254,740,991
  unit is seconds: 9,007,199,254,740,991 / 31,556,952 = 285,426,781.8622341 therefore, the systemically allowed year: about BCE. or CE.285,426,781
  unit is milliseconds: 9,007,199,254,740,991 / 31,556,952,000 = 285,426.7818622341 therefore, the systemically allowed year: BCE. or CE. 285,426



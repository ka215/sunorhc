## Checking TimeZone List for Windows 

* UTC-12:00 : Dateline Standard Time (IDLW)
* UTC-11:00 : UTC-11
* UTC-10:00 : Hawaiian Standard Time (HST)
* UTC-09:00 : Alaskan Standard Time (AKST)
* UTC-08:00 : Pacific Standard Time (PST)
* UTC-07:00 : Mountain Standard Time (MST)
* UTC-06:00 : Central Standard Time (CST)
* UTC-05:00 : Eastern Standard Time (EST)
* UTC-04:00 : Atlantic Standard Time (AST)
* UTC-03:30 : Newfoundland Standard Time (NT)
* UTC-03:00 : Montevideo Standard Time (UYT)
* UTC-02:00 : UTC-02 (* Brasília time +1)
* UTC-01:00 : Azores Standard Time (AST)
* UTC-01:00 : Cape Verde Standard Time (CVT)
* UTC+00:00 : Greenwich Standard Time (GST)
* UTC+00:00 : UTC
* UTC+00:00 : GMT Standard Time (GMT)
* UTC+01:00 : Central European Standard Time (CET)
* UTC+02:00 : GTB Standard Time (EET)
* UTC+03:00 : E. Africa Standard Time (EAT)
* UTC+03:30 : Iran Standard Time (IRST)
* UTC+04:00 : Astrakhan Standard Time (SAMT)
* UTC+04:30 : Afghanistan Standard Time (AFT)
* UTC+05:00 : Pakistan Standard Time (PKT)
* UTC+05:30 : India Standard Time (IST)
* UTC+05:45 : Nepal Standard Time (NST)
* UTC+06:00 : Central Asia Standard Time (CAST)
* UTC+06:30 : Myanmar Standard Time (MST)
* UTC+07:00 : SE Asia Standard Time (SAST)
* UTC+08:00 : Singapore Standard Time (SGT)
* UTC+09:00 : Tokyo Standard time (JST)
* UTC+10:00 : AUS Eastern Standard Time (AEST)
* UTC+11:00 : Norfolk Standard Time (NFT)
* UTC+12:00 : Fiji Standard Time (FJT)
* UTC+12:45 : Chatham Islands Standard Time (CHAST)
* UTC+13:00 : Samoa Standerd Time (SST)
* UTC+14:00 : Line Islands Standard Time (LINT)

## Example:

```cmd
tzutil /s "Atlantic Standard Time"
```

then,

```cmd
yarn test
```

## Test Results

| TimeZone | Offset | Constructor | Getters | Methods | Total Results | Has DST |
|:-------|:-----:|:--:|:--:|:--:|:--:|:--:|
| IDLW   | -1200 | o | o | o | o | No |
| HST    | -1000 | o | o | o | o | No |
| AKST   | -0900 | o | o | o | o | Yes (-0800) [ 540, 540, 540, 480, 480, 480, 480, 480, 480, 480, 480, 540 ] 4-11: 480 |
| PST    | -0800 | o | o | o | o | Yes (-0700) [ 480, 480, 480, 420, 420, 420, 420, 420, 420, 420, 420, 480 ] 4-11: 420 |
| MST    | -0700 | o | o | o | o | Yes (-0600) [ 420, 420, 420, 360, 360, 360, 360, 360, 360, 360, 360, 420 ] 4-11: 360 |
| CST    | -0600 | o | o | o | o | Yes (-0500) [ 360, 360, 360, 300, 300, 300, 300, 300, 300, 300, 300, 360 ] 4-11: 300 |
| EST    | -0500 | o | o | o | o | Yes (-0400) [ 300, 300, 300, 240, 240, 240, 240, 240, 240, 240, 240, 300 ] 4-11: 240 |
| AST    | -0400 | o | o | o | o | Yes (-0300) [ 240, 240, 240, 180, 180, 180, 180, 180, 180, 180, 180, 240 ] 4-11: 180 |
| NT     | -0330 | o | o | o | o | Yes (-0230) [ 210, 210, 210, 150, 150, 150, 150, 150, 150, 150, 150, 210 ] 4-11: 150 |
| UYT    | -0300 | o | o | o | o | No |
| AST    | -0100 | o | o | o | o | Yes (+0000) [ 60, 60, 60, 0, 0, 0, 0, 0, 0, 0, 60, 60 ] 4-10: 0 |
| CVT    | -0100 | o | o | o | o | No |
| GST    | +0000 | o | o | o | o | No |
| UTC    | +0000 | o | o | o | o | No |
| GMT    | +0000 | o | o | o | o | Yes (+0100) [ 0, 0, 0, -60, -60, -60, -60, -60, -60, -60, 0, 0 ] 4-10: -60 |
| CET    | +0100 | o | o | o | o | Yes (+0200) [ -60, -60, -60, -120, -120, -120, -120, -120, -120, -120, -60, -60 ] 4-10: -120  |
| EET    | +0200 | o | o | o | o | Yes (+0300) [ -120, -120, -120, -180, -180, -180, -180, -180, -180, -180, -120, -120 ] 4-10: -180 |
| EAT    | +0300 | o | o | o | o | No |
| IRST   | +0330 | o | o | o | o | Yes (+0430) [ -210, -210, -210, -270, -270, -270, -270, -270, -270, -210, -210, -210 ] 4-9: -270 |
| SAMT   | +0400 | o | o | o | o | No |
| AFT    | +0430 | o | o | o | o | No |
| PKT    | +0500 | o | o | o | o | No |
| IST    | +0530 | o | o | o | o | No |
| NST    | +0545 | o | o | o | o | No |
| CAST   | +0600 | o | o | o | o | No |
| MST    | +0630 | o | o | o | o | No |
| SAST   | +0700 | o | o | o | o | No |
| SGT    | +0800 | o | o | o | o | No |
| JST    | +0900 | o | o | o | o | No |
| AEST   | +1000 | o | o | o | o | Yes (+1100) [ -660, -660, -660, -660, -600, -600, -600, -600, -600, -600, -660, -660 ] 11-4: -660 |
| NFT    | +1100 | o | o | o | o | Yes (+1200) [ -720, -720, -720, -720, -660, -660, -660, -660, -660, -660, -720, -720 ] 11-4: -720 |
| FJT    | +1200 | o | o | o | o | Yes (+1300) [ -780, -720, -720, -720, -720, -720, -720, -720, -720, -720, -720, -780 ] 12-1: -780 |
| CHAST  | +1245 | o | o | o | o | Yes (+1345) [ -825, -825, -825, -825, -765, -765, -765, -765, -765, -825, -825, -825 ] 10-4: -825 |
| SST    | +1300 | o | o | o | o | Yes (+1400) [ -840, -840, -840, -840, -780, -780, -780, -780, -780, -840, -840, -840 ] 10-4: -840 |
| LINT   | +1400 | o | o | o | o | No |
 
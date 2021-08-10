window.addEventListener('DOMContentLoaded', (event) => {

    const sunorhc  = new Sunorhc(),
          instance = 'si',
          elms = document.getElementsByTagName('title'),
          elm  = document.getElementById('title'),
          entryRow1 = document.querySelector('.entry-row1')
    elms[0].textContent = elms[0].textContent.replace('%version%', sunorhc.version)
    elm.textContent = elm.textContent.replace('[Now Loading...]', sunorhc.version)
    elm.addEventListener('click', evt => {
        window.location.reload(true)
    }, false)
    document.getElementById('instance-name').textContent = instance

    const payloads      = document.getElementById('payloads'),
          instantiate   = document.getElementById('instantiate'),
          clearPayloads = document.getElementById('clear-payloads'),
          formatTest    = document.getElementById('format-test')
    let sunorhcObj   = null,
        dateObj      = null,
        isFormatTest = false
    payloads.placeholder = payloads.placeholder.replace(/now,/, `${sunorhc.year}, ${sunorhc.month}, ${sunorhc.day}, ${sunorhc.hour}, ${sunorhc.minute}, ${sunorhc.second}, ${sunorhc.millisecond},`)

    const watchNodes = document.querySelectorAll('.chips')
    const callback = (muts, observer) => {
        muts.forEach(_m => {
            if (_m.attributeName === 'class' && !_m.target.classList.contains('unknown-text')) {
                _m.target.closest('.chips').addEventListener('click', evt => {
                    const _child = _m.target,
                          _prop  = /locale$/i.test(_child.id) ? 'locale' : 'timezone',
                          _value = _child.textContent.replace(' min', ''),
                          _payloads = payloads.value.replace(/\r?\n/g, '').trim()
                    let _obj = {}
                    if (_payloads !== '') {
                        if (/\{.*?\}/.test(_payloads)) {
                            let _curArgs = _payloads.match(/\{(.*)?\}/g)
                            _obj = Function(`"use strict";return (${_curArgs[0]})`)()
                            _obj[_prop] = _prop === 'locale' ? _value : 'local'
                            payloads.value = _payloads.replace(_curArgs[0], JSON.stringify(_obj))
                        } else {
                            _obj[_prop] = _prop === 'locale' ? _value : 'local'
                            payloads.value += `, ${JSON.stringify(_obj)}`
                        }
                    } else {
                        _obj[_prop] = _prop === 'locale' ? _value : 'local'
                        payloads.value = JSON.stringify(_obj)
                    }
                    /*
                    if (payloads.value !== '') {
                        instantiate.removeAttribute('disabled')
                    }
                    */
                }, false)
            }
        })
    }
    const observer = new MutationObserver(callback)

    Array.prototype.forEach.call(watchNodes, node => {
        observer.observe(node, {attributes: true, childList: true, subtree: true})
    })

    const nowDate = new Date(),
          env = {
            locale: (window.navigator.languages && window.navigator.languages[0]) 
                || window.navigator.language
                || window.navigator.userLanguage
                || window.navigator.browserLanguage,
            tzoffset: `${nowDate.getTimezoneOffset()} min`
          },
          envElm1 = document.getElementById('doc-locale'),
          envElm2 = document.getElementById('tz-offset')
    envElm1.textContent = env.locale
    envElm2.textContent = env.tzoffset
    envElm1.classList.remove('unknown-text')
    envElm2.classList.remove('unknown-text')

    payloads.addEventListener('input', evt => {
        if (evt.target.value !== '') {
            instantiate.removeAttribute('disabled')
        } else {
            //instantiate.setAttribute('disabled', true)
        }
    }, false)

    formatTest.addEventListener('change', evt => {
        isFormatTest = evt.target.checked
    }, false)

    instantiate.addEventListener('click', evt => {
        const args = payloads.value === '0' ? [0] : parsePayloads(payloads.value.replace(/\r?\n/g, ''))
        if (!args) {
            // Error
            alert('Invalid payload as the argument for constructor.')
        } else {
            createInstance(...args)
            let _sc  = [],
                _dc  = [],
                _tmp = null,
                _idt = '<span class="spacer"></span>'
            _sc.push(`${instance}.timezone: "${sunorhcObj.timezone}"`)
            _sc.push(`${instance}.toString: ${sunorhcObj.toString}`)
            _sc.push(`${instance}.toISOString: ${sunorhcObj.toISOString}`)
            if (!isFormatTest) {
                _sc.push(`${instance}.getUTC().toISOString(): ${sunorhcObj.getUTC().toISOString()}`)
            }
            _tmp = JSON.stringify(sunorhcObj.instant, null, "<br>\t").replace(/\t\"/g, _idt).replaceAll(/\":/g, ': ').replace(/}$/, "<br>}")
            _sc.push(`${instance}.instant: ${_tmp}`)
            if (!isFormatTest) {
                _tmp = JSON.stringify(sunorhcObj.config, null, "\t").replace(/}$/, "<br>}")
                let _lines  = _tmp.split("\t")
                _tmp = _lines.reduce((acc, cur) => {
                    if (cur === '') {
                        acc += `${_idt}`
                    } else if (/^{$/.test(cur.trim())) {
                        acc += `${cur.trim()}<br>`
                    } else if (/}$/.test(cur.trim())) {
                        acc += `${_idt}${cur}<br>`
                    } else {
                        let _elm = cur.replace(/^\"/, '').replace(/\":/, ':')
                        acc += `${_idt}${_elm}<br>`
                    }
                    return acc
                }, '')
                _sc.push(`${instance}.config: ${_tmp.replace(/<br>$/, '')}`)
            }
            _sc.push(`${instance}.format('Y-m-d H:i:s'): ${sunorhcObj.format('Y-m-d H:i:s')}`)
            _sc.push(`${instance}.format('l, F j, f g:i a', {'/(0|1)$/ig': flg => ['AM', 'PM'][flg]}): ${sunorhcObj.format('l, F j, f g:i a', {'/(0|1)$/ig': flg => ['AM', 'PM'][flg]})}`)
            if (isFormatTest) {
                const matchers = 'YyfLFmMntWdjzlDNwagGhHIiSsVveZcrUuBb'
                let test = matchers.split('').map(str => {
                    return `${instance}.format('${str}'): ${sunorhcObj.format(str)}`
                })
                _sc.push(...test)
            }
            document.getElementById('sunorhc-obj').innerHTML = _sc.join('<br>')
            //_tmp = sunorhcObj.config.dateArgs
            _tmp = sunorhcObj
            if (_tmp.timezone === 'UTC') {
                _dc.push(`var cfDate = new Date(Date.UTC(${_tmp.year}, ${_tmp.month - 1}, ${_tmp.day}, ${_tmp.hour}, ${_tmp.minute}, ${_tmp.second}, ${_tmp.millisecond}));`)
            } else {
                _dc.push(`var cfDate = new Date(${_tmp.year}, ${_tmp.month - 1}, ${_tmp.day}, ${_tmp.hour}, ${_tmp.minute}, ${_tmp.second}, ${_tmp.millisecond});`)
            }
            _dc.push(`cfDate.toString(): ${dateObj.toString()}`)
            _dc.push(`cfDate.toISOString(): ${dateObj.toISOString()}`)
            _dc.push(`cfDate.getTimezoneOffset(): ${dateObj.getTimezoneOffset()}`)
            _dc.push(`cfDate.getTime(): ${dateObj.getTime()}`)
            document.getElementById('date-obj').innerHTML = _dc.join('<br>')
            //console.log(sunorhcObj, dateObj)
        }
        document.getElementsByTagName('footer')[0].classList.remove('pos-abs')
    }, false)

    clearPayloads.addEventListener('click', evt => {
        //instantiate.setAttribute('disabled', true)
    }, false)

    function parsePayloads(value) {
        if (!value) {
            return []
        }
        let payloads = null,
            _inObj   = value.match(/{(.*)?}/g),
            _cfg     = null,
            _values  = null,
            _tmp     = null
        if (_inObj && _inObj.length > 0) {
            // Parse the string to an object
            _tmp = _inObj[0].replaceAll(/\s*(\{|\})\s*/g, '$1').replaceAll(/\'/g, '"')
            _cfg = Function(`"use strict";return (${_tmp})`)()
            if (typeof _cfg !== 'object') {
                _cfg = null
            }
            value = value.replace(_inObj[0], '')
        }
        _values = value.trim().split(',')
        payloads = _values.map(v => {
            v = v.trim()
            switch (true) {
                case /^(-|\+)?\d{1,}$/.test(v):
                    return parseInt(v, 10)
                case /^(true|false)$/i.test(v):
                    return /^true$/i.test(v) ? true : false
                default:
                    return v !== '' ? v.toString(): false
            }
        }).filter(v => typeof v !== 'undefined')
        if (_cfg) {
            payloads.push(_cfg)
        }
        //console.log('fe:', value, _inObj, _cfg, _values, payloads)
        return payloads
    }

    function createInstance(...args) {
        sunorhcObj = new Sunorhc(...args)
        //let _s = sunorhcObj.config.dateArgs || null
        let _s = sunorhcObj || null
        if (_s) {
            if (_s.timezone === 'UTC') {
                dateObj = new Date(Date.UTC(_s.year, (_s.month - 1), _s.day, _s.hour, _s.minute, _s.second, _s.millisecond))
            } else {
                dateObj = new Date(_s.year, (_s.month - 1), _s.day, _s.hour, _s.minute, _s.second, _s.millisecond)
            }
        }
    }

    //console.log(new Sunorhc(0, 'local'))

}, false)

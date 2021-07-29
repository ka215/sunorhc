window.addEventListener('DOMContentLoaded', (event) => {

    const sunorhc = new Sunorhc(),
          elms = document.getElementsByTagName('title'),
          elm  = document.getElementById('title')
    elms[0].textContent = elms[0].textContent.replace('%version%', sunorhc.version)
    elm.textContent = elm.textContent.replace('[Now Loading...]', sunorhc.version)
    elm.addEventListener('click', evt => {
        window.location.reload(true)
    }, false)

    const payloads = document.getElementById('payloads'),
          instantiate = document.getElementById('instantiate'),
          clearPayloads = document.getElementById('clear-payloads')
    let sunorhcObj = null,
        dateObj = null
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
                    if (payloads.value !== '') {
                        instantiate.removeAttribute('disabled')
                    }
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
            instantiate.setAttribute('disabled', true)
        }
    }, false)

    instantiate.addEventListener('click', evt => {
        const args = parsePayloads(payloads.value.replace(/\r?\n/g, ''))
        if (!args) {
            // Error
            alert('Invalid payload as the argument for constructor.')
        } else {
            createInstance(...args)
            let _sc  = [],
                _dc  = [],
                _tmp = null,
                _idt = '<span class="spacer"></span>'
            _sc.push(`instance.tz: "${sunorhcObj.tz}"`)
            _sc.push(`instance.toDate: ${sunorhcObj.toDate.toString()}`)
            _sc.push(`instance.toISOString: ${sunorhcObj.toISOString}`)
            _tmp = JSON.stringify(sunorhcObj.instant, null, "<br>\t").replace(/\t\"/g, _idt).replaceAll(/\":/g, ': ').replace(/}$/, "<br>}")
            _sc.push(`instance.instant: ${_tmp}`)
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
            _sc.push(`instance.config: ${_tmp.replace(/<br>$/, '')}`)
            _sc.push(`instance.format('Y-m-d H:i:s'): ${sunorhcObj.format('Y-m-d H:i:s')}`)
            document.getElementById('sunorhc-obj').innerHTML = _sc.join('<br>')
            _tmp = sunorhcObj.config.dateArgs
            _dc.push(`var cfDate = new Date(${_tmp.year}, ${_tmp.month}, ${_tmp.day}, ${_tmp.hour}, ${_tmp.minute}, ${_tmp.second}, ${_tmp.millisecond});`)
            _dc.push(`cfDate.toString(): ${dateObj.toString()}`)
            _dc.push(`cfDate.toISOString(): ${dateObj.toISOString()}`)
            _dc.push(`cfDate.getTimezoneOffset(): ${dateObj.getTimezoneOffset()}`)
            document.getElementById('date-obj').innerHTML = _dc.join('<br>')
            //console.log(sunorhcObj, dateObj)
        }
        document.getElementsByTagName('footer')[0].classList.remove('pos-abs')
    }, false)

    clearPayloads.addEventListener('click', evt => {
        instantiate.setAttribute('disabled', true)
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
            _tmp = _inObj[0].replaceAll(/\'/ig, '"')
            _cfg = Function(`"use strict";return (${_tmp})`)()
            if (typeof _cfg !== 'object') {
                _cfg = null
            }
            _inObj.forEach(v => {
                value = value.replace(v, '')
            })
        }
        _values = value.split(',')
        payloads = _values.map(v => {
            v = v.trim()
            let _obj
            switch (true) {
                case /^\d{1,}$/.test(v):
                    return parseInt(v, 10)
                case /^(true|false)$/i.test(v):
                    return /^true$/i.test(v) ? true : false
                default:
                    if (v !== '') {
                        return String(v)
                    } else {
                        return false
                    }
            }
        })
        if (!payloads || !payloads[0]) {
            payloads[0] = 'null'
        }
        if (_cfg) {
            payloads.push(_cfg)
        }
        return payloads
    }

    function createInstance(...args) {
        sunorhcObj = new Sunorhc(...args)
        let _d = sunorhcObj.config.dateArgs || null
        if (_d) {
            dateObj = new Date(_d.year, _d.month, _d.day, _d.hour, _d.minute, _d.second, _d.millisecond)
        }
    }

}, false)

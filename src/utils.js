const strInsert = (str, idx, val) => {
    return str.slice(0, idx) + val + str.slice(idx)
}

const strRemove = (str, idx, len=1) => {
    return str.slice(0, idx) + str.slice(idx + len)
}

const isObject = (one) => {
    return !!(one) && typeof one === 'object' && !Array.isArray(one)
}

const hasKey = (obj, key) => {
    return !!(obj) && Object.prototype.hasOwnProperty.call(obj, key)
}

const cloneObject = (obj) => {
    return JSON.parse(JSON.stringify(obj))
}

const deepMerge = (target, source, opts) => {
    const isConcatArray = opts && opts.concatArray
    let result = Object.assign({}, target)
    if (isObject(target) && isObject(source)) {
        for (const [srcKey, srcVal] of Object.entries(source)) {
            const targetVal = target[srcKey]
            if (isConcatArray && Array.isArray(srcVal) && Array.isArray(targetVal)) {
                result[srcKey] = targetVal.concat(...srcVal)
            } else
            if (isObject(srcVal) && hasKey(target, srcKey)) {
                result[srcKey] = deepMerge(targetVal, srcVal, opts)
            } else {
                Object.assign(result, {[srcKey]: srcVal})
            }
        }
    }
    return cloneObject(result)
}

const mergeOptions = (defaults, settings) => {
    let finalOpts = deepMerge({}, defaults)
    if (isObject(defaults) && isObject(settings)) {
        for (const [setKey, setVal] of Object.entries(settings)) {
            const allowKeys = Object.keys(defaults).concat('dateArgs', 'offset', 'tzName')
            if (allowKeys.includes(setKey)) {
                const defVal = finalOpts[setKey],
                      vType = (typeof setVal)
                switch (setKey) {
                    case 'timezone':
                        if (vType === 'string') {
                            finalOpts[setKey] = /^(UTC)$/i.test(setVal) ? 'UTC' : 'local'
                            if (!/^(UTC|local)$/i.test(setVal)) {
                                finalOpts.tzName = setVal
                            }
                        }
                        break
                    case 'firstArgument':
                        if (vType === 'string' && /^(ce(|epoch)|timestamp|unix|year)$/i.test(setVal)) {
                            finalOpts[setKey] = setVal.toLowerCase()
                        }
                        break
                    case 'locale':
                        if (vType === 'string') {
                            let _locale = new Intl.Locale(setVal)
                            finalOpts[setKey] = _locale.baseName
                        }
                        break
                    case 'epochUnit':
                        if (vType === 'string' && /^(sec|seconds?|ms|milliseconds?)$/i.test(setVal)) {
                            finalOpts[setKey] = setVal.toLowerCase()
                        }
                        break
                    case 'localeFormats':
                        if (isObject(setVal)) {
                            const defKeys = Object.keys(defVal)
                            for (const [lfKey, lfVal] of Object.entries(setVal)) {
                                if (defKeys.includes(lfKey)) {
                                    if (isObject(lfVal)) {
                                        finalOpts.localeFormats[lfKey] = deepMerge(defVal[lfKey], lfVal)
                                    } else if (typeof lfVal === 'string' && lfKey !== 'common') {
                                        finalOpts.localeFormats[lfKey] = {[lfKey]: lfVal}
                                    }
                                }
                            }
                        }
                        break
                    case 'verbose':
                        if (vType === 'boolean') {
                            finalOpts[setKey] = setVal
                        }
                        break
                    default:
                        // Cannot be overwritten
                        break
                }
            }
        }
    }
    return finalOpts
}

export default {
    strInsert,
    strRemove,
    isObject,
    hasKey,
    cloneObject,
    deepMerge,
    mergeOptions,
}
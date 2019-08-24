import { domain, subdomains, getMainDecision } from '../domain/domain.js'
import { types } from '../types.js'
import { getContextValue } from './value.js'
import { persist } from '../persist.js'

export const userVals = {}

const persistPrefix = 'val_'

export const importUserVals = (data) => {
  for (const dataKey in data) {
    if (dataKey.startsWith(persistPrefix)) {
      const key = dataKey.slice(persistPrefix.length)
      userVals[key] = data[dataKey]
    }
  }
}

export const setUserVal = (key, val) => {
  userVals[key] = val
  persist(persistPrefix + key, val)
}

export const setTpeUserVal = (key, option, estimate, value) => {
  userVals[key] = userVals[key] || types.tpe.getDefault(domain[key])
  userVals[key][option][estimate] = value
  persist(persistPrefix + key, userVals[key])
}

export const calcSubs = (context, subs) => {
  for (const sub of subs) {
    const { factors } = subdomains[sub]
    for (const key in factors) {
      const { calc } = factors[key]
      if (calc) {
        context[key] = calc(context)
      }
    }
  }
  return getContextValue(context, subs)
}

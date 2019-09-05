import { Progress, Results, Next } from '../components/decision.js'
import { userVals, hasChoiceMissing } from '../calc/calc.js'
import { userValues, hasMissingValues } from '../calc/value.js'
import { domain, getMainDecision } from '../domain/domain.js'
import { navigate } from '../app.js'
import { persist } from '../persist.js'

const getValsTotalCount = () => {
  let count = 0
  for (const key in domain) {
    const { choice, decidedBy } = domain[key]
    if (choice && !decidedBy) count++
  }
  return count
}

const getValuesTotalCount = () => {
  let count = 0
  for (const agent in userValues) {
    count += Object.keys(userValues[agent]).length
  }
  return count
}
const totalCount = getValsTotalCount() + getValuesTotalCount()

const getCount = () => {
  const valCount = Object.keys(userVals).length
  let valueCount = 0
  for (const agent in userValues) {
    for (const valueKey in userValues[agent]) {
      if (userValues[agent][valueKey].touched) {
        valueCount++
      }
    }
  }
  return valCount + valueCount
}

export const startedEvauation = () => {
  if (Object.keys(userVals).length > 0) {
    return true
  }
  for (const agent in userValues) {
    for (const valueKey in userValues[agent]) {
      if (userValues[agent][valueKey].touched) {
        return true
      }
    }
  }
  return false
}

let lastKey
const getMissingPath = () => {
  let skip = !!lastKey
  for (const key in domain) {
    skip = skip && (key != lastKey)
    if (skip) continue   //Skip touched keys to avoid re-computation
    const { mergeInto, valuedBy } = domain[key]
    if (mergeInto) continue
    if (hasChoiceMissing(key)) {
      lastKey = key
      return '/factor/' + key
    }
    if (valuedBy) {
      const {missing, agent} = hasMissingValues(key)
      if (missing) {
        lastKey = key
        return `/value/${key}/${agent}`
      }
    }
  }
}

export const getDecisionToolbar = () => {
  const progress = Progress(getCount(), totalCount)
  const nextPath = getMissingPath()
  let goNext, path
  if (nextPath && (nextPath !== window.location.pathname)) {
    goNext = (event) => navigate(nextPath, event)
    path = nextPath
  }
  const next = Next(goNext, path)
  return [progress, next]
}

let complete = false

export const importStatus = (data) => complete = !!data.complete

export const getDecision = () => {
  const count = getCount()
  if (!complete) {
    complete = count === totalCount
    if (complete) {
      persist('complete', complete)
    }
  }
  const completion = { complete, count, totalCount }
  const decision = (complete) ? getMainDecision(userVals) : null
  return { content: Results({completion, decision}), title: 'Decision' }
}

import { round2tenth, camel2space, bn } from './util.js'

const valuePercent = 10

export const types = {
  boolean: {
    getDefault: () => false,
    getText: val => (val) ? 'YES' : 'NO',
    getValueObjs: ({key, title}) => ({[key]: {title}}),
    getValue: (val, value) => (val) ? value : 0,
  },
  option: {
    getDefault: () => null,
    getText: val => camel2space(val),
    getValueObjs: ({key, title, options}) => {
      const valueObjs = {}
      for (const option in options) {
        valueObjs[key + '_' + option] = {
          factor: key,
          option,
          title: title + ': ' + options[option],
        }
      }
      return valueObjs
    },
    getValue: (val, value, {option}) => (val === option) ? value : 0,
  },
  gbp: {
    getDefault: () => 0,
    getText: val => '£' + round2tenth(val / bn) + ' bn',
  },
  unitInterval: {
    getDefault: () => 0.5,
    getText: val => round2tenth(val * 100) + '%',
    min: 0,
    max: 1,
    step: 0.005,
    getValueObjs: ({key, title}) => ({[key]: {
      percent: valuePercent,
      title: `${title} (+${valuePercent}%)`,
    }}),
    getValue: (val, value, {percent}) => val * value / percent * 100,
  },
  until2030interval: {
    getDefault: () => 0.5,
    getText: val => round2tenth(val * 10) + ' yr',
    min: 0,
    max: 1,
    step: 0.01,
    getValueObjs: ({key, title}) => ({[key]: {
      percent: valuePercent,
      title: `${title} (+${valuePercent/10} year)`,
    }}),
    getValue: (val, value, {percent}) => val * value / percent * 100,
  },
  minusUnitInterval: {
    getDefault: () => -0.5,
    getText: val => round2tenth(val * 100) + '%',
    min: -1,
    max: 0,
    step: 0.005,
    getValueObjs: ({key, title}) => ({[key]: {
      percent: valuePercent,
      title: `${title} (+${valuePercent}%)`,
    }}),
    getValue: (val, value, {percent}) => val * value / percent * 100,
  },
  mirrorUnitInterval: {
    getDefault: () => 0,
    getText: val => ((val >= 0) ? '+' : '') + Math.round(val * 100) + '%',
    min: -1,
    max: 1,
    step: 0.01,
    getValueObjs: ({key, title}) => ({[key]: {
      percent: valuePercent,
      title: `${title} (+${valuePercent}%)`,
    }}),
    getValue: (val, value, {percent}) => val * value / percent * 100,
  },
  value: {
    getText: val => val,
    min: -100,
    max: 100,
    step: 0.5,
  },
  ratio: {
    getDefault: () => 1,
    getText: val => val,
    min: 0,
    max: 2,
    step: 0.01,
  },
}

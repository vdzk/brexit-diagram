import { getNegotiationDistribution } from '../calc/negotiation.js'
import { getAgentValue } from '../calc/value.js'
import { clone } from '../util.js'

const factors = {
  irishBorder: {
    type: 'option',
    title: 'Irish borders',
    desc: 'If UK leaves the EU, Irish border arrangements will need to be negotiated.',
    options: {
      hardBorder: 'Hard border',
      brokenBorder: 'EU-UK border broken in Ireland',
      seaBorder: 'Irish Sea border',
      unitedIreland: 'United Irland in the EU',
      openBorder: 'Open Irish border in the EU',
    },
    choice: true,
    calc: c => {
      if (c.ukInEu) {
        return 'openBorder'
      } else if (c.irishBorder === 'openBorder') {
        return 'brokenBorder'
      } else {
        return c.irishBorder
      }
    },
    valuedBy: ['NI', 'UK', 'EU'],
    decidedBy: ['NI', 'UK', 'EU'],
  },
  violenceNiByOption: {
    type: 'tpe',
    optionsFrom: 'irishBorder',
    mergeInto: 'violenceNi',
    choice: true,
  },
  violenceNi: {
    type: 'unitInterval',
    title: 'Violence in Northern Ireland',
    desc: "Please make an optimisic, pessimistic and most likely estimates of violence on a scale from 0% (no violence) to 100% (war) under each of the following border arrangements.",
    calc: c => tpeExpected(c.violenceNiByOption[c.irishBorder]),
    valuedBy: ['NI', 'UK', 'EU'],
  },
  brokenDeal: {
    type: 'boolean',
    title: 'Irish border Brexit deal is broken',
    calc: c => (c.brexitApproval === 'deal') && (c.irishBorder === 'hardBorder'),
    valuedBy: ['NI', 'UK', 'EU'],
  },
}

const diagram = `
  -      brexitApproval brokenDeal   $brokenDeal
  ukInEu irishBorder    violenceNi   $violenceNi
  -      -              $irishBorder -
`

//Note: due to complexity of generalization are calculated explicitly without reuse of 'calc' functions.
const agents = factors.irishBorder.decidedBy
const options = Object.keys(factors.irishBorder.options).filter(opt => opt !== 'openBorder')

const getValue = (vals) => {
  const { ukInEu, brexitApproval, violenceNiByOption } = vals
  let subValue = 0
  let subNodeValues = {}
  if (ukInEu) {
    const option = 'openBorder'
    subNodeValues = {
      violenceNi: getAgentValue('violenceNi', tpeExpected(violenceNiByOption[option]), 'UK'),
      irishBorder: getAgentValue('irishBorder', option, 'UK'),
    }
    subValue = subNodeValues.violenceNi + subNodeValues.irishBorder
  } else {
    const { agentValues, negotiationValues } = getBorderValues(vals)
    const borderDist = getNegotiationDistribution(options, negotiationValues)
    for (const option of options) {
      for (const key in agentValues['UK'][option]) {
        const value = agentValues['UK'][option][key] * borderDist[option]
        subNodeValues[key] = (subNodeValues[key] || 0) + value
        subValue += value
      }
    }
  }
  return { subValue, subNodeValues }
}

const getBorderValues = (vals) => {
  const { brexitApproval, violenceNiByOption } = vals
  let agentValues = {}
  let negotiationValues = { }
  for (const agent of agents) {
    agentValues[agent] = {}
    negotiationValues[agent] = {}
    for (const option of options) {
      const brokenDeal = (brexitApproval === 'deal') && (option === 'hardBorder')
      agentValues[agent][option] = {
        brokenDeal: getAgentValue('brokenDeal', brokenDeal, agent),
        violenceNi: getAgentValue('violenceNi', tpeExpected(violenceNiByOption[option]), agent),
        irishBorder: getAgentValue('irishBorder', option, agent),
      }
      negotiationValues[agent][option] = Object.values(agentValues[agent][option])
        .reduce((a, b) => a + b, 0)
    }
  }
  return { agentValues, negotiationValues }
}

const tpeExpected = ({pessimistic, mostLikely, optimistic}) =>
  (pessimistic + 4 * mostLikely + optimistic) / 6

export const ireland = { factors, diagram, getValue }
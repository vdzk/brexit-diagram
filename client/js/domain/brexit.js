import { clone } from '../util.js'
import { calcSubs } from '../calc/calc.js'
import { getAgentValue } from '../calc/value.js'
import { getNegotiationDistribution } from '../calc/negotiation.js'
import { outLink } from '../util.js'


//Starting Brexit event + miscaleneous factors
const factors = {
  brexitApproval: {
    type: 'option',
    title: 'Brexit decision',
    desc: `
      The United Kingdom decides which Brexit option to take.
      <ul>
        <li><strong>Remain</strong> - cancel Brexit and stay in the EU</li>
        <li><strong>Deal</strong> - leave with the deal currently offered by the EU</li>
        <li><strong>No-deal</strong> - leave the EU without a deal</li>
      </ul>
    `,
    calcDesc: "Each of the options will be tried. The option resulting in the highest expected value for the United Kingdom will be chosen.",
    options: {
      remain: 'Remain',
      deal: 'Deal',
      noDeal: 'No-deal',
    },
    decidedBy: ['UK'],
    blockedExtArrow: true,
  },
  noDealDisruptions: {
    type: 'boolean',
    title: 'Short term disruptions',
    desc: 'Short term disruptions (UK border, supplies etc.) caused by Brexit',
    calcDesc: 'The disruptions will be present in case of a <a href="/factor/brexitApproval">no-deal Brexit</a> with no transition period.',
    valuedBy: ['UK'],
    //https://www.bbc.co.uk/news/uk-politics-47652280
    valueArguments: {UK: {
      lower: [
        `The issue of what would happen to drinking water has been raised because some chemicals needed in the purification process, which can’t be stored for very long, could be held up at the border in the event of no deal. Secretary of State for Environment, Food and Rural Affairs, Michael Gove, told parliament that the water industry is “reliant on chemicals that are imported from the EU” but that the government was taking steps to mitigate the risk of a “reasonable worst-case scenario”.<br>${outLink('What would happen to medical supplies and drinking water if we left with no deal?', "https://fullfact.org/europe/what-would-happen-medical-supplies-and-drinking-water-if-we-left-no-deal/")}`,
        `The government has provided no comprehensive update on how far it has got on preparing for no deal. A government paper published in February 2019 said it was “on track for just over two-thirds of the most critical projects.” However, the report did not explain what those critical projects are, which ones are not on track, or what the government is doing to get them back on track.<br>${outLink('No deal Brexit preparations', "https://www.instituteforgovernment.org.uk/explainers/no-deal-brexit-preparations")}`,
      ],
      higher: [
        `Preparations for a no deal exit have been taking place since the referendum in 2016. The government ramped up its preparations in summer 2018, when it started publishing a series of ‘technical notices’ on how public bodies, businesses and individuals needed to prepare for no deal.<br>${outLink('No deal Brexit preparations', "https://www.instituteforgovernment.org.uk/explainers/no-deal-brexit-preparations")}`,
      ],
    }},
    calc: c => c.brexitApproval === 'noDeal'
  },
  marketMovement: {
    type: 'option',
    title: 'EU negotiation',
    desc: `
      Negotiations about UK's membership in:
      <ul>
        <li>EU's single market,</li>
        <li>EU's freedom of movement area.</li>
      </ul>
    `,
    calcDesc: `In case of the <a href="/factor/brexitApproval">remain Brexit decision</a> both memberships continue to be active. Otherwise, all four combinations of membership statuses are considered. Each of the four options is evaluated and ranked by each of the agents (EU, UK) separately. A negotiation algorithm determines probabilities of each of the outcomes according to the rankings. These probabilities are then used when calculating total expected value of this negotiation.`,
    options: {
      marketAndMovement: 'Single market and freedom of movement',
      onlyMarket: 'Only single market',
      onlyMovement: 'Only freedom of movement',
      noMarketNoMovement: 'No single market and no freedom of movement',
    },
    customCalc: true,
    calc: c => (c.brexitApproval === 'remain') ? 'marketAndMovement' : c.marketMovement,
    decidedBy: ['UK', 'EU'],
  },
  singleMarket: {
    type: 'boolean',
    title: 'Single market',
    desc: "The UK is in the single market with the EU.",
    calcDesc: `This is determined by the outcome of the <a href="/factor/marketMovement">EU negotiation</a>.`,
    customCalc: true,
    calc: c => ['marketAndMovement', 'onlyMarket'].includes(c.marketMovement),
  },
  freedomOfMovement: {
    type: 'boolean',
    title: 'Freedom of movement',
    desc: "There is freedom of movement between the UK and the EU.",
    calcDesc: `This is determined by the outcome of the <a href="/factor/marketMovement">EU negotiation</a>.`,
    customCalc: true,
    calc: c => ['marketAndMovement', 'onlyMovement'].includes(c.marketMovement),
  },
  transitionPeriod: {
    type: 'until2030interval',
    title: 'Transition period',
    question: 'How long do you expect the transition period to last if the Brexit deal is legislated?',
    choice: true,
    sliderLabel: 'Transition period duration',
    minLabel: '2020',
    maxLabel: '2030 (time horizon)',
    arguments: {
      lower: [
        `As with the agreement Theresa May’s government put forward, the end date for the transition period is set at the 31 December 2020.<br>${outLink("Boris Johnson's new Brexit deal: four key questions answered",  'https://fullfact.org/europe/boris-johnsons-new-brexit-deal-four-key-questions-answered/')}`,
      ],
      higher: [
        `The UK can apply to extend the transition period by one or two years.<br>${outLink('The Brexit timeline', 'https://fullfact.org/europe/brexit-timeline/')}`,
      ],
    },
  },
  ukInEu: {
    type: 'boolean',
    title: "EU membership",
    desc: "Membership of the United Kindom in the European Union.",
    calcDesc: `In case of the remain <a href="/factor/brexitApproval">decision</a> the EU membership will continue. In case of a no-deal Brexit it will stop straight away. In case of the deal the membership will continue until the <a href="/factor/transitionPeriod">transition period & backstop</a> run out.`,
    customCalc: true,
    calc: c => (c.brexitApproval === 'remain')
      || ((c.brexitApproval === 'deal') && (Math.random() < c.transitionPeriod)),
  },
}

const diagram = `
  brexitApproval   -               noDealDisruptions $noDealDisruptions
  -                marketMovement  singleMarket
  -                -               freedomOfMovement
  transitionPeriod -               ukInEu
`

const getDecision = (vals, subdomains) => {
  const alternatives = {}
  const options = Object.keys(factors.brexitApproval.options)
  for (const option of options) {
    const context = clone(vals)
    context.brexitApproval = option
    context.ukInEu = (option === 'remain')
    let totalValue = 0
    const nodeValues = {}
    const valueGetters = [
      subdomains.scotland.getValue,
      subdomains.ireland.getValue,
      subdomains.influence.getGibraltarValue,
      getNegotiationValue,
    ]
    for (const getValue of valueGetters) {
      const { subValue, subNodeValues } = getValue(context, subdomains)
      totalValue += subValue
      Object.assign(nodeValues, subNodeValues)
    }
    const subs = ['brexit', 'influence', 'government']
    const { totalValues, subNodeValues } = calcSubs(context, subs)
    totalValue += totalValues.UK
    Object.assign(nodeValues, subNodeValues.UK)
    const label = factors.brexitApproval.options[option]
    alternatives[option] = { totalValue, nodeValues, label  }
  }


  //Apply transition between "remain" and "deal" states
  const {deal, remain} = alternatives
  const trp = vals.transitionPeriod
  for (const k in deal.nodeValues) {
    deal.nodeValues[k] = remain.nodeValues[k] * trp + deal.nodeValues[k] * (1 - trp)
  }
  deal.totalValue = remain.totalValue * trp + deal.totalValue * (1 - trp)

  let bestOption
  let maxTotalValue = -Infinity
  for (const option of options) {
    const { totalValue } = alternatives[option]
    if (totalValue > maxTotalValue) {
      maxTotalValue = totalValue
      bestOption = option
    }
  }
  return ({
    bestOption,
    maxTotalValue,
    alternatives,
  })
}

const getNegotiationValue = (vals, subdomains) => {
  const options = Object.keys(factors.marketMovement.options)
  if (vals.ukInEu) {
    const option = 'marketAndMovement'
    const { UK, nodeValues } = getNegotiationOptionValues(option, vals, subdomains)
    return { subValue: UK, subNodeValues: nodeValues }
  } else {
    const agentValues = { UK: {}, EU: {} }
    const optionValues = {}
    for (const option of options) {
      const { UK, EU, nodeValues } = getNegotiationOptionValues(option, vals, subdomains)
      agentValues.UK[option] = UK
      agentValues.EU[option] = EU
      optionValues[option] = nodeValues
    }
    const dist = getNegotiationDistribution(options, agentValues)
    let subValue = 0
    const subNodeValues = {}
    for (const option of options) {
      subValue += agentValues['UK'][option] * dist[option]
      for (const key in optionValues[option]) {
        subNodeValues[key] = (subNodeValues[key] || 0)
          + optionValues[option][key] * dist[option]
      }
    }
    return { subValue, subNodeValues }
  }
}

const getNegotiationOptionValues = (option, vals, subdomains) => {
  vals.marketMovement = option
  let bestBI
  let maxUK = -Infinity
  let maxUKEU
  let maxNodeValues
  for (const billIntention of [false, true]) {
    //Filter out disabled bill/brexit combinations
    if ((vals.brexitApproval === 'remain') && billIntention) continue
    const context = clone(vals)
    context.marketMovement = option
    context.singleMarket = ['marketAndMovement', 'onlyMarket'].includes(option)
    context.freedomOfMovement = ['marketAndMovement', 'onlyMovement'].includes(option)
    context.billIntention = billIntention
    const subs = ['trade', 'immigration', 'budget', 'gdp', 'nhs']
    const {totalValues, subNodeValues} = calcSubs(context, subs)
    const {UK, EU} = totalValues
    if (UK > maxUK) {
      maxUK = UK
      maxUKEU = EU
      bestBI = billIntention
      maxNodeValues = subNodeValues.UK
    }
  }
  return { UK: maxUK, EU: maxUKEU, nodeValues: maxNodeValues }
}

const decisionOptionLabels = factors.brexitApproval.options

export const brexit = { factors, diagram, getDecision, decisionOptionLabels }

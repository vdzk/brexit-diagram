import { domain, subdomains } from '../domain/domain.js'
import { Diagram, DiagramInfo } from '../components/diagram.js'
import { Tabs, Info } from '../components/global.js'
import { userVals, hasChoiceMissing } from '../calc/calc.js'
import { hasMissingValues } from '../calc/value.js'
import { updateView, navigate } from '../app.js'
import { getImportance } from '../stats.js'
import { getFieldKeys } from './factor.js'

const parseDepends = (fn) => {
  if (!fn) return []
  const matches = fn.toString().match(/\Wc\.\w+/g)
  if (!matches) return []
  const depends = matches.map(str => str.slice(3))
  return depends
}

const hasChoice = (key) => {
  const { choice, mergeFrom } = domain[key]
  return choice || mergeFrom.some(hasChoice)
}

const parseDagram = (str) => {
  const locs = {}
  const rows = str
    .split('\n')
    .map(line => line.match(/\S+/g))
    .filter(row => row && (row.length > 0))
    .map((row, i) => row.map((cell, j) => {
      if (cell === '-') {
        return {}
      } else if (cell[0] === '$') {
        return ({
          key: cell.slice(1),
          value: true,
          loc: [i, j],
        })
      } else {
        const key = cell
        locs[key] = [i, j]
        return { key, loc: [i, j] }
      }
    }))
  return { rows, locs }
}


const getDiagramObj = (str, subKey) => {
  const arrows = []
  const valuePaths = []
  const { rows, locs } = parseDagram(str)
  for (const row of rows) {
    for (const cell of row) {
      const {key, value, loc} = cell
      if (!key) continue
      if (value) {
        const { type, options, valuedBy } = domain[key]
        valuePaths.push([locs[key], loc])
        cell.notify = hasMissingValues(key).missing
        const agent = domain[key].valuedBy[0]
        cell.path = `/value/${key}/${agent}`
        if (type === 'option') {
          cell.path += '/' + Object.keys(options)[0]
        }
        if (loc[0] !== locs[key][0]) {
          cell.shiftBack = true
        }
      } else {
        const { title, calc, decidedBy } = domain[key]
        cell.title = title
        //Exclude external arrows
        cell.choice = hasChoice(key)
        cell.decision = decidedBy && decidedBy.length === 1
        cell.negotiation = decidedBy && decidedBy.length > 1
        if (domain[key].subKey === subKey) {
          parseDepends(calc)
            .filter(dk => (dk in locs) && dk !== key)
            .map(dk => locs[dk])
            .forEach(fromLoc => arrows.push([fromLoc, loc]))
          cell.notify = cell.choice && hasChoiceMissing(key)
        } else {
          cell.external = true
        }
        const fieldKeys = getFieldKeys(key)
        if (fieldKeys.length > 1) {
          cell.path = '/factor/' + key + '/' + fieldKeys[0]
        } else {
          cell.path = '/factor/' + key
        }
      }
      cell.importance = !cell.external && getImportance(key, value)
      cell.onClick = (event) => navigate(cell.path, event)
    }
  }
  return { rows, arrows, valuePaths }
}

const hasExternal = {}
for (const subKey in subdomains) {
  const { rows } = parseDagram(subdomains[subKey].diagram)
  for (const row of rows) {
    for (const cell of row) {
      const {key, value} = cell
      if (key && !value && (domain[key].subKey !== subKey)) {
        hasExternal[key] = true
      }
    }
  }
}

export const getDiagram = ({subKey}) => {
  const content = []

  if (!localStorage.getItem('dismissed_diagram_info')) {
    content.push(Info({
      title: 'Influence diagram',
      content: DiagramInfo(),
      onClose: () => {
        localStorage.setItem('dismissed_diagram_info', 'true')
        updateView()
      },
    }))
  }

  const subTabs = Object.keys(subdomains).map((sub) => ({
    label: sub.toUpperCase(),
    active: sub === subKey,
    onClick: (event) => navigate('/diagram/'+sub, event),
    path: '/diagram/'+sub,
  }))
  content.push(Tabs(subTabs))

  //TODO: do no re-compute most of the diagramObj properties
  const diagram = getDiagramObj(subdomains[subKey].diagram, subKey)
  diagram.extArrows = []
  for (const row of diagram.rows) {
    for (let j = 0; j < row.length; j++) {
      const { value, external, key, loc } = row[j]
      const extArrow = key && !value && !external && hasExternal[key]
      if (extArrow) {
        //TODO: do not rely on domain hints
        const blocked = row[j+1] && row[j+1].key || domain[key].blockedExtArrow
        const flip = domain[key].flipExtArrow
        diagram.extArrows.push({ loc, blocked, flip })
      }
    }
  }
  content.push(Diagram(diagram))

  return { content, title: subKey.toUpperCase() }
}

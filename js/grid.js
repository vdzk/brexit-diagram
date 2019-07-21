import { domain, subdomains } from './domain/domain.js'
import { Grids } from './components/grid.js'

const parseDepends = (fn) => {
  if (!fn) return []
  const matches = fn.toString().match(/\Wc\.\w+/g)
  if (!matches) return []
  const depends = matches.map(str => str.slice(3))
  return depends
}

const hasExternal = {}
const parseGrid = (str, subKey) => {
  let locs = {}
  let arrows = []
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
  for (const row of rows) {
    for (const cell of row) {
      const {key, value, loc} = cell
      if (!key) continue
      if (value) {
        cell.title = '❤️'
        arrows.push([locs[key], loc])
      } else {
        const { title, calc } = domain[key]
        cell.title = title
        //Exclude external arrows
        if (domain[key].subKey === subKey) {
          parseDepends(calc)
            .filter(dk => (dk in locs) && dk !== key)
            .map(dk => locs[dk])
            .forEach(fromLoc => arrows.push([fromLoc, loc]))
        } else {
          cell.external = true
          hasExternal[key] = true
        }
      }
    }
  }
  return { rows, arrows }
}

const grids = []
for (const subKey in subdomains) {
  const { grid } = subdomains[subKey]
  grids.push({ subKey, ...parseGrid(grid, subKey) })

  //Add external arrows
  for (const grid of grids) {
    grid.extArrows = []
    for (const row of grid.rows) {
      for (let j = 0; j < row.length; j++) {
        const { value, external, key, loc } = row[j]
        const extArrow = key && !value && !external && hasExternal[key]
        if (extArrow) {
          const blocked = row[j+1] && row[j+1].key
          const flip = domain[key].flipExtArrow
          grid.extArrows.push({ loc, blocked, flip })
        }
      }
    }
  }
}

export const getGrid = () => Grids(grids)

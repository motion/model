/* flow */
import { it, describe, expect } from 'jasmine-fix'
import sleep from 'sleep-promise'
import Model, { query } from '../lib'
import { autorun } from 'mobx'

// shim
// window.WebSocket = require('websocket').client

console.log(`
  Be sure to run 'hz serve --dev' in your /tmp directory before running...
`)

const Horizon = require('../vendor/horizon')
const horizon = Horizon({
  host: '127.0.0.1:8181',
  secure: false,
})

class JobModel extends Model {
  static table = 'jobs'
  static propTypes = { name: 'string', projectId: '?string', timestamps: true }

  @query all = () => {
    return this.$.limit(10)
  }
}

class ProjectModel extends Model {
  static table = 'projects'
  static propTypes = { id: 'number', name: 'string' }

  @query jobs = () => {
    return Job.$.findAll({ projectId: this.id }).order('createdAt')
  }
  @query subQuery = () => {
    return Job.all()
  }
  @query ordered = () => {
    return this.$.order('id')
  }
  @query first = () => {
    return this.ordered().limit(1)
  }
  get reversed() {
    return this.ordered().reverse()
  }
}

let Job
let Project

// instances
const getModels = async () => {
  Job = new JobModel(horizon)
  Project = new ProjectModel(horizon)
  await Promise.all([Project.destroyAll(), Job.destroyAll()])
  const p1 = await Project.create({ id: 1, name: 'p1' })
  const p2 = await Project.create({ id: 2, name: 'p2' })
  const j1 = await Job.create({ id: 1, name: 'Job 1', projectId: p1.id })
  const j2 = await Job.create({ id: 2, name: 'Job P2', projectId: p2.id })
  const j3 = await Job.create({ id: 3, name: 'Job P22', projectId: p2.id })
  return { p1, p2, j1, j2, j3 }
}

/*
  TODO
  - test #2
    - await sleep(20) should be replaced with new method: await Job.all().resolved
*/

// tests
describe('Model', () => {
  it('should set up correctly', async () => {
    const $ = await getModels()
    expect(!!$.p1.id).toBe(true)
    expect($.p1.name).toBe('p1')
    expect($.p2.name).toBe('p2')
    expect($.j1.name).toBe('Job 1')
    expect($.j1.projectId).toBe($.p1.id)
  })

  it('should return and update observables', async () => {
    await getModels()
    expect(Job.all().length).toBe(0)
    await sleep(20)
    expect(Job.all().length).toBe(3)
  })

  it('should allow querying one model from another', async () => {
    const $ = await getModels()
    const p2Jobs = $.p2.jobs()
    expect(p2Jobs.length).toBe(0)
    await sleep(20)
    expect($.p2.jobs().length).toBe(2)
    expect($.p2.jobs()[0].name).toBe('Job P2')
  })

  it('should allow chaining queries within a model', async () => {
    await getModels()
    Project.first()
    await sleep(20)
    expect(Project.first()[0].name).toBe('p1')
  })

  it('should allow getters that manipulate queries', async () => {
    await getModels()
    expect(Project.reversed.length).toBe(0)
    await sleep(20)
    const reversed = Project.reversed
    expect(reversed.length).toBe(2)
    expect(reversed[0].name).toBe('p2')
    expect(reversed[0] instanceof ProjectModel).toBe(true)
  })

  it('should allow subQueries that return and update observables on parent', async () => {
    await getModels()
    expect(Project.subQuery().length).toBe(0)
    await sleep(20)
    expect(Project.subQuery().length).toBe(3)
  })

  it('should return the right model from own queries', async () => {
    await getModels()
    Project.ordered()
    await sleep(20)
    expect(Project.ordered().length).toBe(2)
    Project.ordered().forEach(project => {
      expect(project instanceof ProjectModel).toBe(true)
    })
  })

  it('should return the right model from different model queries', async () => {
    const $ = await getModels()
    $.p2.jobs()
    await sleep(20)
    expect($.p2.jobs().length).toBe(2)
    $.p2.jobs().forEach(job => {
      expect(job instanceof JobModel).toBe(true)
    })
  })

  it('should only update once when changed', async () => {
    await getModels()
    await new Promise((resolve, reject) => {
      let runs = 0
      const off = autorun(() => {
        runs++

        if (runs === 1) {
          expect(Project.reversed.length).toBe(0)
        }
        else if (runs === 2) {
          expect(Project.reversed.length).toBe(2)
        }
        else if (runs === 3) {
          expect(Project.reversed.length).toBe(3)
        }
        else {
          reject("This was triggered more than once!")
        }

        // give it time to fuck up
        setTimeout(() => {
          resolve()
          off()
        }, 100)
      })

      setTimeout(() => {
        Project.create({ id: 10, name: 'A' })
      }, 5)
    })
  })

  it('doesnt have weird runtime issues when running multiple different queries', async () => {
    await getModels()
    expect(Project.first().length).toBe(0)
    expect(Job.all().length).toBe(0)
    await sleep(20)
    expect(Project.first().length).toBe(1)
    console.log('project', Project.first()[0])
    console.log('job', Job.all()[0])
    expect(Project.first()[0] instanceof ProjectModel).toBe(true)
    expect(Job.all()[0] instanceof JobModel).toBe(true)
  })

  // it('should only subscribe once to queries', async () => {
  //   // TODO: requires checking subscriptions
  // })
  //
  // it('should allow subscription to query with off() handler', async () => {
  //
  // })
  //
  // it('should work with getters and plain functions', async () => {
  //
  // })
  //
  // it('should allow Model.single.[xyz]... queries for individual items', async () => {
  //
  // })
  //
  // it('should allow queries that are not realtime (one time calls) but still chainable', async () => {
  //
  // })
  //
  // it('should throw an error on accessing invalid attributes (potentially)', async () => {
  //
  // })

})

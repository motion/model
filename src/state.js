import { Emitter } from 'sb-event-kit'
import rethinkdb from './adaptors/rethinkdb'
import horizon from './adaptors/horizon'

const state = {
  adaptor: typeof window === 'undefined' ? rethinkdb : horizon,
  parameters: {},
  emitter: new Emitter(),
}

// helper for global props
export const setOptions = (parameters: Object) => {
  if (!Object.isFrozen(state)) {
    Object.assign(state, parameters)
    Object.freeze(state)
  }
  else {
    console.debug(`macro-model: can't setOptions twice!`)
  }
}

export default state

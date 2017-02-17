import { action, isObservable, extendShallowObservable, autorun } from 'mobx'
import { isEqual } from 'lodash'
import hash from 'hash-sum'

const SHOULD_DEBUG = typeof window !== 'undefined' && window.localStorage.getItem('debug_macro_model')
const debug = (...args) => SHOULD_DEBUG && console.log('@query', ...args)

// sets observables and unsubscribe
const setter = (name, where, key) => action(name, (value, subscription) => {
  where[key] = value
  where[key].unsubscribe = () => subscription.unsubscribe()
})

// @query decorator
export default (parent, property, descriptor) => {
  const { initializer, get, ...properties } = descriptor
  const queryFunc = initializer || get

  const queryObservableKey = (args) => {
    const id = args.length ? hash(args) : ''
    return `${property}_${id}_observable`
  }

  const value = function queryWrapper(...args) {
    if (!this) {
      console.error(`macro-model: You called a query without the class being bound to this properly!`)
      return null
    }

    const { name } = this.constructor
    debug('<<<', name, property, '(', args, ')')
    const KEY = queryObservableKey(args)

    // cache before run
    const isChildQuery = !!this.isChild

    // run query
    this.isChild = KEY
    const query = queryFunc.call(this)(...args)
    this.isChild = false

    // if passing to parent query
    if (!query || isChildQuery || isObservable(query)) {
      return query
    }

    // helpers
    const location = this.__internal__.observables
    const get = () => location[KEY]
    const update = setter(`${name}.${KEY}.set`, location, KEY)

    // if already run
    const val = get()
    if (typeof val !== 'undefined') {
      return val
    }

    // is new query (create observable)
    extendShallowObservable(location, { [KEY]: null })

    // store before setTimeout
    const watcher = () => query.watch()
    const Model = query._sendRequest && query._sendRequest.model || this

    // make new model and be sure to subscribe
    const make = x => Model.new(x, { subscribe: true })

    // promise helper for non-mobx usage
    const self = this

    // what happens whenever new data comes in
    const onData = (data, subscription) => {
      // update active observable
      debug('onData', this.constructor.name, property, '=', data)
      if (!data) return

      // gather new value
      let newValue = null

      if (Array.isArray(data)) {
        // BUGFIX horizon sort by date
        if (self.constructor.propTypes.timestamps === true) {
          data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        }

        const previous = get()

        newValue = data.map(item => {
          if (previous) {
            const match = previous.indexOf(prev => prev.id === item.id)

            if (match !== -1) {
              // apply new props, dont reapply options (no need to re-subscribe)
              previous[match].__applyProps__(item, {}, false)
              return previous[match]
            }
          }
          return make(item)
        })
      }
      else {
        newValue = make(data)
      }

      // set new value
      // set observable
      update(newValue, subscription)
    }

    queryWrapper.promise = (...args) => {
      queryWrapper.call(self, ...args)
      const key = queryObservableKey(args)

      return new Promise((resolve) => {
        autorun(key, r => {
          const val = self.__internal__.observables[key]
          if (val) {
            r.dispose()
            resolve(val)
          }
        })
      })
    }

    // start subscription
    // setTimeout to allow any sub-query chaining to happen
    setTimeout(() => {
      const subscription = watcher()
        // resubscribe on errors
        .catch(err => {
          console.error(this.constructor.name, property, 'args', args, 'error', err)
        })
        .subscribe(data => onData(data, subscription))

      this.__internal__.subscriptions.add(() => {
        debug('unsubscribing from', parent, property, KEY)
        subscription.unsubscribe()
      })
    })

    return get()
  }

  if (get) {
    return {
      get: value,
      ...properties,
    }
  }

  return {
    ...properties,
    value,
  }
}

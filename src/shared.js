import { omit } from 'lodash'
import pluralize from 'sb-pluralize'
import { CompositeDisposable, createCompositeDisposable } from 'macro-class-helpers'
import state from './state'

type InternalStruct = {
  db: Function | null;
  subscriptions: CompositeDisposable;
  setObservable: Function;
  table: Function;
  resolved: boolean;
}

export default class BaseModel {
  __internal__: InternalStruct;

  constructor(parameters, props, options) {
    const params = () => {
      return parameters || state.parameters
    }

    const Internal = this.__internal__ = {
      props,
      options,
      get parameters() { return params() },
      get db() { return params().db },
      get company() { return params().company },
      observables: {},
      resolved: false,
      subscribed: false,
      subscriptions: createCompositeDisposable(),

      table: (namedTable: string) => {
        // fallback to the model name lowercase + plural
        const { name, table } = this.constructor
        const dbName = namedTable || table || pluralize(name.toLowerCase())
        return Internal.db(dbName)
      },

      subscribe: () => {
        let hasResolved = false

        return new Promise(resolve => {
          // prevent multiple subscribe
          if (Internal.subscribed) {
            resolve()
          }
          else {
            Internal.subscribed = true

            const watcher = Internal.table().find({ id: this.id }).watch({ rawChanges: true }).subscribe(
              change => {
                if (change.type === 'change' && change.new_val) {
                  const validChanges = omit(change.new_val, ['id'])

                  Object.keys(validChanges).forEach(key => {
                    this[key] = validChanges[key]
                  })
                }

                if (!hasResolved) {
                  hasResolved = true
                  resolve()
                }
              },
              err => console.error(err)
            )

            Internal.subscriptions.add(() => watcher.unsubscribe())
          }
        })
      },
    }
  }

  get $() {
    const query = this.__internal__.table()
    query._sendRequest.model = this
    return query
  }

  dispose() {
    this.__internal__.subscriptions.dispose()
    if (state.emitter) state.emitter.emit('unmount', this)
  }
}

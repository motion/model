// Model class
import state from './state'
import applyInstance from './instance'
import { isInstance } from './helpers'
import Shared from './shared'

// exports
export query from './queryDecorator'
export { setOptions } from './state'
export * from 'mobx'
export const emitter = () => state.emitter

const defaultOptions = {}

export default class Model extends Shared {
  constructor(parameters, props, options = defaultOptions) {
    super(parameters, props, options)

    // debug helpers
    if (state.emitter) {
      this.__muid__ = Math.random()
      state.emitter.emit('mount', this)
    }

    // instance
    if (props) {
      this.__internal__.isInstance = true
      this.__applyProps__()
    }
  }

  // PRIVATE

  __applyProps__(props, options, isNewInstance = true) {
    applyInstance(
      this,
      props || this.__internal__.props,
      options || this.__internal__.options,
      isNewInstance
    )
  }

  get __table__() {
    return this.__internal__.table()
  }

  get __connection__() {
    const { connection } = this.__internal__.parameters
    return connection()
  }

  async __instantiate__(row, opts) {
    const instance = this.new(row, opts)
    if (opts && opts.subscribe) {
      await instance.__internal__.subscribe()
    }
    return instance
  }

  __preprocess__(arr) {
    return arr
  }

  // PUBLIC

  new(props, opts) {
    return new this.constructor(this.__internal__.parameters, props, opts)
  }

  async create(props, opts) {
    return await this.new(props, opts).save()
  }

  async get(find, opts) {
    const row = await this.find(find)
    return await this.__instantiate__(row, opts)
  }

  async getAll(find, opts) {
    const rows = await this.findAll(find)
    return await Promise.all(
      rows.map(row => this.__instantiate__(row, opts))
    )
  }

  find(...args) {
    return state.adaptor.find.call(this, this.__preprocess__(args))
  }

  findAll(...args) {
    return state.adaptor.findAll.call(this, this.__preprocess__(args))
  }

  remove(...args) {
    return state.adaptor.remove.call(this, this.__preprocess__(args))
  }

  removeAll(...args) {
    return state.adaptor.removeAll.call(this, this.__preprocess__(args))
  }

  replace(...args) {
    return state.adaptor.replace.call(this, this.__preprocess__(args))
  }

  store(arg) {
    return state.adaptor.store.call(this, arg)
  }

  upsert(...args) {
    return state.adaptor.upsert.call(this, this.__preprocess__(args))
  }

  // instance only
  toJSON() {
    isInstance(this)
    return Object.keys(this.__internal__.propTypes)
      .filter(x => typeof this[x] !== 'undefined')
      .reduce((acc, cur) => ({
        ...acc,
        [cur]: this[cur],
      }), {})
  }

  async save() {
    isInstance(this)
    // set timestamps
    if (this.constructor.propTypes.timestamps === true) {
      const now = new Date()
      this.updatedAt = now
      // keep if already set
      this.createdAt = this.createdAt || now
    }
    const { id } = await state.adaptor.store.call(this, this.toJSON())
    this.id = id
    return this
  }

  async update(idOrObject: Object | string, object?: Object = null) {
    if (this.__internal__.isInstance) {
      // if is instance, just use first arg
      Object.assign(this, idOrObject)
      await this.save()
      return this
    }
    return state.adaptor.update.call(this, idOrObject, object)
  }

  async destroy() {
    isInstance(this)
    if (!this.id) {
      console.error('Attempted deleting with model that has no id')
    }
    else {
      await state.adaptor.remove.call(this, this.id)
    }
    return this
  }
}

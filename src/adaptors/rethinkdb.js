export default {
  find(args) {
    let query
    const single = Array.isArray(args) && typeof args[0] === 'string'
    if (single) {
      query = this.__table__.get(args[0])
    } else {
      query = this.__table__.filter(...args)
    }
    return query
      .run(this.__connection__)
      .then(x => single ? x : x.toArray())
      .then(x => single ? x : x[0])
  },
  findAll(args) {
    const query = (!args[0] ?
      this.__table__ :
      this.__table__.filter(...args)
    )
    return query.run(this.__connection__).then(x => x.toArray())
  },
  remove(args) {
    const ids = [].concat(args)

    return Promise.all(ids.map((id) =>
      this.__table__.get(id).delete().run(this.__connection__)
    ))
  },
  removeAll(args) {
    return this.__table__.getAll(...args).delete().run(this.__connection__)
  },
  replace(args) {
    return this.__table__.replace(...args).run(this.__connection__)
  },
  async store(arg) {
    const res = await this.__table__.insert(arg, { conflict: 'update' }).run(this.__connection__)
    return {
      id: res.generated_keys && res.generated_keys[0] || this.id,
      ...arg,
    }
  },
  update(id, arg) {
    return this.__table__.get(id).update(arg).run(this.__connection__)
  },
  upsert(args) {
    return this.__table__.upsert(...args).run(this.__connection__)
  },
}

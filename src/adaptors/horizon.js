export default {
  find(args) {
    return this.__table__.find(...args).fetch().toPromise()
  },
  findAll(args) {
    if (!args[0]) {
      return this.__table__.findAll().fetch().toPromise()
    }
    return this.__table__.findAll(...args).fetch().toPromise()
  },
  remove(arg) {
    return this.__table__.remove(arg).toPromise()
  },
  removeAll(args) {
    return this.__table__.removeAll(...args).toPromise()
  },
  replace(args) {
    return this.__table__.replace(...args).toPromise()
  },
  store(arg) {
    return this.__table__.store(arg).toPromise()
  },
  update(id, arg) {
    return this.__table__.update({ id, ...arg }).toPromise()
  },
  upsert(args) {
    return this.__table__.upsert(...args).toPromise()
  },
}

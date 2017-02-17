import { isObject, difference } from 'lodash'
import { extendShallowObservable, action } from 'mobx'
import { normalizeProps, typeError } from './helpers'
import state from './state'

function setProps(instance, props, isSubscriber, isNewInstance) {
  const { name } = instance.constructor
  const { propTypes } = instance.__internal__
  const ignoreKeys = ['$hz_v$']
  const instancePropNames = Object.keys(propTypes)
  const propNames = Object.keys(props)
    .filter(x => ignoreKeys.indexOf(x) > -1)

  const diff = difference(propNames, instancePropNames, ignoreKeys)
  if (diff.length) {
    console.warn(
      `You are passing props model ${name} that aren't defined in the models static props attribute.`,
      `If you want these props to persist, be sure to add the following to props to ${name}\n`,
      diff
    )
  }

  if (propTypes && props) {
    for (const key of instancePropNames) {
      const isNullable = propTypes[key][0] === '?'

      // validate non-optional keys
      if (key !== 'id' && !isNullable) {
        if (typeof props[key] !== propTypes[key]) {
          console.error(typeError(name, key, propTypes[key], typeof props[key]))
        }
      }

      // validate collisions
      if (isNewInstance && typeof instance[key] !== 'undefined') {
        throw new Error(`Attempting to define a property onto model that already exists: ${name} ${key}`)
      }

      // value based on nullability
      const value = isNullable ? props[key] || null : props[key]

      // avoid setting id to null when not defined, causes rethink bug
      if (key === 'id' && !value) {
        continue
      }

      // set, either observable or plain
      if (isSubscriber) {
        extendShallowObservable(instance, { [key]: value })
      }
      else {
        instance[key] = value
      }
    }
  }
}

export default async function applyInstance(instance, props, options = {}, isNewInstance) {
  const { defaultProps, propTypes } = instance.constructor

  // normalize props and add globals
  instance.__internal__.propTypes = normalizeProps({
    ...state.defaultPropTypes,
    ...propTypes,
  })

  // get default props, function allowed
  const defaults = typeof defaultProps === 'function' ? defaultProps() : defaultProps

  // set props onto instance
  setProps(instance, { ...defaults, ...props }, options.subscribe, isNewInstance)

  if (options.subscribe) {
    await instance.__internal__.subscribe()
  }

  instance.__internal__.resolved = true
}

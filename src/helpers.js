export const typeError = (a, b, c, d) => `Invalid property passed in for ${a}
  expected: typeof ${b} == '${c}'
  received: typeof ${b} == '${d}'`

export const normalizers = {
  timestamps: val => {
    if (val !== true) return null
    return {
      createdAt: '?object',
      updatedAt: '?object',
    }
  },
}

export function normalizeProps(props) {
  const normalized = Object.keys(props).reduce((acc, cur) => {
    const val = { [cur]: props[cur] }
    return {
      ...acc,
      ...(normalizers[cur] ? normalizers[cur](props[cur]) || val : val),
    }
  }, {})

  return normalized
}

export const isInstance = instance => {
  if (!instance.__internal__.isInstance) {
    throw new Error(`Calling instance function on a parent model, you should only call this on an instantiated model.`)
  }
}

import { symbols } from './utils'

export class Context {
  static readonly effect = symbols.effect
  static readonly filter = symbols.filter
  static readonly isolate = symbols.isolate
  static readonly intercept = symbols.intercept

  root: this

  constructor() {
    this.root = this
  }
}

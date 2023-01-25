const core = require('@lumjs/core');
const 
{
  S,F,isObj,isNil,notNil,isComplex,needObj,def,isa
} = core.types;

const DEFAULT_OPTS =
{
  showWhen: true,
  showTag: false,
  wildcard: '*',
}

/**
 * A class to help with debugging
 * 
 * Mostly just used for displaying certain messages depending on if
 * specific tags have been enabled or not. May also be used to run
 * conditional code based on the same tags.
 * 
 * This implements the *observable* API from `@lumjs/core` so there's
 * various observable events that you can assign event handlers to
 * in order to customize the behaviours even further.
 * 
 * @exports @lumjs/debug
 * 
 * @prop {bool} showWhen - Send {@link module:@lumjs/debug#when when()} 
 * method arguments to the console log (debug priority).
 * 
 * @prop {bool} showTag - When sending `when()` calls to the console log,
 * include the `tag` that was tested in the log arguments.
 * Only used if `showWhen` is `true` obviously.
 * 
 * @prop {string} wildcard - A special wildcard tag, that if set to `true`
 * will make {@link module:@lumjs/debug#is is()} return `true` regardless
 * of what tags are being tested for.
 * 
 */
class LumDebug
{
  /**
   * Build a new instance
   * 
   * @param {object} [opts={}] Options for the instance.
   * 
   * There are two types of options supported here:
   * - Options corresponding directly to object properties, which will be
   *   type checked, and may be updated later using the 
   *   {@link module:@lumjs/debug#opt opt()} method.
   * - Options which are passed through to other methods, in which case the
   *   documentation below will specify which instance method is used.
   * 
   * @param {bool}   [opts.showWhen=true] {@link module:@lumjs/debug#showWhen}
   * @param {bool}   [opts.showTag=false] {@link module:@lumjs/debug#showTag}
   * @param {string} [opts.wildcard='*'] {@link module:@lumjs/debug#wildcard}
   * 
   * @param {object} [opts.tags] An initial set of debugging tags.
   * 
   * Uses {@link module:@lumjs/debug#update update(opts.tags)};
   * 
   * @param {object} [opts.observable] Options for the *Observable API*.
   * 
   * Uses {@link module:@lumjs/debug#observable observable(opts.observable)};
   * 
   * @param {object|function} [opts.extend] Extensions for this instance.
   * 
   * Uses {@link module:@lumjs/debug#extend extend(opts.extend, opts)};
   * 
   * As the full `opts` are passed, any options supported by the `extend()`
   * method may be included in the `opts` passed to the constructor.
   * 
   * Extensions *may* add further options, some of which can be used to set
   * new properties (and as such will be supported by the `opt()` method),
   * and others which may be for internal setup purposes only.
   *
   */
  constructor(opts={})
  {
    needObj(opts);

    // Set up observable methods on this object.
    this.observable(opts.observable);

    // Set up any extensions that may be enabled.
    if (isComplex(opts.extend))
    {
      this.extend(opts.extend, opts);
    }

    // Set up our default options.
    this.$initOpts(opts);

    // Initialize the debugging tags.
    this.update(opts.tags);

    // Mark this as initialized.
    def(this, '$initialized', true);
  }

  // A constructor sub for initializing options.
  $initOpts(opts)
  {
    const DO = DEFAULT_OPTS;
    for (const opt in DO)
    { 
      const def = DO[opt];
      let ot, dv;

      if (isObj(def) && notNil(def.type) && notNil(def.value))
      { // A specific type test.
        ot = def.type;
        dv = def.value;
      }
      else 
      { // A default type test.
        dv = def;
        ot = typeof dv;
      }

      if (opts[opt] === undefined)
      { // Nothing was specified, so use the default value.
        this[opt] = dv;
      }
      else if (isa(opts[opt], ot))
      { // The specified value is the correct type.
        this[opt] = opts[opt];
      }
      else 
      { // Invalid option value.
        console.error({opt, opts, def, ot, dv});
        throw new TypeError(`Invalid value for ${opt} option`);
      }
    }
  }

  /**
   * Applies the `@lumjs/core/observable` API to `this`
   * 
   * @param {object} opts - Options for observable API.
   * 
   * @returns {object} `this`
   */
  observable(opts={})
  {
    return core.observable(this, opts);
  }

  /**
   * Change option values after construction
   * 
   * @param {object} opts - The option properties we want to change.
   * 
   * The option values are type checked, so make sure they are valid.
   * 
   * Any of the options from the constructor that set instance properties 
   * are supported here. The options which call other methods are **not**
   * supported here, just use the actual method.
   * 
   * @returns {object} `this`
   * @throws {TypeError} If any option value is not a valid type.
   */
  opt(opts)
  {
    needObj(opts);

    const DO = DEFAULT_OPTS;
    for (const opt in opts)
    {
      const def = DO[opt];
      let ot;

      if (isObj(def) && notNil(def.type) && notNil(def.value))
      { // A specific type test.
        ot = def.type;
      }
      else 
      { // A default type test.
        ot = typeof dv;
      }

      if (isa(opts[opt], ot))
      { // It's valid, set our property to the option value.
        this[opt] = opts[opt];
      }
      else 
      {
        console.error({opt, opts, def, ot});
        throw new TypeError(`Invalid value for ${opt} option`);
      }
    }

    return this;
  }

  /**
   * Extend the Debug instance with extra functionality
   * 
   * @param {object|function} extDef - Extension definition
   * 
   * - May be an `object` with a `registerDebug(dbg, opts)` method.
   *   Where `dbg` will be the Debug instance, and `opts` are the
   *   options passed to this method.
   * 
   * - May be an `object` with a `extendDebug(opts)` function.
   *   In this case, the function will be called using `.call()`
   *   and `this` will be set to the debug instance. 
   * 
   * - May be a `function` in which case it's handled exactly the
   *   same as the `object.extendDebug(opts)` shown above.
   *   **Do NOT** pass a constructor function here, *it won't work*.
   * 
   * - May be an `Array` of any mix of the above extension definitions.
   * 
   * @param {object} [opts] Further options to pass to the extensions.
   * 
   * @returns {object} `this`
   * @throws {TypeError} If the `extDef` is not one of the supported values.
   */
  extend(extDef, opts)
  {
    if (Array.isArray(extDef))
    {
      for (const subDef of extDef)
      {
        this.extend(subDef, opts);
      }
    }

    else if (isComplex(extDef) && typeof extDef.registerDebug === F)
    {
      extDef.registerDebug(this, opts);
    }

    else if (isComplex(extDef) && typeof extDef.extendDebug === F)
    {
      extDef.extendDebug.call(this, opts);
    }

    else if (typeof extDef === F)
    {
      extDef.call(this, opts);
    }

    else 
    {
      console.error({extDef});
      throw new TypeError("Unsupported extension type");
    }

    return this;
  }

  /**
   * Toggle one or more tags
   * 
   * Triggers `toggle` event, once for each `tag`; the arguments will be
   * the individual `tag`, and the final boolean `toggle` value
   * (not necessarily the same as the `toggle` argument value.)
   * 
   * @param {?(string|string[])} [tag] The tag(s) to toggle.
   * 
   * If `undefined` or `null` then *ALL* currently used tags will be toggled.
   * This includes anything specifically set to `true` *OR* `false`.
   * 
   * If the special wildcard value `'*'` is set to `true`, then `is()` will 
   * always return `true` regardless of what tag(s) are being tested for.
   * 
   * @param {?bool} [toggle] The new value to set.
   * 
   * If `undefined` or `null` then the tag will be toggled to the opposite 
   * of its current value.
   * 
   * @returns {object} `this`
   * @throws {TypeError} If `tag` is not a supported value.
   */
  toggle(tag, toggle)
  {
    if (isNil(tag))
    { // If tag is ommitted, toggle everything.
      for (const key in this.tags)
      {
        this.toggle(key, toggle);
      }
    }

    else if (Array.isArray(tag))
    { // An array of tags, recurse it.
      for (const sub of tag)
      {
        this.toggle(sub, toggle);
      }
    }

    else if (typeof tag === S)
    { // A single tag that we're toggling.
      if (isNil(toggle))
      { // Invert the current setting.
        toggle = this.tags[tag] ? false : true;
      }

      // Update the tag setting.
      this.tags[tag] = toggle;

      this.trigger('toggle', tag, toggle);
    }

    else 
    {
      console.error({tag});
      throw new TypeError("Unsupported tag type");
    }

    return this;
  }

  /**
   * See if a tag is set to `true`
   * 
   * @param {(string|string[])} tag - Tag(s) to test
   * 
   * If an `Array` is passed, this will return `true` if any one of
   * the tags in the array are `true`.
   * 
   * @returns {bool}
   */
  is(tag)
  {
    if (this.wildcard in this.tags && this.tags[this.wildcard])
    { // Wildcard tag was set, all debugging is enabled.
      return true;
    }
    
    if (Array.isArray(tag))
    { // Check one of a bunch of tags.
      for (var t in tag)
      {
        if (this.is(tag[t]))
        { // One of the tags matched, we're good!
          return true;
        }
      }
    }

    else if (typeof tag === S && 
        tag in this.tags && this.tags[tag])
    { // Explicit tag matched.
      return true;
    }

    // Nothing matched.
    return false;
  }

  /**
   * If a tag is `true`, log a message, and/or trigger an event.
   * 
   * If `this.showWhen` is `true` (the default value), then if the
   * call to `is(tag)` returns `true`, the `args` will be passed to
   * the `console.debug()` method. If `this.showTag` is true, the tag
   * will be included as the first argument.
   * 
   * Triggers two events:
   * - `when` event, with the `tag`, and the `args` passed as an array.
   * - `{tag}` event, with the `args` passed as individual parameters.
   * 
   * @param {(string|string[])} tag - See {@link module:@lumjs/debug#is}
   * @param  {...any} args - Args for event and log message.
   * 
   * @returns {object} `this`
   */
  when(tag, ...args)
  {
    if (this.is(tag))
    {
      if (this.showWhen)
      {
        const showArgs = this.showtag ? [tag].concat(args) : args;
        console.debug(...showArgs);
      }

      this.trigger('when', tag, args);
      this.trigger(tag, ...args);
    }

    return this;
  }

  /**
   * Update a bunch of tags at once
   * 
   * Triggers events at different times:
   * - `preUpdate` event before making any changes.
   * - `postUpdate` event after all changes have been applied.
   * 
   * @param {object} tags - A map of tags to set.
   * 
   * The property names are the tags, and the values should be `bool`.
   * 
   * @param {bool} [reset=true] If `true`, replaces current tags entirely.
   * If `false`, leaves current tags alone and only updates specified ones.
   *  
   * @returns {object} `this`
   */
  update(tags, reset=true)
  {
    this.trigger('preUpdate', tags, reset);

    if (reset)
    {
      this.tags = {};
    }

    if (isObj(tags))
    { // Use the pre-determined values.
      for (const prop in tags)
      {
        this.toggle(prop, tags[prop]);
      }
    }

    // Call onUpdate on any extensions.
    this.trigger('postUpdate', tags, reset);

    return this;
  }

  /**
   * Calls {@link module:@lumjs/debug#update update()}
   * 
   * The only difference between this and `update()` is the default
   * value of the `reset` parameter.
   * 
   * @param {object} tags
   * @param {bool} [reset=false] 
   * 
   * @returns {object} `this`
   */
  set(tags, reset=false)
  {
    return this.update(tags, reset);
  }

} // Lum.Debug

module.exports = LumDebug;

def(LumDebug, 'DEFAULT_OPTS', DEFAULT_OPTS);

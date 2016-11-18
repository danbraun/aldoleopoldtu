'use strict';

window.whatInput = function () {

  'use strict';

  /*
    ---------------
    variables
    ---------------
  */

  // array of actively pressed keys

  var activeKeys = [];

  // cache document.body
  var body;

  // boolean: true if touch buffer timer is running
  var buffer = false;

  // the last used input type
  var currentInput = null;

  // `input` types that don't accept text
  var nonTypingInputs = ['button', 'checkbox', 'file', 'image', 'radio', 'reset', 'submit'];

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  var mouseWheel = detectWheel();

  // list of modifier keys commonly used with the mouse and
  // can be safely ignored to prevent false keyboard detection
  var ignoreMap = [16, // shift
  17, // control
  18, // alt
  91, // Windows key / left Apple cmd
  93 // Windows menu / right Apple cmd
  ];

  // mapping of events to input types
  var inputMap = {
    'keydown': 'keyboard',
    'keyup': 'keyboard',
    'mousedown': 'mouse',
    'mousemove': 'mouse',
    'MSPointerDown': 'pointer',
    'MSPointerMove': 'pointer',
    'pointerdown': 'pointer',
    'pointermove': 'pointer',
    'touchstart': 'touch'
  };

  // add correct mouse wheel event mapping to `inputMap`
  inputMap[detectWheel()] = 'mouse';

  // array of all used input types
  var inputTypes = [];

  // mapping of key codes to a common name
  var keyMap = {
    9: 'tab',
    13: 'enter',
    16: 'shift',
    27: 'esc',
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
  };

  // map of IE 10 pointer events
  var pointerMap = {
    2: 'touch',
    3: 'touch', // treat pen like touch
    4: 'mouse'
  };

  // touch buffer timer
  var timer;

  /*
    ---------------
    functions
    ---------------
  */

  // allows events that are also triggered to be filtered out for `touchstart`
  function eventBuffer() {
    clearTimer();
    setInput(event);

    buffer = true;
    timer = window.setTimeout(function () {
      buffer = false;
    }, 650);
  }

  function bufferedEvent(event) {
    if (!buffer) setInput(event);
  }

  function unBufferedEvent(event) {
    clearTimer();
    setInput(event);
  }

  function clearTimer() {
    window.clearTimeout(timer);
  }

  function setInput(event) {
    var eventKey = key(event);
    var value = inputMap[event.type];
    if (value === 'pointer') value = pointerType(event);

    // don't do anything if the value matches the input type already set
    if (currentInput !== value) {
      var eventTarget = target(event);
      var eventTargetNode = eventTarget.nodeName.toLowerCase();
      var eventTargetType = eventTargetNode === 'input' ? eventTarget.getAttribute('type') : null;

      if ( // only if the user flag to allow typing in form fields isn't set
      !body.hasAttribute('data-whatinput-formtyping') &&

      // only if currentInput has a value
      currentInput &&

      // only if the input is `keyboard`
      value === 'keyboard' &&

      // not if the key is `TAB`
      keyMap[eventKey] !== 'tab' && (

      // only if the target is a form input that accepts text
      eventTargetNode === 'textarea' || eventTargetNode === 'select' || eventTargetNode === 'input' && nonTypingInputs.indexOf(eventTargetType) < 0) ||
      // ignore modifier keys
      ignoreMap.indexOf(eventKey) > -1) {
        // ignore keyboard typing
      } else {
        switchInput(value);
      }
    }

    if (value === 'keyboard') logKeys(eventKey);
  }

  function switchInput(string) {
    currentInput = string;
    body.setAttribute('data-whatinput', currentInput);

    if (inputTypes.indexOf(currentInput) === -1) inputTypes.push(currentInput);
  }

  function key(event) {
    return event.keyCode ? event.keyCode : event.which;
  }

  function target(event) {
    return event.target || event.srcElement;
  }

  function pointerType(event) {
    if (typeof event.pointerType === 'number') {
      return pointerMap[event.pointerType];
    } else {
      return event.pointerType === 'pen' ? 'touch' : event.pointerType; // treat pen like touch
    }
  }

  // keyboard logging
  function logKeys(eventKey) {
    if (activeKeys.indexOf(keyMap[eventKey]) === -1 && keyMap[eventKey]) activeKeys.push(keyMap[eventKey]);
  }

  function unLogKeys(event) {
    var eventKey = key(event);
    var arrayPos = activeKeys.indexOf(keyMap[eventKey]);

    if (arrayPos !== -1) activeKeys.splice(arrayPos, 1);
  }

  function bindEvents() {
    body = document.body;

    // pointer events (mouse, pen, touch)
    if (window.PointerEvent) {
      body.addEventListener('pointerdown', bufferedEvent);
      body.addEventListener('pointermove', bufferedEvent);
    } else if (window.MSPointerEvent) {
      body.addEventListener('MSPointerDown', bufferedEvent);
      body.addEventListener('MSPointerMove', bufferedEvent);
    } else {

      // mouse events
      body.addEventListener('mousedown', bufferedEvent);
      body.addEventListener('mousemove', bufferedEvent);

      // touch events
      if ('ontouchstart' in window) {
        body.addEventListener('touchstart', eventBuffer);
      }
    }

    // mouse wheel
    body.addEventListener(mouseWheel, bufferedEvent);

    // keyboard events
    body.addEventListener('keydown', unBufferedEvent);
    body.addEventListener('keyup', unBufferedEvent);
    document.addEventListener('keyup', unLogKeys);
  }

  /*
    ---------------
    utilities
    ---------------
  */

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  function detectWheel() {
    return mouseWheel = 'onwheel' in document.createElement('div') ? 'wheel' : // Modern browsers support "wheel"

    document.onmousewheel !== undefined ? 'mousewheel' : // Webkit and IE support at least "mousewheel"
    'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox
  }

  /*
    ---------------
    init
     don't start script unless browser cuts the mustard,
    also passes if polyfills are used
    ---------------
  */

  if ('addEventListener' in window && Array.prototype.indexOf) {

    // if the dom is already ready already (script was placed at bottom of <body>)
    if (document.body) {
      bindEvents();

      // otherwise wait for the dom to load (script was placed in the <head>)
    } else {
      document.addEventListener('DOMContentLoaded', bindEvents);
    }
  }

  /*
    ---------------
    api
    ---------------
  */

  return {

    // returns string: the current input type
    ask: function ask() {
      return currentInput;
    },

    // returns array: currently pressed keys
    keys: function keys() {
      return activeKeys;
    },

    // returns array: all the detected input types
    types: function types() {
      return inputTypes;
    },

    // accepts string: manually set the input type
    set: switchInput
  };
}();
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.2.4';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function rtl() {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function plugin(_plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(_plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = _plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function registerPlugin(plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr('data-' + pluginName)) {
        plugin.$element.attr('data-' + pluginName, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger('init.zf.' + pluginName);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function unregisterPlugin(plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr('data-' + pluginName).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger('destroyed.zf.' + pluginName);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function reInit(plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins === 'undefined' ? 'undefined' : _typeof(plugins),
              _this = this,
              fns = {
            'object': function object(plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function string() {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function undefined() {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function GetYoDigits(length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? '-' + namespace : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function reflow(elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function transitionend($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function throttle(func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function foundation(method) {
    var type = typeof method === 'undefined' ? 'undefined' : _typeof(method),
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError('We\'re sorry, ' + type + ' is not a valid parameter. You must use a string representing the method you wish to invoke.');
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function now() {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function fNOP() {},
          fBound = function fBound() {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if (/true/.test(str)) return true;else if (/false/.test(str)) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets
  };

  /**
   * Compares the dimensions of an element to a container and determines collision events with container.
   * @function
   * @param {jQuery} element - jQuery object to test for collisions.
   * @param {jQuery} parent - jQuery object to use as bounding container.
   * @param {Boolean} lrOnly - set to true to check left and right values only.
   * @param {Boolean} tbOnly - set to true to check top and bottom values only.
   * @default if no parent object passed, detects collisions with `window`.
   * @returns {Boolean} - true if collision free, false if a collision in any direction.
   */
  function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left + hOffset,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  var keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey: function parseKey(event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();
      if (event.shiftKey) key = 'SHIFT_' + key;
      if (event.ctrlKey) key = 'CTRL_' + key;
      if (event.altKey) key = 'ALT_' + key;
      return key;
    },


    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey: function handleKey(event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },


    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable: function findFocusable($element) {
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },


    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register: function register(componentName, cmds) {
      commands[componentName] = cmds;
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) {
      k[kcs[kc]] = kcs[kc];
    }return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

!function ($) {

  // Default set of media queries
  var defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init: function _init() {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: 'only screen and (min-width: ' + namedQueries[key] + ')'
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },


    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast: function atLeast(size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },


    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get: function get(size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },


    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize: function _getCurrentSize() {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if ((typeof matched === 'undefined' ? 'undefined' : _typeof(matched)) === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },


    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher: function _watcher() {
      var _this = this;

      $(window).on('resize.zf.mediaquery', function () {
        var newSize = _this._getCurrentSize(),
            currentSize = _this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          _this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script && script.parentNode && script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium: function matchMedium(media) {
          var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  var initClasses = ['mui-enter', 'mui-leave'];
  var activeClasses = ['mui-enter-active', 'mui-leave-active'];

  var Motion = {
    animateIn: function animateIn(element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function animateOut(element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    function move(ts) {
      if (!start) start = window.performance.now();
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(function () {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(function () {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
'use strict';

!function ($) {

  var Nest = {
    Feather: function Feather(menu) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'zf';

      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('a:first').attr('tabindex', 0);

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-expanded': false,
            'aria-label': $item.children('a:first').text()
          });

          $sub.addClass('submenu ' + subMenuClass).attr({
            'data-submenu': '',
            'aria-hidden': true,
            'role': 'menu'
          });
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass('is-submenu-item ' + subItemClass);
        }
      });

      return;
    },
    Burn: function Burn(menu, type) {
      var items = menu.find('li').removeAttr('tabindex'),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('>li, .menu, .menu > li').removeClass(subMenuClass + ' ' + subItemClass + ' ' + hasSubClass + ' is-submenu-item submenu is-active').removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        if (cb && typeof cb === 'function') {
          cb();
        }
      }, remain);
      elem.trigger('timerstart.zf.' + nameSpace);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger('timerpaused.zf.' + nameSpace);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      if (this.complete) {
        singleImageLoaded();
      } else if (typeof this.naturalWidth !== 'undefined' && this.naturalWidth > 0) {
        singleImageLoaded();
      } else {
        $(this).one('load', function () {
          singleImageLoaded();
        });
      }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
'use strict';

//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

	$.spotSwipe = {
		version: '1.0.0',
		enabled: 'ontouchstart' in document.documentElement,
		preventDefault: false,
		moveThreshold: 75,
		timeThreshold: 200
	};

	var startPosX,
	    startPosY,
	    startTime,
	    elapsedTime,
	    isMoving = false;

	function onTouchEnd() {
		//  alert(this);
		this.removeEventListener('touchmove', onTouchMove);
		this.removeEventListener('touchend', onTouchEnd);
		isMoving = false;
	}

	function onTouchMove(e) {
		if ($.spotSwipe.preventDefault) {
			e.preventDefault();
		}
		if (isMoving) {
			var x = e.touches[0].pageX;
			var y = e.touches[0].pageY;
			var dx = startPosX - x;
			var dy = startPosY - y;
			var dir;
			elapsedTime = new Date().getTime() - startTime;
			if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
				dir = dx > 0 ? 'left' : 'right';
			}
			// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
			//   dir = dy > 0 ? 'down' : 'up';
			// }
			if (dir) {
				e.preventDefault();
				onTouchEnd.call(this);
				$(this).trigger('swipe', dir).trigger('swipe' + dir);
			}
		}
	}

	function onTouchStart(e) {
		if (e.touches.length == 1) {
			startPosX = e.touches[0].pageX;
			startPosY = e.touches[0].pageY;
			isMoving = true;
			startTime = new Date().getTime();
			this.addEventListener('touchmove', onTouchMove, false);
			this.addEventListener('touchend', onTouchEnd, false);
		}
	}

	function init() {
		this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
	}

	function teardown() {
		this.removeEventListener('touchstart', onTouchStart);
	}

	$.event.special.swipe = { setup: init };

	$.each(['left', 'up', 'down', 'right'], function () {
		$.event.special['swipe' + this] = { setup: function setup() {
				$(this).on('swipe', $.noop);
			} };
	});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
	$.fn.addTouch = function () {
		this.each(function (i, el) {
			$(el).bind('touchstart touchmove touchend touchcancel', function () {
				//we pass the original event object because the jQuery event
				//object is normalized to w3c specs and does not provide the TouchList
				handleTouch(event);
			});
		});

		var handleTouch = function handleTouch(event) {
			var touches = event.changedTouches,
			    first = touches[0],
			    eventTypes = {
				touchstart: 'mousedown',
				touchmove: 'mousemove',
				touchend: 'mouseup'
			},
			    type = eventTypes[event.type],
			    simulatedEvent;

			if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
				simulatedEvent = new window.MouseEvent(type, {
					'bubbles': true,
					'cancelable': true,
					'screenX': first.screenX,
					'screenY': first.screenY,
					'clientX': first.clientX,
					'clientY': first.clientY
				});
			} else {
				simulatedEvent = document.createEvent('MouseEvent');
				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
			}
			first.target.dispatchEvent(simulatedEvent);
		};
	};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

!function ($) {

  var MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i] + 'MutationObserver' in window) {
        return window[prefixes[i] + 'MutationObserver'];
      }
    }
    return false;
  }();

  var triggers = function triggers(el, type) {
    el.data(type).split(' ').forEach(function (id) {
      $('#' + id)[type === 'close' ? 'trigger' : 'triggerHandler'](type + '.zf.trigger', [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    var id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    triggers($(this), 'toggle');
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    var animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    var id = $(this).data('toggle-focus');
    $('#' + id).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).on('load', function () {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if ((typeof pluginName === 'undefined' ? 'undefined' : _typeof(pluginName)) === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      var listeners = plugNames.map(function (name) {
        return 'closeme.zf.' + name;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        var plugin = e.namespace.split('.')[0];
        var plugins = $('[data-' + plugin + ']').not('[data-yeti-box="' + pluginId + '"]');

        plugins.each(function () {
          var _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    var nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function listeningElementsMutation(mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);
      //trigger the event handler for the element depending on type
      switch ($target.attr("data-events")) {

        case "resize":
          $target.triggerHandler('resizeme.zf.trigger', [$target]);
          break;

        case "scroll":
          $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          break;

        // case "mutate" :
        // console.log('mutate', $target);
        // $target.triggerHandler('mutate.zf.trigger');
        //
        // //make sure we don't get stuck in an infinite loop from sloppy codeing
        // if ($target.index('[data-mutate]') == $("[data-mutate]").length-1) {
        //   domMutationObserver();
        // }
        // break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, (or coming soon mutation) add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        var elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: false, characterData: false, subtree: false, attributeFilter: ["data-events"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);

// function domMutationObserver(debounce) {
//   // !!! This is coming soon and needs more work; not active  !!! //
//   var timer,
//   nodes = document.querySelectorAll('[data-mutate]');
//   //
//   if (nodes.length) {
//     // var MutationObserver = (function () {
//     //   var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
//     //   for (var i=0; i < prefixes.length; i++) {
//     //     if (prefixes[i] + 'MutationObserver' in window) {
//     //       return window[prefixes[i] + 'MutationObserver'];
//     //     }
//     //   }
//     //   return false;
//     // }());
//
//
//     //for the body, we need to listen for all changes effecting the style and class attributes
//     var bodyObserver = new MutationObserver(bodyMutation);
//     bodyObserver.observe(document.body, { attributes: true, childList: true, characterData: false, subtree:true, attributeFilter:["style", "class"]});
//
//
//     //body callback
//     function bodyMutation(mutate) {
//       //trigger all listening elements and signal a mutation event
//       if (timer) { clearTimeout(timer); }
//
//       timer = setTimeout(function() {
//         bodyObserver.disconnect();
//         $('[data-mutate]').attr('data-events',"mutate");
//       }, debounce || 150);
//     }
//   }
// }
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * DropdownMenu module.
   * @module foundation.dropdown-menu
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.nest
   */

  var DropdownMenu = function () {
    /**
     * Creates a new instance of DropdownMenu.
     * @class
     * @fires DropdownMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function DropdownMenu(element, options) {
      _classCallCheck(this, DropdownMenu);

      this.$element = element;
      this.options = $.extend({}, DropdownMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'dropdown');
      this._init();

      Foundation.registerPlugin(this, 'DropdownMenu');
      Foundation.Keyboard.register('DropdownMenu', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin, and calls _prepareMenu
     * @private
     * @function
     */


    _createClass(DropdownMenu, [{
      key: '_init',
      value: function _init() {
        var subs = this.$element.find('li.is-dropdown-submenu-parent');
        this.$element.children('.is-dropdown-submenu-parent').children('.is-dropdown-submenu').addClass('first-sub');

        this.$menuItems = this.$element.find('[role="menuitem"]');
        this.$tabs = this.$element.children('[role="menuitem"]');
        this.$tabs.find('ul.is-dropdown-submenu').addClass(this.options.verticalClass);

        if (this.$element.hasClass(this.options.rightClass) || this.options.alignment === 'right' || Foundation.rtl() || this.$element.parents('.top-bar-right').is('*')) {
          this.options.alignment = 'right';
          subs.addClass('opens-left');
        } else {
          subs.addClass('opens-right');
        }
        this.changed = false;
        this._events();
      }
    }, {
      key: '_isVertical',
      value: function _isVertical() {
        return this.$tabs.css('display') === 'block';
      }

      /**
       * Adds event listeners to elements within the menu
       * @private
       * @function
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            hasTouch = 'ontouchstart' in window || typeof window.ontouchstart !== 'undefined',
            parClass = 'is-dropdown-submenu-parent';

        // used for onClick and in the keyboard handlers
        var handleClickFn = function handleClickFn(e) {
          var $elem = $(e.target).parentsUntil('ul', '.' + parClass),
              hasSub = $elem.hasClass(parClass),
              hasClicked = $elem.attr('data-is-click') === 'true',
              $sub = $elem.children('.is-dropdown-submenu');

          if (hasSub) {
            if (hasClicked) {
              if (!_this.options.closeOnClick || !_this.options.clickOpen && !hasTouch || _this.options.forceFollow && hasTouch) {
                return;
              } else {
                e.stopImmediatePropagation();
                e.preventDefault();
                _this._hide($elem);
              }
            } else {
              e.preventDefault();
              e.stopImmediatePropagation();
              _this._show($sub);
              $elem.add($elem.parentsUntil(_this.$element, '.' + parClass)).attr('data-is-click', true);
            }
          } else {
            if (_this.options.closeOnClickInside) {
              _this._hide($elem);
            }
            return;
          }
        };

        if (this.options.clickOpen || hasTouch) {
          this.$menuItems.on('click.zf.dropdownmenu touchstart.zf.dropdownmenu', handleClickFn);
        }

        if (!this.options.disableHover) {
          this.$menuItems.on('mouseenter.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);

            if (hasSub) {
              clearTimeout(_this.delay);
              _this.delay = setTimeout(function () {
                _this._show($elem.children('.is-dropdown-submenu'));
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (hasSub && _this.options.autoclose) {
              if ($elem.attr('data-is-click') === 'true' && _this.options.clickOpen) {
                return false;
              }

              clearTimeout(_this.delay);
              _this.delay = setTimeout(function () {
                _this._hide($elem);
              }, _this.options.closingTime);
            }
          });
        }
        this.$menuItems.on('keydown.zf.dropdownmenu', function (e) {
          var $element = $(e.target).parentsUntil('ul', '[role="menuitem"]'),
              isTab = _this.$tabs.index($element) > -1,
              $elements = isTab ? _this.$tabs : $element.siblings('li').add($element),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(i - 1);
              $nextElement = $elements.eq(i + 1);
              return;
            }
          });

          var nextSibling = function nextSibling() {
            if (!$element.is(':last-child')) {
              $nextElement.children('a:first').focus();
              e.preventDefault();
            }
          },
              prevSibling = function prevSibling() {
            $prevElement.children('a:first').focus();
            e.preventDefault();
          },
              openSub = function openSub() {
            var $sub = $element.children('ul.is-dropdown-submenu');
            if ($sub.length) {
              _this._show($sub);
              $element.find('li > a:first').focus();
              e.preventDefault();
            } else {
              return;
            }
          },
              closeSub = function closeSub() {
            //if ($element.is(':first-child')) {
            var close = $element.parent('ul').parent('li');
            close.children('a:first').focus();
            _this._hide(close);
            e.preventDefault();
            //}
          };
          var functions = {
            open: openSub,
            close: function close() {
              _this._hide(_this.$element);
              _this.$menuItems.find('a:first').focus(); // focus to first element
              e.preventDefault();
            },
            handled: function handled() {
              e.stopImmediatePropagation();
            }
          };

          if (isTab) {
            if (_this._isVertical()) {
              // vertical menu
              if (Foundation.rtl()) {
                // right aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: closeSub,
                  previous: openSub
                });
              } else {
                // left aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: openSub,
                  previous: closeSub
                });
              }
            } else {
              // horizontal menu
              if (Foundation.rtl()) {
                // right aligned
                $.extend(functions, {
                  next: prevSibling,
                  previous: nextSibling,
                  down: openSub,
                  up: closeSub
                });
              } else {
                // left aligned
                $.extend(functions, {
                  next: nextSibling,
                  previous: prevSibling,
                  down: openSub,
                  up: closeSub
                });
              }
            }
          } else {
            // not tabs -> one sub
            if (Foundation.rtl()) {
              // right aligned
              $.extend(functions, {
                next: closeSub,
                previous: openSub,
                down: nextSibling,
                up: prevSibling
              });
            } else {
              // left aligned
              $.extend(functions, {
                next: openSub,
                previous: closeSub,
                down: nextSibling,
                up: prevSibling
              });
            }
          }
          Foundation.Keyboard.handleKey(e, 'DropdownMenu', functions);
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body),
            _this = this;
        $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu').on('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
          var $link = _this.$element.find(e.target);
          if ($link.length) {
            return;
          }

          _this._hide();
          $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu');
        });
      }

      /**
       * Opens a dropdown pane, and checks for collisions first.
       * @param {jQuery} $sub - ul element that is a submenu to show
       * @function
       * @private
       * @fires DropdownMenu#show
       */

    }, {
      key: '_show',
      value: function _show($sub) {
        var idx = this.$tabs.index(this.$tabs.filter(function (i, el) {
          return $(el).find($sub).length > 0;
        }));
        var $sibs = $sub.parent('li.is-dropdown-submenu-parent').siblings('li.is-dropdown-submenu-parent');
        this._hide($sibs, idx);
        $sub.css('visibility', 'hidden').addClass('js-dropdown-active').attr({ 'aria-hidden': false }).parent('li.is-dropdown-submenu-parent').addClass('is-active').attr({ 'aria-expanded': true });
        var clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
        if (!clear) {
          var oldClass = this.options.alignment === 'left' ? '-right' : '-left',
              $parentLi = $sub.parent('.is-dropdown-submenu-parent');
          $parentLi.removeClass('opens' + oldClass).addClass('opens-' + this.options.alignment);
          clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
          if (!clear) {
            $parentLi.removeClass('opens-' + this.options.alignment).addClass('opens-inner');
          }
          this.changed = true;
        }
        $sub.css('visibility', '');
        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }
        /**
         * Fires when the new dropdown pane is visible.
         * @event DropdownMenu#show
         */
        this.$element.trigger('show.zf.dropdownmenu', [$sub]);
      }

      /**
       * Hides a single, currently open dropdown pane, if passed a parameter, otherwise, hides everything.
       * @function
       * @param {jQuery} $elem - element with a submenu to hide
       * @param {Number} idx - index of the $tabs collection to hide
       * @private
       */

    }, {
      key: '_hide',
      value: function _hide($elem, idx) {
        var $toClose;
        if ($elem && $elem.length) {
          $toClose = $elem;
        } else if (idx !== undefined) {
          $toClose = this.$tabs.not(function (i, el) {
            return i === idx;
          });
        } else {
          $toClose = this.$element;
        }
        var somethingToClose = $toClose.hasClass('is-active') || $toClose.find('.is-active').length > 0;

        if (somethingToClose) {
          $toClose.find('li.is-active').add($toClose).attr({
            'aria-expanded': false,
            'data-is-click': false
          }).removeClass('is-active');

          $toClose.find('ul.js-dropdown-active').attr({
            'aria-hidden': true
          }).removeClass('js-dropdown-active');

          if (this.changed || $toClose.find('opens-inner').length) {
            var oldClass = this.options.alignment === 'left' ? 'right' : 'left';
            $toClose.find('li.is-dropdown-submenu-parent').add($toClose).removeClass('opens-inner opens-' + this.options.alignment).addClass('opens-' + oldClass);
            this.changed = false;
          }
          /**
           * Fires when the open menus are closed.
           * @event DropdownMenu#hide
           */
          this.$element.trigger('hide.zf.dropdownmenu', [$toClose]);
        }
      }

      /**
       * Destroys the plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$menuItems.off('.zf.dropdownmenu').removeAttr('data-is-click').removeClass('is-right-arrow is-left-arrow is-down-arrow opens-right opens-left opens-inner');
        $(document.body).off('.zf.dropdownmenu');
        Foundation.Nest.Burn(this.$element, 'dropdown');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return DropdownMenu;
  }();

  /**
   * Default settings for plugin
   */


  DropdownMenu.defaults = {
    /**
     * Disallows hover events from opening submenus
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Allow a submenu to automatically close on a mouseleave event, if not clicked open.
     * @option
     * @example true
     */
    autoclose: true,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 50
     */
    hoverDelay: 50,
    /**
     * Allow a submenu to open/remain open on parent click event. Allows cursor to move away from menu.
     * @option
     * @example true
     */
    clickOpen: false,
    /**
     * Amount of time to delay closing a submenu on a mouseleave event.
     * @option
     * @example 500
     */

    closingTime: 500,
    /**
     * Position of the menu relative to what direction the submenus should open. Handled by JS.
     * @option
     * @example 'left'
     */
    alignment: 'left',
    /**
     * Allow clicks on the body to close any open submenus.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allow clicks on leaf anchor links to close any open submenus.
     * @option
     * @example true
     */
    closeOnClickInside: true,
    /**
     * Class applied to vertical oriented menus, Foundation default is `vertical`. Update this if using your own class.
     * @option
     * @example 'vertical'
     */
    verticalClass: 'vertical',
    /**
     * Class applied to right-side oriented menus, Foundation default is `align-right`. Update this if using your own class.
     * @option
     * @example 'align-right'
     */
    rightClass: 'align-right',
    /**
     * Boolean to force overide the clicking of links to perform default action, on second touch event for mobile.
     * @option
     * @example false
     */
    forceFollow: true
  };

  // Window exports
  Foundation.plugin(DropdownMenu, 'DropdownMenu');
}(jQuery);
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  var OffCanvas = function () {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function OffCanvas(element, options) {
      _classCallCheck(this, OffCanvas);

      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
      Foundation.Keyboard.register('OffCanvas', {
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */


    _createClass(OffCanvas, [{
      key: '_init',
      value: function _init() {
        var id = this.$element.attr('id');

        this.$element.attr('aria-hidden', 'true');

        // Find triggers that affect this element and add aria-expanded to them
        this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

        // Add a close trigger over the body if necessary
        if (this.options.closeOnClick) {
          if ($('.js-off-canvas-exit').length) {
            this.$exiter = $('.js-off-canvas-exit');
          } else {
            var exiter = document.createElement('div');
            exiter.setAttribute('class', 'js-off-canvas-exit');
            $('[data-off-canvas-content]').append(exiter);

            this.$exiter = $(exiter);
          }
        }

        this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

        if (this.options.isRevealed) {
          this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
          this._setMQChecker();
        }
        if (!this.options.transitionTime) {
          this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas-wrapper]')[0]).transitionDuration) * 1000;
        }
      }

      /**
       * Adds event handlers to the off-canvas wrapper and the exit overlay.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('.zf.trigger .zf.offcanvas').on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
        });

        if (this.options.closeOnClick && this.$exiter.length) {
          this.$exiter.on({ 'click.zf.offcanvas': this.close.bind(this) });
        }
      }

      /**
       * Applies event listener for elements that will reveal at certain breakpoints.
       * @private
       */

    }, {
      key: '_setMQChecker',
      value: function _setMQChecker() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          } else {
            _this.reveal(false);
          }
        }).one('load.zf.offcanvas', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          }
        });
      }

      /**
       * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
       * @param {Boolean} isRevealed - true if element should be revealed.
       * @function
       */

    }, {
      key: 'reveal',
      value: function reveal(isRevealed) {
        var $closer = this.$element.find('[data-close]');
        if (isRevealed) {
          this.close();
          this.isRevealed = true;
          // if (!this.options.forceTop) {
          //   var scrollPos = parseInt(window.pageYOffset);
          //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
          // }
          // if (this.options.isSticky) { this._stick(); }
          this.$element.off('open.zf.trigger toggle.zf.trigger');
          if ($closer.length) {
            $closer.hide();
          }
        } else {
          this.isRevealed = false;
          // if (this.options.isSticky || !this.options.forceTop) {
          //   this.$element[0].style.transform = '';
          //   $(window).off('scroll.zf.offcanvas');
          // }
          this.$element.on({
            'open.zf.trigger': this.open.bind(this),
            'toggle.zf.trigger': this.toggle.bind(this)
          });
          if ($closer.length) {
            $closer.show();
          }
        }
      }

      /**
       * Opens the off-canvas menu.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       * @fires OffCanvas#opened
       */

    }, {
      key: 'open',
      value: function open(event, trigger) {
        if (this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }
        var _this = this,
            $body = $(document.body);

        if (this.options.forceTop) {
          $('body').scrollTop(0);
        }
        // window.pageYOffset = 0;

        // if (!this.options.forceTop) {
        //   var scrollPos = parseInt(window.pageYOffset);
        //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
        //   if (this.$exiter.length) {
        //     this.$exiter[0].style.transform = 'translate(0,' + scrollPos + 'px)';
        //   }
        // }
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#opened
         */

        var $wrapper = $('[data-off-canvas-wrapper]');
        $wrapper.addClass('is-off-canvas-open is-open-' + _this.options.position);

        _this.$element.addClass('is-open');

        // if (_this.options.isSticky) {
        //   _this._stick();
        // }

        this.$triggers.attr('aria-expanded', 'true');
        this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

        if (this.options.closeOnClick) {
          this.$exiter.addClass('is-visible');
        }

        if (trigger) {
          this.$lastTrigger = trigger;
        }

        if (this.options.autoFocus) {
          $wrapper.one(Foundation.transitionend($wrapper), function () {
            if (_this.$element.hasClass('is-open')) {
              // handle double clicks
              _this.$element.attr('tabindex', '-1');
              _this.$element.focus();
            }
          });
        }

        if (this.options.trapFocus) {
          $wrapper.one(Foundation.transitionend($wrapper), function () {
            if (_this.$element.hasClass('is-open')) {
              // handle double clicks
              _this.$element.attr('tabindex', '-1');
              _this.trapFocus();
            }
          });
        }
      }

      /**
       * Traps focus within the offcanvas on open.
       * @private
       */

    }, {
      key: '_trapFocus',
      value: function _trapFocus() {
        var focusable = Foundation.Keyboard.findFocusable(this.$element),
            first = focusable.eq(0),
            last = focusable.eq(-1);

        focusable.off('.zf.offcanvas').on('keydown.zf.offcanvas', function (e) {
          var key = Foundation.Keyboard.parseKey(e);
          if (key === 'TAB' && e.target === last[0]) {
            e.preventDefault();
            first.focus();
          }
          if (key === 'SHIFT_TAB' && e.target === first[0]) {
            e.preventDefault();
            last.focus();
          }
        });
      }

      /**
       * Allows the offcanvas to appear sticky utilizing translate properties.
       * @private
       */
      // OffCanvas.prototype._stick = function() {
      //   var elStyle = this.$element[0].style;
      //
      //   if (this.options.closeOnClick) {
      //     var exitStyle = this.$exiter[0].style;
      //   }
      //
      //   $(window).on('scroll.zf.offcanvas', function(e) {
      //     console.log(e);
      //     var pageY = window.pageYOffset;
      //     elStyle.transform = 'translate(0,' + pageY + 'px)';
      //     if (exitStyle !== undefined) { exitStyle.transform = 'translate(0,' + pageY + 'px)'; }
      //   });
      //   // this.$element.trigger('stuck.zf.offcanvas');
      // };
      /**
       * Closes the off-canvas menu.
       * @function
       * @param {Function} cb - optional cb to fire after closure.
       * @fires OffCanvas#closed
       */

    }, {
      key: 'close',
      value: function close(cb) {
        if (!this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }

        var _this = this;

        //  Foundation.Move(this.options.transitionTime, this.$element, function() {
        $('[data-off-canvas-wrapper]').removeClass('is-off-canvas-open is-open-' + _this.options.position);
        _this.$element.removeClass('is-open');
        // Foundation._reflow();
        // });
        this.$element.attr('aria-hidden', 'true')
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#closed
         */
        .trigger('closed.zf.offcanvas');
        // if (_this.options.isSticky || !_this.options.forceTop) {
        //   setTimeout(function() {
        //     _this.$element[0].style.transform = '';
        //     $(window).off('scroll.zf.offcanvas');
        //   }, this.options.transitionTime);
        // }
        if (this.options.closeOnClick) {
          this.$exiter.removeClass('is-visible');
        }

        this.$triggers.attr('aria-expanded', 'false');
        if (this.options.trapFocus) {
          $('[data-off-canvas-content]').removeAttr('tabindex');
        }
      }

      /**
       * Toggles the off-canvas menu open or closed.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       */

    }, {
      key: 'toggle',
      value: function toggle(event, trigger) {
        if (this.$element.hasClass('is-open')) {
          this.close(event, trigger);
        } else {
          this.open(event, trigger);
        }
      }

      /**
       * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
       * @function
       * @private
       */

    }, {
      key: '_handleKeyboard',
      value: function _handleKeyboard(e) {
        var _this2 = this;

        Foundation.Keyboard.handleKey(e, 'OffCanvas', {
          close: function close() {
            _this2.close();
            _this2.$lastTrigger.focus();
            return true;
          },
          handled: function handled() {
            e.stopPropagation();
            e.preventDefault();
          }
        });
      }

      /**
       * Destroys the offcanvas plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.close();
        this.$element.off('.zf.trigger .zf.offcanvas');
        this.$exiter.off('.zf.offcanvas');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return OffCanvas;
  }();

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @example true
     */
    closeOnClick: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @example 500
     */
    transitionTime: 0,

    /**
     * Direction the offcanvas opens from. Determines class applied to body.
     * @option
     * @example left
     */
    position: 'left',

    /**
     * Force the page to scroll to top on open.
     * @option
     * @example true
     */
    forceTop: true,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @example false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @example reveal-for-large
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @example true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * TODO improve the regex testing for this.
     * @example reveal-for-large
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @example true
     */
    trapFocus: false
  };

  // Window exports
  Foundation.plugin(OffCanvas, 'OffCanvas');
}(jQuery);
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.6.0
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues

 */
!function (a) {
  "use strict";
  "function" == typeof define && define.amd ? define(["jquery"], a) : "undefined" != typeof exports ? module.exports = a(require("jquery")) : a(jQuery);
}(function (a) {
  "use strict";
  var b = window.Slick || {};b = function () {
    function c(c, d) {
      var f,
          e = this;e.defaults = { accessibility: !0, adaptiveHeight: !1, appendArrows: a(c), appendDots: a(c), arrows: !0, asNavFor: null, prevArrow: '<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button">Previous</button>', nextArrow: '<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button">Next</button>', autoplay: !1, autoplaySpeed: 3e3, centerMode: !1, centerPadding: "50px", cssEase: "ease", customPaging: function customPaging(b, c) {
          return a('<button type="button" data-role="none" role="button" tabindex="0" />').text(c + 1);
        }, dots: !1, dotsClass: "slick-dots", draggable: !0, easing: "linear", edgeFriction: .35, fade: !1, focusOnSelect: !1, infinite: !0, initialSlide: 0, lazyLoad: "ondemand", mobileFirst: !1, pauseOnHover: !0, pauseOnFocus: !0, pauseOnDotsHover: !1, respondTo: "window", responsive: null, rows: 1, rtl: !1, slide: "", slidesPerRow: 1, slidesToShow: 1, slidesToScroll: 1, speed: 500, swipe: !0, swipeToSlide: !1, touchMove: !0, touchThreshold: 5, useCSS: !0, useTransform: !0, variableWidth: !1, vertical: !1, verticalSwiping: !1, waitForAnimate: !0, zIndex: 1e3 }, e.initials = { animating: !1, dragging: !1, autoPlayTimer: null, currentDirection: 0, currentLeft: null, currentSlide: 0, direction: 1, $dots: null, listWidth: null, listHeight: null, loadIndex: 0, $nextArrow: null, $prevArrow: null, slideCount: null, slideWidth: null, $slideTrack: null, $slides: null, sliding: !1, slideOffset: 0, swipeLeft: null, $list: null, touchObject: {}, transformsEnabled: !1, unslicked: !1 }, a.extend(e, e.initials), e.activeBreakpoint = null, e.animType = null, e.animProp = null, e.breakpoints = [], e.breakpointSettings = [], e.cssTransitions = !1, e.focussed = !1, e.interrupted = !1, e.hidden = "hidden", e.paused = !0, e.positionProp = null, e.respondTo = null, e.rowCount = 1, e.shouldClick = !0, e.$slider = a(c), e.$slidesCache = null, e.transformType = null, e.transitionType = null, e.visibilityChange = "visibilitychange", e.windowWidth = 0, e.windowTimer = null, f = a(c).data("slick") || {}, e.options = a.extend({}, e.defaults, d, f), e.currentSlide = e.options.initialSlide, e.originalSettings = e.options, "undefined" != typeof document.mozHidden ? (e.hidden = "mozHidden", e.visibilityChange = "mozvisibilitychange") : "undefined" != typeof document.webkitHidden && (e.hidden = "webkitHidden", e.visibilityChange = "webkitvisibilitychange"), e.autoPlay = a.proxy(e.autoPlay, e), e.autoPlayClear = a.proxy(e.autoPlayClear, e), e.autoPlayIterator = a.proxy(e.autoPlayIterator, e), e.changeSlide = a.proxy(e.changeSlide, e), e.clickHandler = a.proxy(e.clickHandler, e), e.selectHandler = a.proxy(e.selectHandler, e), e.setPosition = a.proxy(e.setPosition, e), e.swipeHandler = a.proxy(e.swipeHandler, e), e.dragHandler = a.proxy(e.dragHandler, e), e.keyHandler = a.proxy(e.keyHandler, e), e.instanceUid = b++, e.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/, e.registerBreakpoints(), e.init(!0);
    }var b = 0;return c;
  }(), b.prototype.activateADA = function () {
    var a = this;a.$slideTrack.find(".slick-active").attr({ "aria-hidden": "false" }).find("a, input, button, select").attr({ tabindex: "0" });
  }, b.prototype.addSlide = b.prototype.slickAdd = function (b, c, d) {
    var e = this;if ("boolean" == typeof c) d = c, c = null;else if (0 > c || c >= e.slideCount) return !1;e.unload(), "number" == typeof c ? 0 === c && 0 === e.$slides.length ? a(b).appendTo(e.$slideTrack) : d ? a(b).insertBefore(e.$slides.eq(c)) : a(b).insertAfter(e.$slides.eq(c)) : d === !0 ? a(b).prependTo(e.$slideTrack) : a(b).appendTo(e.$slideTrack), e.$slides = e.$slideTrack.children(this.options.slide), e.$slideTrack.children(this.options.slide).detach(), e.$slideTrack.append(e.$slides), e.$slides.each(function (b, c) {
      a(c).attr("data-slick-index", b);
    }), e.$slidesCache = e.$slides, e.reinit();
  }, b.prototype.animateHeight = function () {
    var a = this;if (1 === a.options.slidesToShow && a.options.adaptiveHeight === !0 && a.options.vertical === !1) {
      var b = a.$slides.eq(a.currentSlide).outerHeight(!0);a.$list.animate({ height: b }, a.options.speed);
    }
  }, b.prototype.animateSlide = function (b, c) {
    var d = {},
        e = this;e.animateHeight(), e.options.rtl === !0 && e.options.vertical === !1 && (b = -b), e.transformsEnabled === !1 ? e.options.vertical === !1 ? e.$slideTrack.animate({ left: b }, e.options.speed, e.options.easing, c) : e.$slideTrack.animate({ top: b }, e.options.speed, e.options.easing, c) : e.cssTransitions === !1 ? (e.options.rtl === !0 && (e.currentLeft = -e.currentLeft), a({ animStart: e.currentLeft }).animate({ animStart: b }, { duration: e.options.speed, easing: e.options.easing, step: function step(a) {
        a = Math.ceil(a), e.options.vertical === !1 ? (d[e.animType] = "translate(" + a + "px, 0px)", e.$slideTrack.css(d)) : (d[e.animType] = "translate(0px," + a + "px)", e.$slideTrack.css(d));
      }, complete: function complete() {
        c && c.call();
      } })) : (e.applyTransition(), b = Math.ceil(b), e.options.vertical === !1 ? d[e.animType] = "translate3d(" + b + "px, 0px, 0px)" : d[e.animType] = "translate3d(0px," + b + "px, 0px)", e.$slideTrack.css(d), c && setTimeout(function () {
      e.disableTransition(), c.call();
    }, e.options.speed));
  }, b.prototype.getNavTarget = function () {
    var b = this,
        c = b.options.asNavFor;return c && null !== c && (c = a(c).not(b.$slider)), c;
  }, b.prototype.asNavFor = function (b) {
    var c = this,
        d = c.getNavTarget();null !== d && "object" == (typeof d === "undefined" ? "undefined" : _typeof(d)) && d.each(function () {
      var c = a(this).slick("getSlick");c.unslicked || c.slideHandler(b, !0);
    });
  }, b.prototype.applyTransition = function (a) {
    var b = this,
        c = {};b.options.fade === !1 ? c[b.transitionType] = b.transformType + " " + b.options.speed + "ms " + b.options.cssEase : c[b.transitionType] = "opacity " + b.options.speed + "ms " + b.options.cssEase, b.options.fade === !1 ? b.$slideTrack.css(c) : b.$slides.eq(a).css(c);
  }, b.prototype.autoPlay = function () {
    var a = this;a.autoPlayClear(), a.slideCount > a.options.slidesToShow && (a.autoPlayTimer = setInterval(a.autoPlayIterator, a.options.autoplaySpeed));
  }, b.prototype.autoPlayClear = function () {
    var a = this;a.autoPlayTimer && clearInterval(a.autoPlayTimer);
  }, b.prototype.autoPlayIterator = function () {
    var a = this,
        b = a.currentSlide + a.options.slidesToScroll;a.paused || a.interrupted || a.focussed || (a.options.infinite === !1 && (1 === a.direction && a.currentSlide + 1 === a.slideCount - 1 ? a.direction = 0 : 0 === a.direction && (b = a.currentSlide - a.options.slidesToScroll, a.currentSlide - 1 === 0 && (a.direction = 1))), a.slideHandler(b));
  }, b.prototype.buildArrows = function () {
    var b = this;b.options.arrows === !0 && (b.$prevArrow = a(b.options.prevArrow).addClass("slick-arrow"), b.$nextArrow = a(b.options.nextArrow).addClass("slick-arrow"), b.slideCount > b.options.slidesToShow ? (b.$prevArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), b.$nextArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), b.htmlExpr.test(b.options.prevArrow) && b.$prevArrow.prependTo(b.options.appendArrows), b.htmlExpr.test(b.options.nextArrow) && b.$nextArrow.appendTo(b.options.appendArrows), b.options.infinite !== !0 && b.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true")) : b.$prevArrow.add(b.$nextArrow).addClass("slick-hidden").attr({ "aria-disabled": "true", tabindex: "-1" }));
  }, b.prototype.buildDots = function () {
    var c,
        d,
        b = this;if (b.options.dots === !0 && b.slideCount > b.options.slidesToShow) {
      for (b.$slider.addClass("slick-dotted"), d = a("<ul />").addClass(b.options.dotsClass), c = 0; c <= b.getDotCount(); c += 1) {
        d.append(a("<li />").append(b.options.customPaging.call(this, b, c)));
      }b.$dots = d.appendTo(b.options.appendDots), b.$dots.find("li").first().addClass("slick-active").attr("aria-hidden", "false");
    }
  }, b.prototype.buildOut = function () {
    var b = this;b.$slides = b.$slider.children(b.options.slide + ":not(.slick-cloned)").addClass("slick-slide"), b.slideCount = b.$slides.length, b.$slides.each(function (b, c) {
      a(c).attr("data-slick-index", b).data("originalStyling", a(c).attr("style") || "");
    }), b.$slider.addClass("slick-slider"), b.$slideTrack = 0 === b.slideCount ? a('<div class="slick-track"/>').appendTo(b.$slider) : b.$slides.wrapAll('<div class="slick-track"/>').parent(), b.$list = b.$slideTrack.wrap('<div aria-live="polite" class="slick-list"/>').parent(), b.$slideTrack.css("opacity", 0), (b.options.centerMode === !0 || b.options.swipeToSlide === !0) && (b.options.slidesToScroll = 1), a("img[data-lazy]", b.$slider).not("[src]").addClass("slick-loading"), b.setupInfinite(), b.buildArrows(), b.buildDots(), b.updateDots(), b.setSlideClasses("number" == typeof b.currentSlide ? b.currentSlide : 0), b.options.draggable === !0 && b.$list.addClass("draggable");
  }, b.prototype.buildRows = function () {
    var b,
        c,
        d,
        e,
        f,
        g,
        h,
        a = this;if (e = document.createDocumentFragment(), g = a.$slider.children(), a.options.rows > 1) {
      for (h = a.options.slidesPerRow * a.options.rows, f = Math.ceil(g.length / h), b = 0; f > b; b++) {
        var i = document.createElement("div");for (c = 0; c < a.options.rows; c++) {
          var j = document.createElement("div");for (d = 0; d < a.options.slidesPerRow; d++) {
            var k = b * h + (c * a.options.slidesPerRow + d);g.get(k) && j.appendChild(g.get(k));
          }i.appendChild(j);
        }e.appendChild(i);
      }a.$slider.empty().append(e), a.$slider.children().children().children().css({ width: 100 / a.options.slidesPerRow + "%", display: "inline-block" });
    }
  }, b.prototype.checkResponsive = function (b, c) {
    var e,
        f,
        g,
        d = this,
        h = !1,
        i = d.$slider.width(),
        j = window.innerWidth || a(window).width();if ("window" === d.respondTo ? g = j : "slider" === d.respondTo ? g = i : "min" === d.respondTo && (g = Math.min(j, i)), d.options.responsive && d.options.responsive.length && null !== d.options.responsive) {
      f = null;for (e in d.breakpoints) {
        d.breakpoints.hasOwnProperty(e) && (d.originalSettings.mobileFirst === !1 ? g < d.breakpoints[e] && (f = d.breakpoints[e]) : g > d.breakpoints[e] && (f = d.breakpoints[e]));
      }null !== f ? null !== d.activeBreakpoint ? (f !== d.activeBreakpoint || c) && (d.activeBreakpoint = f, "unslick" === d.breakpointSettings[f] ? d.unslick(f) : (d.options = a.extend({}, d.originalSettings, d.breakpointSettings[f]), b === !0 && (d.currentSlide = d.options.initialSlide), d.refresh(b)), h = f) : (d.activeBreakpoint = f, "unslick" === d.breakpointSettings[f] ? d.unslick(f) : (d.options = a.extend({}, d.originalSettings, d.breakpointSettings[f]), b === !0 && (d.currentSlide = d.options.initialSlide), d.refresh(b)), h = f) : null !== d.activeBreakpoint && (d.activeBreakpoint = null, d.options = d.originalSettings, b === !0 && (d.currentSlide = d.options.initialSlide), d.refresh(b), h = f), b || h === !1 || d.$slider.trigger("breakpoint", [d, h]);
    }
  }, b.prototype.changeSlide = function (b, c) {
    var f,
        g,
        h,
        d = this,
        e = a(b.currentTarget);switch (e.is("a") && b.preventDefault(), e.is("li") || (e = e.closest("li")), h = d.slideCount % d.options.slidesToScroll !== 0, f = h ? 0 : (d.slideCount - d.currentSlide) % d.options.slidesToScroll, b.data.message) {case "previous":
        g = 0 === f ? d.options.slidesToScroll : d.options.slidesToShow - f, d.slideCount > d.options.slidesToShow && d.slideHandler(d.currentSlide - g, !1, c);break;case "next":
        g = 0 === f ? d.options.slidesToScroll : f, d.slideCount > d.options.slidesToShow && d.slideHandler(d.currentSlide + g, !1, c);break;case "index":
        var i = 0 === b.data.index ? 0 : b.data.index || e.index() * d.options.slidesToScroll;d.slideHandler(d.checkNavigable(i), !1, c), e.children().trigger("focus");break;default:
        return;}
  }, b.prototype.checkNavigable = function (a) {
    var c,
        d,
        b = this;if (c = b.getNavigableIndexes(), d = 0, a > c[c.length - 1]) a = c[c.length - 1];else for (var e in c) {
      if (a < c[e]) {
        a = d;break;
      }d = c[e];
    }return a;
  }, b.prototype.cleanUpEvents = function () {
    var b = this;b.options.dots && null !== b.$dots && a("li", b.$dots).off("click.slick", b.changeSlide).off("mouseenter.slick", a.proxy(b.interrupt, b, !0)).off("mouseleave.slick", a.proxy(b.interrupt, b, !1)), b.$slider.off("focus.slick blur.slick"), b.options.arrows === !0 && b.slideCount > b.options.slidesToShow && (b.$prevArrow && b.$prevArrow.off("click.slick", b.changeSlide), b.$nextArrow && b.$nextArrow.off("click.slick", b.changeSlide)), b.$list.off("touchstart.slick mousedown.slick", b.swipeHandler), b.$list.off("touchmove.slick mousemove.slick", b.swipeHandler), b.$list.off("touchend.slick mouseup.slick", b.swipeHandler), b.$list.off("touchcancel.slick mouseleave.slick", b.swipeHandler), b.$list.off("click.slick", b.clickHandler), a(document).off(b.visibilityChange, b.visibility), b.cleanUpSlideEvents(), b.options.accessibility === !0 && b.$list.off("keydown.slick", b.keyHandler), b.options.focusOnSelect === !0 && a(b.$slideTrack).children().off("click.slick", b.selectHandler), a(window).off("orientationchange.slick.slick-" + b.instanceUid, b.orientationChange), a(window).off("resize.slick.slick-" + b.instanceUid, b.resize), a("[draggable!=true]", b.$slideTrack).off("dragstart", b.preventDefault), a(window).off("load.slick.slick-" + b.instanceUid, b.setPosition), a(document).off("ready.slick.slick-" + b.instanceUid, b.setPosition);
  }, b.prototype.cleanUpSlideEvents = function () {
    var b = this;b.$list.off("mouseenter.slick", a.proxy(b.interrupt, b, !0)), b.$list.off("mouseleave.slick", a.proxy(b.interrupt, b, !1));
  }, b.prototype.cleanUpRows = function () {
    var b,
        a = this;a.options.rows > 1 && (b = a.$slides.children().children(), b.removeAttr("style"), a.$slider.empty().append(b));
  }, b.prototype.clickHandler = function (a) {
    var b = this;b.shouldClick === !1 && (a.stopImmediatePropagation(), a.stopPropagation(), a.preventDefault());
  }, b.prototype.destroy = function (b) {
    var c = this;c.autoPlayClear(), c.touchObject = {}, c.cleanUpEvents(), a(".slick-cloned", c.$slider).detach(), c.$dots && c.$dots.remove(), c.$prevArrow && c.$prevArrow.length && (c.$prevArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), c.htmlExpr.test(c.options.prevArrow) && c.$prevArrow.remove()), c.$nextArrow && c.$nextArrow.length && (c.$nextArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), c.htmlExpr.test(c.options.nextArrow) && c.$nextArrow.remove()), c.$slides && (c.$slides.removeClass("slick-slide slick-active slick-center slick-visible slick-current").removeAttr("aria-hidden").removeAttr("data-slick-index").each(function () {
      a(this).attr("style", a(this).data("originalStyling"));
    }), c.$slideTrack.children(this.options.slide).detach(), c.$slideTrack.detach(), c.$list.detach(), c.$slider.append(c.$slides)), c.cleanUpRows(), c.$slider.removeClass("slick-slider"), c.$slider.removeClass("slick-initialized"), c.$slider.removeClass("slick-dotted"), c.unslicked = !0, b || c.$slider.trigger("destroy", [c]);
  }, b.prototype.disableTransition = function (a) {
    var b = this,
        c = {};c[b.transitionType] = "", b.options.fade === !1 ? b.$slideTrack.css(c) : b.$slides.eq(a).css(c);
  }, b.prototype.fadeSlide = function (a, b) {
    var c = this;c.cssTransitions === !1 ? (c.$slides.eq(a).css({ zIndex: c.options.zIndex }), c.$slides.eq(a).animate({ opacity: 1 }, c.options.speed, c.options.easing, b)) : (c.applyTransition(a), c.$slides.eq(a).css({ opacity: 1, zIndex: c.options.zIndex }), b && setTimeout(function () {
      c.disableTransition(a), b.call();
    }, c.options.speed));
  }, b.prototype.fadeSlideOut = function (a) {
    var b = this;b.cssTransitions === !1 ? b.$slides.eq(a).animate({ opacity: 0, zIndex: b.options.zIndex - 2 }, b.options.speed, b.options.easing) : (b.applyTransition(a), b.$slides.eq(a).css({ opacity: 0, zIndex: b.options.zIndex - 2 }));
  }, b.prototype.filterSlides = b.prototype.slickFilter = function (a) {
    var b = this;null !== a && (b.$slidesCache = b.$slides, b.unload(), b.$slideTrack.children(this.options.slide).detach(), b.$slidesCache.filter(a).appendTo(b.$slideTrack), b.reinit());
  }, b.prototype.focusHandler = function () {
    var b = this;b.$slider.off("focus.slick blur.slick").on("focus.slick blur.slick", "*:not(.slick-arrow)", function (c) {
      c.stopImmediatePropagation();var d = a(this);setTimeout(function () {
        b.options.pauseOnFocus && (b.focussed = d.is(":focus"), b.autoPlay());
      }, 0);
    });
  }, b.prototype.getCurrent = b.prototype.slickCurrentSlide = function () {
    var a = this;return a.currentSlide;
  }, b.prototype.getDotCount = function () {
    var a = this,
        b = 0,
        c = 0,
        d = 0;if (a.options.infinite === !0) for (; b < a.slideCount;) {
      ++d, b = c + a.options.slidesToScroll, c += a.options.slidesToScroll <= a.options.slidesToShow ? a.options.slidesToScroll : a.options.slidesToShow;
    } else if (a.options.centerMode === !0) d = a.slideCount;else if (a.options.asNavFor) for (; b < a.slideCount;) {
      ++d, b = c + a.options.slidesToScroll, c += a.options.slidesToScroll <= a.options.slidesToShow ? a.options.slidesToScroll : a.options.slidesToShow;
    } else d = 1 + Math.ceil((a.slideCount - a.options.slidesToShow) / a.options.slidesToScroll);return d - 1;
  }, b.prototype.getLeft = function (a) {
    var c,
        d,
        f,
        b = this,
        e = 0;return b.slideOffset = 0, d = b.$slides.first().outerHeight(!0), b.options.infinite === !0 ? (b.slideCount > b.options.slidesToShow && (b.slideOffset = b.slideWidth * b.options.slidesToShow * -1, e = d * b.options.slidesToShow * -1), b.slideCount % b.options.slidesToScroll !== 0 && a + b.options.slidesToScroll > b.slideCount && b.slideCount > b.options.slidesToShow && (a > b.slideCount ? (b.slideOffset = (b.options.slidesToShow - (a - b.slideCount)) * b.slideWidth * -1, e = (b.options.slidesToShow - (a - b.slideCount)) * d * -1) : (b.slideOffset = b.slideCount % b.options.slidesToScroll * b.slideWidth * -1, e = b.slideCount % b.options.slidesToScroll * d * -1))) : a + b.options.slidesToShow > b.slideCount && (b.slideOffset = (a + b.options.slidesToShow - b.slideCount) * b.slideWidth, e = (a + b.options.slidesToShow - b.slideCount) * d), b.slideCount <= b.options.slidesToShow && (b.slideOffset = 0, e = 0), b.options.centerMode === !0 && b.options.infinite === !0 ? b.slideOffset += b.slideWidth * Math.floor(b.options.slidesToShow / 2) - b.slideWidth : b.options.centerMode === !0 && (b.slideOffset = 0, b.slideOffset += b.slideWidth * Math.floor(b.options.slidesToShow / 2)), c = b.options.vertical === !1 ? a * b.slideWidth * -1 + b.slideOffset : a * d * -1 + e, b.options.variableWidth === !0 && (f = b.slideCount <= b.options.slidesToShow || b.options.infinite === !1 ? b.$slideTrack.children(".slick-slide").eq(a) : b.$slideTrack.children(".slick-slide").eq(a + b.options.slidesToShow), c = b.options.rtl === !0 ? f[0] ? -1 * (b.$slideTrack.width() - f[0].offsetLeft - f.width()) : 0 : f[0] ? -1 * f[0].offsetLeft : 0, b.options.centerMode === !0 && (f = b.slideCount <= b.options.slidesToShow || b.options.infinite === !1 ? b.$slideTrack.children(".slick-slide").eq(a) : b.$slideTrack.children(".slick-slide").eq(a + b.options.slidesToShow + 1), c = b.options.rtl === !0 ? f[0] ? -1 * (b.$slideTrack.width() - f[0].offsetLeft - f.width()) : 0 : f[0] ? -1 * f[0].offsetLeft : 0, c += (b.$list.width() - f.outerWidth()) / 2)), c;
  }, b.prototype.getOption = b.prototype.slickGetOption = function (a) {
    var b = this;return b.options[a];
  }, b.prototype.getNavigableIndexes = function () {
    var e,
        a = this,
        b = 0,
        c = 0,
        d = [];for (a.options.infinite === !1 ? e = a.slideCount : (b = -1 * a.options.slidesToScroll, c = -1 * a.options.slidesToScroll, e = 2 * a.slideCount); e > b;) {
      d.push(b), b = c + a.options.slidesToScroll, c += a.options.slidesToScroll <= a.options.slidesToShow ? a.options.slidesToScroll : a.options.slidesToShow;
    }return d;
  }, b.prototype.getSlick = function () {
    return this;
  }, b.prototype.getSlideCount = function () {
    var c,
        d,
        e,
        b = this;return e = b.options.centerMode === !0 ? b.slideWidth * Math.floor(b.options.slidesToShow / 2) : 0, b.options.swipeToSlide === !0 ? (b.$slideTrack.find(".slick-slide").each(function (c, f) {
      return f.offsetLeft - e + a(f).outerWidth() / 2 > -1 * b.swipeLeft ? (d = f, !1) : void 0;
    }), c = Math.abs(a(d).attr("data-slick-index") - b.currentSlide) || 1) : b.options.slidesToScroll;
  }, b.prototype.goTo = b.prototype.slickGoTo = function (a, b) {
    var c = this;c.changeSlide({ data: { message: "index", index: parseInt(a) } }, b);
  }, b.prototype.init = function (b) {
    var c = this;a(c.$slider).hasClass("slick-initialized") || (a(c.$slider).addClass("slick-initialized"), c.buildRows(), c.buildOut(), c.setProps(), c.startLoad(), c.loadSlider(), c.initializeEvents(), c.updateArrows(), c.updateDots(), c.checkResponsive(!0), c.focusHandler()), b && c.$slider.trigger("init", [c]), c.options.accessibility === !0 && c.initADA(), c.options.autoplay && (c.paused = !1, c.autoPlay());
  }, b.prototype.initADA = function () {
    var b = this;b.$slides.add(b.$slideTrack.find(".slick-cloned")).attr({ "aria-hidden": "true", tabindex: "-1" }).find("a, input, button, select").attr({ tabindex: "-1" }), b.$slideTrack.attr("role", "listbox"), b.$slides.not(b.$slideTrack.find(".slick-cloned")).each(function (c) {
      a(this).attr({ role: "option", "aria-describedby": "slick-slide" + b.instanceUid + c });
    }), null !== b.$dots && b.$dots.attr("role", "tablist").find("li").each(function (c) {
      a(this).attr({ role: "presentation", "aria-selected": "false", "aria-controls": "navigation" + b.instanceUid + c, id: "slick-slide" + b.instanceUid + c });
    }).first().attr("aria-selected", "true").end().find("button").attr("role", "button").end().closest("div").attr("role", "toolbar"), b.activateADA();
  }, b.prototype.initArrowEvents = function () {
    var a = this;a.options.arrows === !0 && a.slideCount > a.options.slidesToShow && (a.$prevArrow.off("click.slick").on("click.slick", { message: "previous" }, a.changeSlide), a.$nextArrow.off("click.slick").on("click.slick", { message: "next" }, a.changeSlide));
  }, b.prototype.initDotEvents = function () {
    var b = this;b.options.dots === !0 && b.slideCount > b.options.slidesToShow && a("li", b.$dots).on("click.slick", { message: "index" }, b.changeSlide), b.options.dots === !0 && b.options.pauseOnDotsHover === !0 && a("li", b.$dots).on("mouseenter.slick", a.proxy(b.interrupt, b, !0)).on("mouseleave.slick", a.proxy(b.interrupt, b, !1));
  }, b.prototype.initSlideEvents = function () {
    var b = this;b.options.pauseOnHover && (b.$list.on("mouseenter.slick", a.proxy(b.interrupt, b, !0)), b.$list.on("mouseleave.slick", a.proxy(b.interrupt, b, !1)));
  }, b.prototype.initializeEvents = function () {
    var b = this;b.initArrowEvents(), b.initDotEvents(), b.initSlideEvents(), b.$list.on("touchstart.slick mousedown.slick", { action: "start" }, b.swipeHandler), b.$list.on("touchmove.slick mousemove.slick", { action: "move" }, b.swipeHandler), b.$list.on("touchend.slick mouseup.slick", { action: "end" }, b.swipeHandler), b.$list.on("touchcancel.slick mouseleave.slick", { action: "end" }, b.swipeHandler), b.$list.on("click.slick", b.clickHandler), a(document).on(b.visibilityChange, a.proxy(b.visibility, b)), b.options.accessibility === !0 && b.$list.on("keydown.slick", b.keyHandler), b.options.focusOnSelect === !0 && a(b.$slideTrack).children().on("click.slick", b.selectHandler), a(window).on("orientationchange.slick.slick-" + b.instanceUid, a.proxy(b.orientationChange, b)), a(window).on("resize.slick.slick-" + b.instanceUid, a.proxy(b.resize, b)), a("[draggable!=true]", b.$slideTrack).on("dragstart", b.preventDefault), a(window).on("load.slick.slick-" + b.instanceUid, b.setPosition), a(document).on("ready.slick.slick-" + b.instanceUid, b.setPosition);
  }, b.prototype.initUI = function () {
    var a = this;a.options.arrows === !0 && a.slideCount > a.options.slidesToShow && (a.$prevArrow.show(), a.$nextArrow.show()), a.options.dots === !0 && a.slideCount > a.options.slidesToShow && a.$dots.show();
  }, b.prototype.keyHandler = function (a) {
    var b = this;a.target.tagName.match("TEXTAREA|INPUT|SELECT") || (37 === a.keyCode && b.options.accessibility === !0 ? b.changeSlide({ data: { message: b.options.rtl === !0 ? "next" : "previous" } }) : 39 === a.keyCode && b.options.accessibility === !0 && b.changeSlide({ data: { message: b.options.rtl === !0 ? "previous" : "next" } }));
  }, b.prototype.lazyLoad = function () {
    function g(c) {
      a("img[data-lazy]", c).each(function () {
        var c = a(this),
            d = a(this).attr("data-lazy"),
            e = document.createElement("img");e.onload = function () {
          c.animate({ opacity: 0 }, 100, function () {
            c.attr("src", d).animate({ opacity: 1 }, 200, function () {
              c.removeAttr("data-lazy").removeClass("slick-loading");
            }), b.$slider.trigger("lazyLoaded", [b, c, d]);
          });
        }, e.onerror = function () {
          c.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), b.$slider.trigger("lazyLoadError", [b, c, d]);
        }, e.src = d;
      });
    }var c,
        d,
        e,
        f,
        b = this;b.options.centerMode === !0 ? b.options.infinite === !0 ? (e = b.currentSlide + (b.options.slidesToShow / 2 + 1), f = e + b.options.slidesToShow + 2) : (e = Math.max(0, b.currentSlide - (b.options.slidesToShow / 2 + 1)), f = 2 + (b.options.slidesToShow / 2 + 1) + b.currentSlide) : (e = b.options.infinite ? b.options.slidesToShow + b.currentSlide : b.currentSlide, f = Math.ceil(e + b.options.slidesToShow), b.options.fade === !0 && (e > 0 && e--, f <= b.slideCount && f++)), c = b.$slider.find(".slick-slide").slice(e, f), g(c), b.slideCount <= b.options.slidesToShow ? (d = b.$slider.find(".slick-slide"), g(d)) : b.currentSlide >= b.slideCount - b.options.slidesToShow ? (d = b.$slider.find(".slick-cloned").slice(0, b.options.slidesToShow), g(d)) : 0 === b.currentSlide && (d = b.$slider.find(".slick-cloned").slice(-1 * b.options.slidesToShow), g(d));
  }, b.prototype.loadSlider = function () {
    var a = this;a.setPosition(), a.$slideTrack.css({ opacity: 1 }), a.$slider.removeClass("slick-loading"), a.initUI(), "progressive" === a.options.lazyLoad && a.progressiveLazyLoad();
  }, b.prototype.next = b.prototype.slickNext = function () {
    var a = this;a.changeSlide({ data: { message: "next" } });
  }, b.prototype.orientationChange = function () {
    var a = this;a.checkResponsive(), a.setPosition();
  }, b.prototype.pause = b.prototype.slickPause = function () {
    var a = this;a.autoPlayClear(), a.paused = !0;
  }, b.prototype.play = b.prototype.slickPlay = function () {
    var a = this;a.autoPlay(), a.options.autoplay = !0, a.paused = !1, a.focussed = !1, a.interrupted = !1;
  }, b.prototype.postSlide = function (a) {
    var b = this;b.unslicked || (b.$slider.trigger("afterChange", [b, a]), b.animating = !1, b.setPosition(), b.swipeLeft = null, b.options.autoplay && b.autoPlay(), b.options.accessibility === !0 && b.initADA());
  }, b.prototype.prev = b.prototype.slickPrev = function () {
    var a = this;a.changeSlide({ data: { message: "previous" } });
  }, b.prototype.preventDefault = function (a) {
    a.preventDefault();
  }, b.prototype.progressiveLazyLoad = function (b) {
    b = b || 1;var e,
        f,
        g,
        c = this,
        d = a("img[data-lazy]", c.$slider);d.length ? (e = d.first(), f = e.attr("data-lazy"), g = document.createElement("img"), g.onload = function () {
      e.attr("src", f).removeAttr("data-lazy").removeClass("slick-loading"), c.options.adaptiveHeight === !0 && c.setPosition(), c.$slider.trigger("lazyLoaded", [c, e, f]), c.progressiveLazyLoad();
    }, g.onerror = function () {
      3 > b ? setTimeout(function () {
        c.progressiveLazyLoad(b + 1);
      }, 500) : (e.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), c.$slider.trigger("lazyLoadError", [c, e, f]), c.progressiveLazyLoad());
    }, g.src = f) : c.$slider.trigger("allImagesLoaded", [c]);
  }, b.prototype.refresh = function (b) {
    var d,
        e,
        c = this;e = c.slideCount - c.options.slidesToShow, !c.options.infinite && c.currentSlide > e && (c.currentSlide = e), c.slideCount <= c.options.slidesToShow && (c.currentSlide = 0), d = c.currentSlide, c.destroy(!0), a.extend(c, c.initials, { currentSlide: d }), c.init(), b || c.changeSlide({ data: { message: "index", index: d } }, !1);
  }, b.prototype.registerBreakpoints = function () {
    var c,
        d,
        e,
        b = this,
        f = b.options.responsive || null;if ("array" === a.type(f) && f.length) {
      b.respondTo = b.options.respondTo || "window";for (c in f) {
        if (e = b.breakpoints.length - 1, d = f[c].breakpoint, f.hasOwnProperty(c)) {
          for (; e >= 0;) {
            b.breakpoints[e] && b.breakpoints[e] === d && b.breakpoints.splice(e, 1), e--;
          }b.breakpoints.push(d), b.breakpointSettings[d] = f[c].settings;
        }
      }b.breakpoints.sort(function (a, c) {
        return b.options.mobileFirst ? a - c : c - a;
      });
    }
  }, b.prototype.reinit = function () {
    var b = this;b.$slides = b.$slideTrack.children(b.options.slide).addClass("slick-slide"), b.slideCount = b.$slides.length, b.currentSlide >= b.slideCount && 0 !== b.currentSlide && (b.currentSlide = b.currentSlide - b.options.slidesToScroll), b.slideCount <= b.options.slidesToShow && (b.currentSlide = 0), b.registerBreakpoints(), b.setProps(), b.setupInfinite(), b.buildArrows(), b.updateArrows(), b.initArrowEvents(), b.buildDots(), b.updateDots(), b.initDotEvents(), b.cleanUpSlideEvents(), b.initSlideEvents(), b.checkResponsive(!1, !0), b.options.focusOnSelect === !0 && a(b.$slideTrack).children().on("click.slick", b.selectHandler), b.setSlideClasses("number" == typeof b.currentSlide ? b.currentSlide : 0), b.setPosition(), b.focusHandler(), b.paused = !b.options.autoplay, b.autoPlay(), b.$slider.trigger("reInit", [b]);
  }, b.prototype.resize = function () {
    var b = this;a(window).width() !== b.windowWidth && (clearTimeout(b.windowDelay), b.windowDelay = window.setTimeout(function () {
      b.windowWidth = a(window).width(), b.checkResponsive(), b.unslicked || b.setPosition();
    }, 50));
  }, b.prototype.removeSlide = b.prototype.slickRemove = function (a, b, c) {
    var d = this;return "boolean" == typeof a ? (b = a, a = b === !0 ? 0 : d.slideCount - 1) : a = b === !0 ? --a : a, d.slideCount < 1 || 0 > a || a > d.slideCount - 1 ? !1 : (d.unload(), c === !0 ? d.$slideTrack.children().remove() : d.$slideTrack.children(this.options.slide).eq(a).remove(), d.$slides = d.$slideTrack.children(this.options.slide), d.$slideTrack.children(this.options.slide).detach(), d.$slideTrack.append(d.$slides), d.$slidesCache = d.$slides, void d.reinit());
  }, b.prototype.setCSS = function (a) {
    var d,
        e,
        b = this,
        c = {};b.options.rtl === !0 && (a = -a), d = "left" == b.positionProp ? Math.ceil(a) + "px" : "0px", e = "top" == b.positionProp ? Math.ceil(a) + "px" : "0px", c[b.positionProp] = a, b.transformsEnabled === !1 ? b.$slideTrack.css(c) : (c = {}, b.cssTransitions === !1 ? (c[b.animType] = "translate(" + d + ", " + e + ")", b.$slideTrack.css(c)) : (c[b.animType] = "translate3d(" + d + ", " + e + ", 0px)", b.$slideTrack.css(c)));
  }, b.prototype.setDimensions = function () {
    var a = this;a.options.vertical === !1 ? a.options.centerMode === !0 && a.$list.css({ padding: "0px " + a.options.centerPadding }) : (a.$list.height(a.$slides.first().outerHeight(!0) * a.options.slidesToShow), a.options.centerMode === !0 && a.$list.css({ padding: a.options.centerPadding + " 0px" })), a.listWidth = a.$list.width(), a.listHeight = a.$list.height(), a.options.vertical === !1 && a.options.variableWidth === !1 ? (a.slideWidth = Math.ceil(a.listWidth / a.options.slidesToShow), a.$slideTrack.width(Math.ceil(a.slideWidth * a.$slideTrack.children(".slick-slide").length))) : a.options.variableWidth === !0 ? a.$slideTrack.width(5e3 * a.slideCount) : (a.slideWidth = Math.ceil(a.listWidth), a.$slideTrack.height(Math.ceil(a.$slides.first().outerHeight(!0) * a.$slideTrack.children(".slick-slide").length)));var b = a.$slides.first().outerWidth(!0) - a.$slides.first().width();a.options.variableWidth === !1 && a.$slideTrack.children(".slick-slide").width(a.slideWidth - b);
  }, b.prototype.setFade = function () {
    var c,
        b = this;b.$slides.each(function (d, e) {
      c = b.slideWidth * d * -1, b.options.rtl === !0 ? a(e).css({ position: "relative", right: c, top: 0, zIndex: b.options.zIndex - 2, opacity: 0 }) : a(e).css({ position: "relative", left: c, top: 0, zIndex: b.options.zIndex - 2, opacity: 0 });
    }), b.$slides.eq(b.currentSlide).css({ zIndex: b.options.zIndex - 1, opacity: 1 });
  }, b.prototype.setHeight = function () {
    var a = this;if (1 === a.options.slidesToShow && a.options.adaptiveHeight === !0 && a.options.vertical === !1) {
      var b = a.$slides.eq(a.currentSlide).outerHeight(!0);a.$list.css("height", b);
    }
  }, b.prototype.setOption = b.prototype.slickSetOption = function () {
    var c,
        d,
        e,
        f,
        h,
        b = this,
        g = !1;if ("object" === a.type(arguments[0]) ? (e = arguments[0], g = arguments[1], h = "multiple") : "string" === a.type(arguments[0]) && (e = arguments[0], f = arguments[1], g = arguments[2], "responsive" === arguments[0] && "array" === a.type(arguments[1]) ? h = "responsive" : "undefined" != typeof arguments[1] && (h = "single")), "single" === h) b.options[e] = f;else if ("multiple" === h) a.each(e, function (a, c) {
      b.options[a] = c;
    });else if ("responsive" === h) for (d in f) {
      if ("array" !== a.type(b.options.responsive)) b.options.responsive = [f[d]];else {
        for (c = b.options.responsive.length - 1; c >= 0;) {
          b.options.responsive[c].breakpoint === f[d].breakpoint && b.options.responsive.splice(c, 1), c--;
        }b.options.responsive.push(f[d]);
      }
    }g && (b.unload(), b.reinit());
  }, b.prototype.setPosition = function () {
    var a = this;a.setDimensions(), a.setHeight(), a.options.fade === !1 ? a.setCSS(a.getLeft(a.currentSlide)) : a.setFade(), a.$slider.trigger("setPosition", [a]);
  }, b.prototype.setProps = function () {
    var a = this,
        b = document.body.style;a.positionProp = a.options.vertical === !0 ? "top" : "left", "top" === a.positionProp ? a.$slider.addClass("slick-vertical") : a.$slider.removeClass("slick-vertical"), (void 0 !== b.WebkitTransition || void 0 !== b.MozTransition || void 0 !== b.msTransition) && a.options.useCSS === !0 && (a.cssTransitions = !0), a.options.fade && ("number" == typeof a.options.zIndex ? a.options.zIndex < 3 && (a.options.zIndex = 3) : a.options.zIndex = a.defaults.zIndex), void 0 !== b.OTransform && (a.animType = "OTransform", a.transformType = "-o-transform", a.transitionType = "OTransition", void 0 === b.perspectiveProperty && void 0 === b.webkitPerspective && (a.animType = !1)), void 0 !== b.MozTransform && (a.animType = "MozTransform", a.transformType = "-moz-transform", a.transitionType = "MozTransition", void 0 === b.perspectiveProperty && void 0 === b.MozPerspective && (a.animType = !1)), void 0 !== b.webkitTransform && (a.animType = "webkitTransform", a.transformType = "-webkit-transform", a.transitionType = "webkitTransition", void 0 === b.perspectiveProperty && void 0 === b.webkitPerspective && (a.animType = !1)), void 0 !== b.msTransform && (a.animType = "msTransform", a.transformType = "-ms-transform", a.transitionType = "msTransition", void 0 === b.msTransform && (a.animType = !1)), void 0 !== b.transform && a.animType !== !1 && (a.animType = "transform", a.transformType = "transform", a.transitionType = "transition"), a.transformsEnabled = a.options.useTransform && null !== a.animType && a.animType !== !1;
  }, b.prototype.setSlideClasses = function (a) {
    var c,
        d,
        e,
        f,
        b = this;d = b.$slider.find(".slick-slide").removeClass("slick-active slick-center slick-current").attr("aria-hidden", "true"), b.$slides.eq(a).addClass("slick-current"), b.options.centerMode === !0 ? (c = Math.floor(b.options.slidesToShow / 2), b.options.infinite === !0 && (a >= c && a <= b.slideCount - 1 - c ? b.$slides.slice(a - c, a + c + 1).addClass("slick-active").attr("aria-hidden", "false") : (e = b.options.slidesToShow + a, d.slice(e - c + 1, e + c + 2).addClass("slick-active").attr("aria-hidden", "false")), 0 === a ? d.eq(d.length - 1 - b.options.slidesToShow).addClass("slick-center") : a === b.slideCount - 1 && d.eq(b.options.slidesToShow).addClass("slick-center")), b.$slides.eq(a).addClass("slick-center")) : a >= 0 && a <= b.slideCount - b.options.slidesToShow ? b.$slides.slice(a, a + b.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false") : d.length <= b.options.slidesToShow ? d.addClass("slick-active").attr("aria-hidden", "false") : (f = b.slideCount % b.options.slidesToShow, e = b.options.infinite === !0 ? b.options.slidesToShow + a : a, b.options.slidesToShow == b.options.slidesToScroll && b.slideCount - a < b.options.slidesToShow ? d.slice(e - (b.options.slidesToShow - f), e + f).addClass("slick-active").attr("aria-hidden", "false") : d.slice(e, e + b.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false")), "ondemand" === b.options.lazyLoad && b.lazyLoad();
  }, b.prototype.setupInfinite = function () {
    var c,
        d,
        e,
        b = this;if (b.options.fade === !0 && (b.options.centerMode = !1), b.options.infinite === !0 && b.options.fade === !1 && (d = null, b.slideCount > b.options.slidesToShow)) {
      for (e = b.options.centerMode === !0 ? b.options.slidesToShow + 1 : b.options.slidesToShow, c = b.slideCount; c > b.slideCount - e; c -= 1) {
        d = c - 1, a(b.$slides[d]).clone(!0).attr("id", "").attr("data-slick-index", d - b.slideCount).prependTo(b.$slideTrack).addClass("slick-cloned");
      }for (c = 0; e > c; c += 1) {
        d = c, a(b.$slides[d]).clone(!0).attr("id", "").attr("data-slick-index", d + b.slideCount).appendTo(b.$slideTrack).addClass("slick-cloned");
      }b.$slideTrack.find(".slick-cloned").find("[id]").each(function () {
        a(this).attr("id", "");
      });
    }
  }, b.prototype.interrupt = function (a) {
    var b = this;a || b.autoPlay(), b.interrupted = a;
  }, b.prototype.selectHandler = function (b) {
    var c = this,
        d = a(b.target).is(".slick-slide") ? a(b.target) : a(b.target).parents(".slick-slide"),
        e = parseInt(d.attr("data-slick-index"));return e || (e = 0), c.slideCount <= c.options.slidesToShow ? (c.setSlideClasses(e), void c.asNavFor(e)) : void c.slideHandler(e);
  }, b.prototype.slideHandler = function (a, b, c) {
    var d,
        e,
        f,
        g,
        j,
        h = null,
        i = this;return b = b || !1, i.animating === !0 && i.options.waitForAnimate === !0 || i.options.fade === !0 && i.currentSlide === a || i.slideCount <= i.options.slidesToShow ? void 0 : (b === !1 && i.asNavFor(a), d = a, h = i.getLeft(d), g = i.getLeft(i.currentSlide), i.currentLeft = null === i.swipeLeft ? g : i.swipeLeft, i.options.infinite === !1 && i.options.centerMode === !1 && (0 > a || a > i.getDotCount() * i.options.slidesToScroll) ? void (i.options.fade === !1 && (d = i.currentSlide, c !== !0 ? i.animateSlide(g, function () {
      i.postSlide(d);
    }) : i.postSlide(d))) : i.options.infinite === !1 && i.options.centerMode === !0 && (0 > a || a > i.slideCount - i.options.slidesToScroll) ? void (i.options.fade === !1 && (d = i.currentSlide, c !== !0 ? i.animateSlide(g, function () {
      i.postSlide(d);
    }) : i.postSlide(d))) : (i.options.autoplay && clearInterval(i.autoPlayTimer), e = 0 > d ? i.slideCount % i.options.slidesToScroll !== 0 ? i.slideCount - i.slideCount % i.options.slidesToScroll : i.slideCount + d : d >= i.slideCount ? i.slideCount % i.options.slidesToScroll !== 0 ? 0 : d - i.slideCount : d, i.animating = !0, i.$slider.trigger("beforeChange", [i, i.currentSlide, e]), f = i.currentSlide, i.currentSlide = e, i.setSlideClasses(i.currentSlide), i.options.asNavFor && (j = i.getNavTarget(), j = j.slick("getSlick"), j.slideCount <= j.options.slidesToShow && j.setSlideClasses(i.currentSlide)), i.updateDots(), i.updateArrows(), i.options.fade === !0 ? (c !== !0 ? (i.fadeSlideOut(f), i.fadeSlide(e, function () {
      i.postSlide(e);
    })) : i.postSlide(e), void i.animateHeight()) : void (c !== !0 ? i.animateSlide(h, function () {
      i.postSlide(e);
    }) : i.postSlide(e))));
  }, b.prototype.startLoad = function () {
    var a = this;a.options.arrows === !0 && a.slideCount > a.options.slidesToShow && (a.$prevArrow.hide(), a.$nextArrow.hide()), a.options.dots === !0 && a.slideCount > a.options.slidesToShow && a.$dots.hide(), a.$slider.addClass("slick-loading");
  }, b.prototype.swipeDirection = function () {
    var a,
        b,
        c,
        d,
        e = this;return a = e.touchObject.startX - e.touchObject.curX, b = e.touchObject.startY - e.touchObject.curY, c = Math.atan2(b, a), d = Math.round(180 * c / Math.PI), 0 > d && (d = 360 - Math.abs(d)), 45 >= d && d >= 0 ? e.options.rtl === !1 ? "left" : "right" : 360 >= d && d >= 315 ? e.options.rtl === !1 ? "left" : "right" : d >= 135 && 225 >= d ? e.options.rtl === !1 ? "right" : "left" : e.options.verticalSwiping === !0 ? d >= 35 && 135 >= d ? "down" : "up" : "vertical";
  }, b.prototype.swipeEnd = function (a) {
    var c,
        d,
        b = this;if (b.dragging = !1, b.interrupted = !1, b.shouldClick = b.touchObject.swipeLength > 10 ? !1 : !0, void 0 === b.touchObject.curX) return !1;if (b.touchObject.edgeHit === !0 && b.$slider.trigger("edge", [b, b.swipeDirection()]), b.touchObject.swipeLength >= b.touchObject.minSwipe) {
      switch (d = b.swipeDirection()) {case "left":case "down":
          c = b.options.swipeToSlide ? b.checkNavigable(b.currentSlide + b.getSlideCount()) : b.currentSlide + b.getSlideCount(), b.currentDirection = 0;break;case "right":case "up":
          c = b.options.swipeToSlide ? b.checkNavigable(b.currentSlide - b.getSlideCount()) : b.currentSlide - b.getSlideCount(), b.currentDirection = 1;}"vertical" != d && (b.slideHandler(c), b.touchObject = {}, b.$slider.trigger("swipe", [b, d]));
    } else b.touchObject.startX !== b.touchObject.curX && (b.slideHandler(b.currentSlide), b.touchObject = {});
  }, b.prototype.swipeHandler = function (a) {
    var b = this;if (!(b.options.swipe === !1 || "ontouchend" in document && b.options.swipe === !1 || b.options.draggable === !1 && -1 !== a.type.indexOf("mouse"))) switch (b.touchObject.fingerCount = a.originalEvent && void 0 !== a.originalEvent.touches ? a.originalEvent.touches.length : 1, b.touchObject.minSwipe = b.listWidth / b.options.touchThreshold, b.options.verticalSwiping === !0 && (b.touchObject.minSwipe = b.listHeight / b.options.touchThreshold), a.data.action) {case "start":
        b.swipeStart(a);break;case "move":
        b.swipeMove(a);break;case "end":
        b.swipeEnd(a);}
  }, b.prototype.swipeMove = function (a) {
    var d,
        e,
        f,
        g,
        h,
        b = this;return h = void 0 !== a.originalEvent ? a.originalEvent.touches : null, !b.dragging || h && 1 !== h.length ? !1 : (d = b.getLeft(b.currentSlide), b.touchObject.curX = void 0 !== h ? h[0].pageX : a.clientX, b.touchObject.curY = void 0 !== h ? h[0].pageY : a.clientY, b.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(b.touchObject.curX - b.touchObject.startX, 2))), b.options.verticalSwiping === !0 && (b.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(b.touchObject.curY - b.touchObject.startY, 2)))), e = b.swipeDirection(), "vertical" !== e ? (void 0 !== a.originalEvent && b.touchObject.swipeLength > 4 && a.preventDefault(), g = (b.options.rtl === !1 ? 1 : -1) * (b.touchObject.curX > b.touchObject.startX ? 1 : -1), b.options.verticalSwiping === !0 && (g = b.touchObject.curY > b.touchObject.startY ? 1 : -1), f = b.touchObject.swipeLength, b.touchObject.edgeHit = !1, b.options.infinite === !1 && (0 === b.currentSlide && "right" === e || b.currentSlide >= b.getDotCount() && "left" === e) && (f = b.touchObject.swipeLength * b.options.edgeFriction, b.touchObject.edgeHit = !0), b.options.vertical === !1 ? b.swipeLeft = d + f * g : b.swipeLeft = d + f * (b.$list.height() / b.listWidth) * g, b.options.verticalSwiping === !0 && (b.swipeLeft = d + f * g), b.options.fade === !0 || b.options.touchMove === !1 ? !1 : b.animating === !0 ? (b.swipeLeft = null, !1) : void b.setCSS(b.swipeLeft)) : void 0);
  }, b.prototype.swipeStart = function (a) {
    var c,
        b = this;return b.interrupted = !0, 1 !== b.touchObject.fingerCount || b.slideCount <= b.options.slidesToShow ? (b.touchObject = {}, !1) : (void 0 !== a.originalEvent && void 0 !== a.originalEvent.touches && (c = a.originalEvent.touches[0]), b.touchObject.startX = b.touchObject.curX = void 0 !== c ? c.pageX : a.clientX, b.touchObject.startY = b.touchObject.curY = void 0 !== c ? c.pageY : a.clientY, void (b.dragging = !0));
  }, b.prototype.unfilterSlides = b.prototype.slickUnfilter = function () {
    var a = this;null !== a.$slidesCache && (a.unload(), a.$slideTrack.children(this.options.slide).detach(), a.$slidesCache.appendTo(a.$slideTrack), a.reinit());
  }, b.prototype.unload = function () {
    var b = this;a(".slick-cloned", b.$slider).remove(), b.$dots && b.$dots.remove(), b.$prevArrow && b.htmlExpr.test(b.options.prevArrow) && b.$prevArrow.remove(), b.$nextArrow && b.htmlExpr.test(b.options.nextArrow) && b.$nextArrow.remove(), b.$slides.removeClass("slick-slide slick-active slick-visible slick-current").attr("aria-hidden", "true").css("width", "");
  }, b.prototype.unslick = function (a) {
    var b = this;b.$slider.trigger("unslick", [b, a]), b.destroy();
  }, b.prototype.updateArrows = function () {
    var b,
        a = this;b = Math.floor(a.options.slidesToShow / 2), a.options.arrows === !0 && a.slideCount > a.options.slidesToShow && !a.options.infinite && (a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), a.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), 0 === a.currentSlide ? (a.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true"), a.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : a.currentSlide >= a.slideCount - a.options.slidesToShow && a.options.centerMode === !1 ? (a.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : a.currentSlide >= a.slideCount - 1 && a.options.centerMode === !0 && (a.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")));
  }, b.prototype.updateDots = function () {
    var a = this;null !== a.$dots && (a.$dots.find("li").removeClass("slick-active").attr("aria-hidden", "true"), a.$dots.find("li").eq(Math.floor(a.currentSlide / a.options.slidesToScroll)).addClass("slick-active").attr("aria-hidden", "false"));
  }, b.prototype.visibility = function () {
    var a = this;a.options.autoplay && (document[a.hidden] ? a.interrupted = !0 : a.interrupted = !1);
  }, a.fn.slick = function () {
    var f,
        g,
        a = this,
        c = arguments[0],
        d = Array.prototype.slice.call(arguments, 1),
        e = a.length;for (f = 0; e > f; f++) {
      if ("object" == (typeof c === "undefined" ? "undefined" : _typeof(c)) || "undefined" == typeof c ? a[f].slick = new b(a[f], c) : g = a[f].slick[c].apply(a[f].slick, d), "undefined" != typeof g) return g;
    }return a;
  };
});
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*! lazysizes - v2.0.7 */
!function (a, b) {
  var c = b(a, a.document);a.lazySizes = c, "object" == (typeof module === "undefined" ? "undefined" : _typeof(module)) && module.exports && (module.exports = c);
}(window, function (a, b) {
  "use strict";
  if (b.getElementsByClassName) {
    var c,
        d = b.documentElement,
        e = a.Date,
        f = a.HTMLPictureElement,
        g = "addEventListener",
        h = "getAttribute",
        i = a[g],
        j = a.setTimeout,
        k = a.requestAnimationFrame || j,
        l = a.requestIdleCallback,
        m = /^picture$/i,
        n = ["load", "error", "lazyincluded", "_lazyloaded"],
        o = {},
        p = Array.prototype.forEach,
        q = function q(a, b) {
      return o[b] || (o[b] = new RegExp("(\\s|^)" + b + "(\\s|$)")), o[b].test(a[h]("class") || "") && o[b];
    },
        r = function r(a, b) {
      q(a, b) || a.setAttribute("class", (a[h]("class") || "").trim() + " " + b);
    },
        s = function s(a, b) {
      var c;(c = q(a, b)) && a.setAttribute("class", (a[h]("class") || "").replace(c, " "));
    },
        t = function t(a, b, c) {
      var d = c ? g : "removeEventListener";c && t(a, b), n.forEach(function (c) {
        a[d](c, b);
      });
    },
        u = function u(a, c, d, e, f) {
      var g = b.createEvent("CustomEvent");return g.initCustomEvent(c, !e, !f, d || {}), a.dispatchEvent(g), g;
    },
        v = function v(b, d) {
      var e;!f && (e = a.picturefill || c.pf) ? e({ reevaluate: !0, elements: [b] }) : d && d.src && (b.src = d.src);
    },
        w = function w(a, b) {
      return (getComputedStyle(a, null) || {})[b];
    },
        x = function x(a, b, d) {
      for (d = d || a.offsetWidth; d < c.minSize && b && !a._lazysizesWidth;) {
        d = b.offsetWidth, b = b.parentNode;
      }return d;
    },
        y = function () {
      var a,
          c,
          d = [],
          e = function e() {
        var b;for (a = !0, c = !1; d.length;) {
          b = d.shift(), b[0].apply(b[1], b[2]);
        }a = !1;
      },
          f = function f(_f) {
        a ? _f.apply(this, arguments) : (d.push([_f, this, arguments]), c || (c = !0, (b.hidden ? j : k)(e)));
      };return f._lsFlush = e, f;
    }(),
        z = function z(a, b) {
      return b ? function () {
        y(a);
      } : function () {
        var b = this,
            c = arguments;y(function () {
          a.apply(b, c);
        });
      };
    },
        A = function A(a) {
      var b,
          c = 0,
          d = 125,
          f = 666,
          g = f,
          h = function h() {
        b = !1, c = e.now(), a();
      },
          i = l ? function () {
        l(h, { timeout: g }), g !== f && (g = f);
      } : z(function () {
        j(h);
      }, !0);return function (a) {
        var f;(a = a === !0) && (g = 44), b || (b = !0, f = d - (e.now() - c), 0 > f && (f = 0), a || 9 > f && l ? i() : j(i, f));
      };
    },
        B = function B(a) {
      var b,
          c,
          d = 99,
          f = function f() {
        b = null, a();
      },
          g = function g() {
        var a = e.now() - c;d > a ? j(g, d - a) : (l || f)(f);
      };return function () {
        c = e.now(), b || (b = j(g, d));
      };
    },
        C = function () {
      var f,
          k,
          l,
          n,
          o,
          x,
          C,
          E,
          F,
          G,
          H,
          I,
          J,
          K,
          L,
          M = /^img$/i,
          N = /^iframe$/i,
          O = "onscroll" in a && !/glebot/.test(navigator.userAgent),
          P = 0,
          Q = 0,
          R = 0,
          S = -1,
          T = function T(a) {
        R--, a && a.target && t(a.target, T), (!a || 0 > R || !a.target) && (R = 0);
      },
          U = function U(a, c) {
        var e,
            f = a,
            g = "hidden" == w(b.body, "visibility") || "hidden" != w(a, "visibility");for (F -= c, I += c, G -= c, H += c; g && (f = f.offsetParent) && f != b.body && f != d;) {
          g = (w(f, "opacity") || 1) > 0, g && "visible" != w(f, "overflow") && (e = f.getBoundingClientRect(), g = H > e.left && G < e.right && I > e.top - 1 && F < e.bottom + 1);
        }return g;
      },
          V = function V() {
        var a, e, g, i, j, m, n, p, q;if ((o = c.loadMode) && 8 > R && (a = f.length)) {
          e = 0, S++, null == K && ("expand" in c || (c.expand = d.clientHeight > 500 && d.clientWidth > 500 ? 500 : 370), J = c.expand, K = J * c.expFactor), K > Q && 1 > R && S > 2 && o > 2 && !b.hidden ? (Q = K, S = 0) : Q = o > 1 && S > 1 && 6 > R ? J : P;for (; a > e; e++) {
            if (f[e] && !f[e]._lazyRace) if (O) {
              if ((p = f[e][h]("data-expand")) && (m = 1 * p) || (m = Q), q !== m && (C = innerWidth + m * L, E = innerHeight + m, n = -1 * m, q = m), g = f[e].getBoundingClientRect(), (I = g.bottom) >= n && (F = g.top) <= E && (H = g.right) >= n * L && (G = g.left) <= C && (I || H || G || F) && (l && 3 > R && !p && (3 > o || 4 > S) || U(f[e], m))) {
                if (ba(f[e]), j = !0, R > 9) break;
              } else !j && l && !i && 4 > R && 4 > S && o > 2 && (k[0] || c.preloadAfterLoad) && (k[0] || !p && (I || H || G || F || "auto" != f[e][h](c.sizesAttr))) && (i = k[0] || f[e]);
            } else ba(f[e]);
          }i && !j && ba(i);
        }
      },
          W = A(V),
          X = function X(a) {
        r(a.target, c.loadedClass), s(a.target, c.loadingClass), t(a.target, Z);
      },
          Y = z(X),
          Z = function Z(a) {
        Y({ target: a.target });
      },
          $ = function $(a, b) {
        try {
          a.contentWindow.location.replace(b);
        } catch (c) {
          a.src = b;
        }
      },
          _ = function _(a) {
        var b,
            d,
            e = a[h](c.srcsetAttr);(b = c.customMedia[a[h]("data-media") || a[h]("media")]) && a.setAttribute("media", b), e && a.setAttribute("srcset", e), b && (d = a.parentNode, d.insertBefore(a.cloneNode(), a), d.removeChild(a));
      },
          aa = z(function (a, b, d, e, f) {
        var g, i, k, l, o, q;(o = u(a, "lazybeforeunveil", b)).defaultPrevented || (e && (d ? r(a, c.autosizesClass) : a.setAttribute("sizes", e)), i = a[h](c.srcsetAttr), g = a[h](c.srcAttr), f && (k = a.parentNode, l = k && m.test(k.nodeName || "")), q = b.firesLoad || "src" in a && (i || g || l), o = { target: a }, q && (t(a, T, !0), clearTimeout(n), n = j(T, 2500), r(a, c.loadingClass), t(a, Z, !0)), l && p.call(k.getElementsByTagName("source"), _), i ? a.setAttribute("srcset", i) : g && !l && (N.test(a.nodeName) ? $(a, g) : a.src = g), (i || l) && v(a, { src: g })), y(function () {
          a._lazyRace && delete a._lazyRace, s(a, c.lazyClass), (!q || a.complete) && (q ? T(o) : R--, X(o));
        });
      }),
          ba = function ba(a) {
        var b,
            d = M.test(a.nodeName),
            e = d && (a[h](c.sizesAttr) || a[h]("sizes")),
            f = "auto" == e;(!f && l || !d || !a.src && !a.srcset || a.complete || q(a, c.errorClass)) && (b = u(a, "lazyunveilread").detail, f && D.updateElem(a, !0, a.offsetWidth), a._lazyRace = !0, R++, aa(a, b, f, e, d));
      },
          ca = function ca() {
        if (!l) {
          if (e.now() - x < 999) return void j(ca, 999);var a = B(function () {
            c.loadMode = 3, W();
          });l = !0, c.loadMode = 3, W(), i("scroll", function () {
            3 == c.loadMode && (c.loadMode = 2), a();
          }, !0);
        }
      };return { _: function _() {
          x = e.now(), f = b.getElementsByClassName(c.lazyClass), k = b.getElementsByClassName(c.lazyClass + " " + c.preloadClass), L = c.hFac, i("scroll", W, !0), i("resize", W, !0), a.MutationObserver ? new MutationObserver(W).observe(d, { childList: !0, subtree: !0, attributes: !0 }) : (d[g]("DOMNodeInserted", W, !0), d[g]("DOMAttrModified", W, !0), setInterval(W, 999)), i("hashchange", W, !0), ["focus", "mouseover", "click", "load", "transitionend", "animationend", "webkitAnimationEnd"].forEach(function (a) {
            b[g](a, W, !0);
          }), /d$|^c/.test(b.readyState) ? ca() : (i("load", ca), b[g]("DOMContentLoaded", W), j(ca, 2e4)), f.length ? V() : W();
        }, checkElems: W, unveil: ba };
    }(),
        D = function () {
      var a,
          d = z(function (a, b, c, d) {
        var e, f, g;if (a._lazysizesWidth = d, d += "px", a.setAttribute("sizes", d), m.test(b.nodeName || "")) for (e = b.getElementsByTagName("source"), f = 0, g = e.length; g > f; f++) {
          e[f].setAttribute("sizes", d);
        }c.detail.dataAttr || v(a, c.detail);
      }),
          e = function e(a, b, c) {
        var e,
            f = a.parentNode;f && (c = x(a, f, c), e = u(a, "lazybeforesizes", { width: c, dataAttr: !!b }), e.defaultPrevented || (c = e.detail.width, c && c !== a._lazysizesWidth && d(a, f, e, c)));
      },
          f = function f() {
        var b,
            c = a.length;if (c) for (b = 0; c > b; b++) {
          e(a[b]);
        }
      },
          g = B(f);return { _: function _() {
          a = b.getElementsByClassName(c.autosizesClass), i("resize", g);
        }, checkElems: g, updateElem: e };
    }(),
        E = function E() {
      E.i || (E.i = !0, D._(), C._());
    };return function () {
      var b,
          d = { lazyClass: "lazyload", loadedClass: "lazyloaded", loadingClass: "lazyloading", preloadClass: "lazypreload", errorClass: "lazyerror", autosizesClass: "lazyautosizes", srcAttr: "data-src", srcsetAttr: "data-srcset", sizesAttr: "data-sizes", minSize: 40, customMedia: {}, init: !0, expFactor: 1.5, hFac: .8, loadMode: 2 };c = a.lazySizesConfig || a.lazysizesConfig || {};for (b in d) {
        b in c || (c[b] = d[b]);
      }a.lazySizesConfig = c, j(function () {
        c.init && E();
      });
    }(), { cfg: c, autoSizer: D, loader: C, init: E, uP: v, aC: r, rC: s, hC: q, fire: u, gW: x, rAF: y };
  }
});
"use strict";

(function ($) {
    $(document).foundation();
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJmb3VuZGF0aW9uLmNvcmUuanMiLCJmb3VuZGF0aW9uLnV0aWwuYm94LmpzIiwiZm91bmRhdGlvbi51dGlsLmtleWJvYXJkLmpzIiwiZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnkuanMiLCJmb3VuZGF0aW9uLnV0aWwubW90aW9uLmpzIiwiZm91bmRhdGlvbi51dGlsLm5lc3QuanMiLCJmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlci5qcyIsImZvdW5kYXRpb24udXRpbC50b3VjaC5qcyIsImZvdW5kYXRpb24udXRpbC50cmlnZ2Vycy5qcyIsImZvdW5kYXRpb24uZHJvcGRvd25NZW51LmpzIiwiZm91bmRhdGlvbi5vZmZjYW52YXMuanMiLCJzbGljay5taW4uanMiLCJsYXp5c2l6ZXMubWluLmpzIiwiYXBwLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIndoYXRJbnB1dCIsImFjdGl2ZUtleXMiLCJib2R5IiwiYnVmZmVyIiwiY3VycmVudElucHV0Iiwibm9uVHlwaW5nSW5wdXRzIiwibW91c2VXaGVlbCIsImRldGVjdFdoZWVsIiwiaWdub3JlTWFwIiwiaW5wdXRNYXAiLCJpbnB1dFR5cGVzIiwia2V5TWFwIiwicG9pbnRlck1hcCIsInRpbWVyIiwiZXZlbnRCdWZmZXIiLCJjbGVhclRpbWVyIiwic2V0SW5wdXQiLCJldmVudCIsInNldFRpbWVvdXQiLCJidWZmZXJlZEV2ZW50IiwidW5CdWZmZXJlZEV2ZW50IiwiY2xlYXJUaW1lb3V0IiwiZXZlbnRLZXkiLCJrZXkiLCJ2YWx1ZSIsInR5cGUiLCJwb2ludGVyVHlwZSIsImV2ZW50VGFyZ2V0IiwidGFyZ2V0IiwiZXZlbnRUYXJnZXROb2RlIiwibm9kZU5hbWUiLCJ0b0xvd2VyQ2FzZSIsImV2ZW50VGFyZ2V0VHlwZSIsImdldEF0dHJpYnV0ZSIsImhhc0F0dHJpYnV0ZSIsImluZGV4T2YiLCJzd2l0Y2hJbnB1dCIsImxvZ0tleXMiLCJzdHJpbmciLCJzZXRBdHRyaWJ1dGUiLCJwdXNoIiwia2V5Q29kZSIsIndoaWNoIiwic3JjRWxlbWVudCIsInVuTG9nS2V5cyIsImFycmF5UG9zIiwic3BsaWNlIiwiYmluZEV2ZW50cyIsImRvY3VtZW50IiwiUG9pbnRlckV2ZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsIk1TUG9pbnRlckV2ZW50IiwiY3JlYXRlRWxlbWVudCIsIm9ubW91c2V3aGVlbCIsInVuZGVmaW5lZCIsIkFycmF5IiwicHJvdG90eXBlIiwiYXNrIiwia2V5cyIsInR5cGVzIiwic2V0IiwiJCIsIkZPVU5EQVRJT05fVkVSU0lPTiIsIkZvdW5kYXRpb24iLCJ2ZXJzaW9uIiwiX3BsdWdpbnMiLCJfdXVpZHMiLCJydGwiLCJhdHRyIiwicGx1Z2luIiwibmFtZSIsImNsYXNzTmFtZSIsImZ1bmN0aW9uTmFtZSIsImF0dHJOYW1lIiwiaHlwaGVuYXRlIiwicmVnaXN0ZXJQbHVnaW4iLCJwbHVnaW5OYW1lIiwiY29uc3RydWN0b3IiLCJ1dWlkIiwiR2V0WW9EaWdpdHMiLCIkZWxlbWVudCIsImRhdGEiLCJ0cmlnZ2VyIiwidW5yZWdpc3RlclBsdWdpbiIsInJlbW92ZUF0dHIiLCJyZW1vdmVEYXRhIiwicHJvcCIsInJlSW5pdCIsInBsdWdpbnMiLCJpc0pRIiwiZWFjaCIsIl9pbml0IiwiX3RoaXMiLCJmbnMiLCJwbGdzIiwiZm9yRWFjaCIsInAiLCJmb3VuZGF0aW9uIiwiT2JqZWN0IiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibGVuZ3RoIiwibmFtZXNwYWNlIiwiTWF0aCIsInJvdW5kIiwicG93IiwicmFuZG9tIiwidG9TdHJpbmciLCJzbGljZSIsInJlZmxvdyIsImVsZW0iLCJpIiwiJGVsZW0iLCJmaW5kIiwiYWRkQmFjayIsIiRlbCIsIm9wdHMiLCJ3YXJuIiwidGhpbmciLCJzcGxpdCIsImUiLCJvcHQiLCJtYXAiLCJlbCIsInRyaW0iLCJwYXJzZVZhbHVlIiwiZXIiLCJnZXRGbk5hbWUiLCJ0cmFuc2l0aW9uZW5kIiwidHJhbnNpdGlvbnMiLCJlbmQiLCJ0Iiwic3R5bGUiLCJ0cmlnZ2VySGFuZGxlciIsInV0aWwiLCJ0aHJvdHRsZSIsImZ1bmMiLCJkZWxheSIsImNvbnRleHQiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJtZXRob2QiLCIkbWV0YSIsIiRub0pTIiwiYXBwZW5kVG8iLCJoZWFkIiwicmVtb3ZlQ2xhc3MiLCJNZWRpYVF1ZXJ5IiwiY2FsbCIsInBsdWdDbGFzcyIsIlJlZmVyZW5jZUVycm9yIiwiVHlwZUVycm9yIiwiZm4iLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInZlbmRvcnMiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ2cCIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImxhc3RUaW1lIiwiY2FsbGJhY2siLCJuZXh0VGltZSIsIm1heCIsInBlcmZvcm1hbmNlIiwic3RhcnQiLCJGdW5jdGlvbiIsImJpbmQiLCJvVGhpcyIsImFBcmdzIiwiZlRvQmluZCIsImZOT1AiLCJmQm91bmQiLCJjb25jYXQiLCJmdW5jTmFtZVJlZ2V4IiwicmVzdWx0cyIsImV4ZWMiLCJzdHIiLCJpc05hTiIsInBhcnNlRmxvYXQiLCJyZXBsYWNlIiwialF1ZXJ5IiwiQm94IiwiSW1Ob3RUb3VjaGluZ1lvdSIsIkdldERpbWVuc2lvbnMiLCJHZXRPZmZzZXRzIiwiZWxlbWVudCIsInBhcmVudCIsImxyT25seSIsInRiT25seSIsImVsZURpbXMiLCJ0b3AiLCJib3R0b20iLCJsZWZ0IiwicmlnaHQiLCJwYXJEaW1zIiwib2Zmc2V0IiwiaGVpZ2h0Iiwid2lkdGgiLCJ3aW5kb3dEaW1zIiwiYWxsRGlycyIsIkVycm9yIiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInBhclJlY3QiLCJwYXJlbnROb2RlIiwid2luUmVjdCIsIndpblkiLCJwYWdlWU9mZnNldCIsIndpblgiLCJwYWdlWE9mZnNldCIsInBhcmVudERpbXMiLCJhbmNob3IiLCJwb3NpdGlvbiIsInZPZmZzZXQiLCJoT2Zmc2V0IiwiaXNPdmVyZmxvdyIsIiRlbGVEaW1zIiwiJGFuY2hvckRpbXMiLCJrZXlDb2RlcyIsImNvbW1hbmRzIiwiS2V5Ym9hcmQiLCJnZXRLZXlDb2RlcyIsInBhcnNlS2V5IiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9VcHBlckNhc2UiLCJzaGlmdEtleSIsImN0cmxLZXkiLCJhbHRLZXkiLCJoYW5kbGVLZXkiLCJjb21wb25lbnQiLCJmdW5jdGlvbnMiLCJjb21tYW5kTGlzdCIsImNtZHMiLCJjb21tYW5kIiwibHRyIiwiZXh0ZW5kIiwicmV0dXJuVmFsdWUiLCJoYW5kbGVkIiwidW5oYW5kbGVkIiwiZmluZEZvY3VzYWJsZSIsImZpbHRlciIsImlzIiwicmVnaXN0ZXIiLCJjb21wb25lbnROYW1lIiwia2NzIiwiayIsImtjIiwiZGVmYXVsdFF1ZXJpZXMiLCJsYW5kc2NhcGUiLCJwb3J0cmFpdCIsInJldGluYSIsInF1ZXJpZXMiLCJjdXJyZW50Iiwic2VsZiIsImV4dHJhY3RlZFN0eWxlcyIsImNzcyIsIm5hbWVkUXVlcmllcyIsInBhcnNlU3R5bGVUb09iamVjdCIsImhhc093blByb3BlcnR5IiwiX2dldEN1cnJlbnRTaXplIiwiX3dhdGNoZXIiLCJhdExlYXN0Iiwic2l6ZSIsInF1ZXJ5IiwiZ2V0IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJtYXRjaGVkIiwib24iLCJuZXdTaXplIiwiY3VycmVudFNpemUiLCJzdHlsZU1lZGlhIiwibWVkaWEiLCJzY3JpcHQiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsImluZm8iLCJpZCIsImluc2VydEJlZm9yZSIsImdldENvbXB1dGVkU3R5bGUiLCJjdXJyZW50U3R5bGUiLCJtYXRjaE1lZGl1bSIsInRleHQiLCJzdHlsZVNoZWV0IiwiY3NzVGV4dCIsInRleHRDb250ZW50Iiwic3R5bGVPYmplY3QiLCJyZWR1Y2UiLCJyZXQiLCJwYXJhbSIsInBhcnRzIiwidmFsIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiaXNBcnJheSIsImluaXRDbGFzc2VzIiwiYWN0aXZlQ2xhc3NlcyIsIk1vdGlvbiIsImFuaW1hdGVJbiIsImFuaW1hdGlvbiIsImNiIiwiYW5pbWF0ZSIsImFuaW1hdGVPdXQiLCJNb3ZlIiwiZHVyYXRpb24iLCJhbmltIiwicHJvZyIsIm1vdmUiLCJ0cyIsImlzSW4iLCJlcSIsImluaXRDbGFzcyIsImFjdGl2ZUNsYXNzIiwicmVzZXQiLCJhZGRDbGFzcyIsInNob3ciLCJvZmZzZXRXaWR0aCIsIm9uZSIsImZpbmlzaCIsImhpZGUiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJOZXN0IiwiRmVhdGhlciIsIm1lbnUiLCJpdGVtcyIsInN1Yk1lbnVDbGFzcyIsInN1Ykl0ZW1DbGFzcyIsImhhc1N1YkNsYXNzIiwiJGl0ZW0iLCIkc3ViIiwiY2hpbGRyZW4iLCJCdXJuIiwiVGltZXIiLCJvcHRpb25zIiwibmFtZVNwYWNlIiwicmVtYWluIiwiaXNQYXVzZWQiLCJyZXN0YXJ0IiwiaW5maW5pdGUiLCJwYXVzZSIsIm9uSW1hZ2VzTG9hZGVkIiwiaW1hZ2VzIiwidW5sb2FkZWQiLCJjb21wbGV0ZSIsInNpbmdsZUltYWdlTG9hZGVkIiwibmF0dXJhbFdpZHRoIiwic3BvdFN3aXBlIiwiZW5hYmxlZCIsImRvY3VtZW50RWxlbWVudCIsInByZXZlbnREZWZhdWx0IiwibW92ZVRocmVzaG9sZCIsInRpbWVUaHJlc2hvbGQiLCJzdGFydFBvc1giLCJzdGFydFBvc1kiLCJzdGFydFRpbWUiLCJlbGFwc2VkVGltZSIsImlzTW92aW5nIiwib25Ub3VjaEVuZCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJvblRvdWNoTW92ZSIsIngiLCJ0b3VjaGVzIiwicGFnZVgiLCJ5IiwicGFnZVkiLCJkeCIsImR5IiwiZGlyIiwiYWJzIiwib25Ub3VjaFN0YXJ0IiwiaW5pdCIsInRlYXJkb3duIiwic3BlY2lhbCIsInN3aXBlIiwic2V0dXAiLCJub29wIiwiYWRkVG91Y2giLCJoYW5kbGVUb3VjaCIsImNoYW5nZWRUb3VjaGVzIiwiZmlyc3QiLCJldmVudFR5cGVzIiwidG91Y2hzdGFydCIsInRvdWNobW92ZSIsInRvdWNoZW5kIiwic2ltdWxhdGVkRXZlbnQiLCJNb3VzZUV2ZW50Iiwic2NyZWVuWCIsInNjcmVlblkiLCJjbGllbnRYIiwiY2xpZW50WSIsImNyZWF0ZUV2ZW50IiwiaW5pdE1vdXNlRXZlbnQiLCJkaXNwYXRjaEV2ZW50IiwiTXV0YXRpb25PYnNlcnZlciIsInByZWZpeGVzIiwidHJpZ2dlcnMiLCJzdG9wUHJvcGFnYXRpb24iLCJmYWRlT3V0IiwiY2hlY2tMaXN0ZW5lcnMiLCJldmVudHNMaXN0ZW5lciIsInJlc2l6ZUxpc3RlbmVyIiwic2Nyb2xsTGlzdGVuZXIiLCJjbG9zZW1lTGlzdGVuZXIiLCJ5ZXRpQm94ZXMiLCJwbHVnTmFtZXMiLCJsaXN0ZW5lcnMiLCJqb2luIiwib2ZmIiwicGx1Z2luSWQiLCJub3QiLCJkZWJvdW5jZSIsIiRub2RlcyIsIm5vZGVzIiwicXVlcnlTZWxlY3RvckFsbCIsImxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24iLCJtdXRhdGlvblJlY29yZHNMaXN0IiwiJHRhcmdldCIsImVsZW1lbnRPYnNlcnZlciIsIm9ic2VydmUiLCJhdHRyaWJ1dGVzIiwiY2hpbGRMaXN0IiwiY2hhcmFjdGVyRGF0YSIsInN1YnRyZWUiLCJhdHRyaWJ1dGVGaWx0ZXIiLCJJSGVhcllvdSIsIkRyb3Bkb3duTWVudSIsImRlZmF1bHRzIiwic3VicyIsIiRtZW51SXRlbXMiLCIkdGFicyIsInZlcnRpY2FsQ2xhc3MiLCJoYXNDbGFzcyIsInJpZ2h0Q2xhc3MiLCJhbGlnbm1lbnQiLCJwYXJlbnRzIiwiY2hhbmdlZCIsIl9ldmVudHMiLCJoYXNUb3VjaCIsIm9udG91Y2hzdGFydCIsInBhckNsYXNzIiwiaGFuZGxlQ2xpY2tGbiIsInBhcmVudHNVbnRpbCIsImhhc1N1YiIsImhhc0NsaWNrZWQiLCJjbG9zZU9uQ2xpY2siLCJjbGlja09wZW4iLCJmb3JjZUZvbGxvdyIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsIl9oaWRlIiwiX3Nob3ciLCJhZGQiLCJjbG9zZU9uQ2xpY2tJbnNpZGUiLCJkaXNhYmxlSG92ZXIiLCJob3ZlckRlbGF5IiwiYXV0b2Nsb3NlIiwiY2xvc2luZ1RpbWUiLCJpc1RhYiIsImluZGV4IiwiJGVsZW1lbnRzIiwic2libGluZ3MiLCIkcHJldkVsZW1lbnQiLCIkbmV4dEVsZW1lbnQiLCJuZXh0U2libGluZyIsImZvY3VzIiwicHJldlNpYmxpbmciLCJvcGVuU3ViIiwiY2xvc2VTdWIiLCJjbG9zZSIsIm9wZW4iLCJfaXNWZXJ0aWNhbCIsImRvd24iLCJ1cCIsIm5leHQiLCJwcmV2aW91cyIsIiRib2R5IiwiJGxpbmsiLCJpZHgiLCIkc2licyIsImNsZWFyIiwib2xkQ2xhc3MiLCIkcGFyZW50TGkiLCJfYWRkQm9keUhhbmRsZXIiLCIkdG9DbG9zZSIsInNvbWV0aGluZ1RvQ2xvc2UiLCJPZmZDYW52YXMiLCIkbGFzdFRyaWdnZXIiLCIkdHJpZ2dlcnMiLCIkZXhpdGVyIiwiZXhpdGVyIiwiYXBwZW5kIiwiaXNSZXZlYWxlZCIsIlJlZ0V4cCIsInJldmVhbENsYXNzIiwicmV2ZWFsT24iLCJtYXRjaCIsIl9zZXRNUUNoZWNrZXIiLCJ0cmFuc2l0aW9uVGltZSIsInRvZ2dsZSIsIl9oYW5kbGVLZXlib2FyZCIsInJldmVhbCIsIiRjbG9zZXIiLCJmb3JjZVRvcCIsInNjcm9sbFRvcCIsIiR3cmFwcGVyIiwiYXV0b0ZvY3VzIiwidHJhcEZvY3VzIiwiZm9jdXNhYmxlIiwibGFzdCIsImEiLCJkZWZpbmUiLCJhbWQiLCJleHBvcnRzIiwibW9kdWxlIiwicmVxdWlyZSIsImIiLCJTbGljayIsImMiLCJkIiwiZiIsImFjY2Vzc2liaWxpdHkiLCJhZGFwdGl2ZUhlaWdodCIsImFwcGVuZEFycm93cyIsImFwcGVuZERvdHMiLCJhcnJvd3MiLCJhc05hdkZvciIsInByZXZBcnJvdyIsIm5leHRBcnJvdyIsImF1dG9wbGF5IiwiYXV0b3BsYXlTcGVlZCIsImNlbnRlck1vZGUiLCJjZW50ZXJQYWRkaW5nIiwiY3NzRWFzZSIsImN1c3RvbVBhZ2luZyIsImRvdHMiLCJkb3RzQ2xhc3MiLCJkcmFnZ2FibGUiLCJlYXNpbmciLCJlZGdlRnJpY3Rpb24iLCJmYWRlIiwiZm9jdXNPblNlbGVjdCIsImluaXRpYWxTbGlkZSIsImxhenlMb2FkIiwibW9iaWxlRmlyc3QiLCJwYXVzZU9uSG92ZXIiLCJwYXVzZU9uRm9jdXMiLCJwYXVzZU9uRG90c0hvdmVyIiwicmVzcG9uZFRvIiwicmVzcG9uc2l2ZSIsInJvd3MiLCJzbGlkZSIsInNsaWRlc1BlclJvdyIsInNsaWRlc1RvU2hvdyIsInNsaWRlc1RvU2Nyb2xsIiwic3BlZWQiLCJzd2lwZVRvU2xpZGUiLCJ0b3VjaE1vdmUiLCJ0b3VjaFRocmVzaG9sZCIsInVzZUNTUyIsInVzZVRyYW5zZm9ybSIsInZhcmlhYmxlV2lkdGgiLCJ2ZXJ0aWNhbCIsInZlcnRpY2FsU3dpcGluZyIsIndhaXRGb3JBbmltYXRlIiwiekluZGV4IiwiaW5pdGlhbHMiLCJhbmltYXRpbmciLCJkcmFnZ2luZyIsImF1dG9QbGF5VGltZXIiLCJjdXJyZW50RGlyZWN0aW9uIiwiY3VycmVudExlZnQiLCJjdXJyZW50U2xpZGUiLCJkaXJlY3Rpb24iLCIkZG90cyIsImxpc3RXaWR0aCIsImxpc3RIZWlnaHQiLCJsb2FkSW5kZXgiLCIkbmV4dEFycm93IiwiJHByZXZBcnJvdyIsInNsaWRlQ291bnQiLCJzbGlkZVdpZHRoIiwiJHNsaWRlVHJhY2siLCIkc2xpZGVzIiwic2xpZGluZyIsInNsaWRlT2Zmc2V0Iiwic3dpcGVMZWZ0IiwiJGxpc3QiLCJ0b3VjaE9iamVjdCIsInRyYW5zZm9ybXNFbmFibGVkIiwidW5zbGlja2VkIiwiYWN0aXZlQnJlYWtwb2ludCIsImFuaW1UeXBlIiwiYW5pbVByb3AiLCJicmVha3BvaW50cyIsImJyZWFrcG9pbnRTZXR0aW5ncyIsImNzc1RyYW5zaXRpb25zIiwiZm9jdXNzZWQiLCJpbnRlcnJ1cHRlZCIsImhpZGRlbiIsInBhdXNlZCIsInBvc2l0aW9uUHJvcCIsInJvd0NvdW50Iiwic2hvdWxkQ2xpY2siLCIkc2xpZGVyIiwiJHNsaWRlc0NhY2hlIiwidHJhbnNmb3JtVHlwZSIsInRyYW5zaXRpb25UeXBlIiwidmlzaWJpbGl0eUNoYW5nZSIsIndpbmRvd1dpZHRoIiwid2luZG93VGltZXIiLCJvcmlnaW5hbFNldHRpbmdzIiwibW96SGlkZGVuIiwid2Via2l0SGlkZGVuIiwiYXV0b1BsYXkiLCJwcm94eSIsImF1dG9QbGF5Q2xlYXIiLCJhdXRvUGxheUl0ZXJhdG9yIiwiY2hhbmdlU2xpZGUiLCJjbGlja0hhbmRsZXIiLCJzZWxlY3RIYW5kbGVyIiwic2V0UG9zaXRpb24iLCJzd2lwZUhhbmRsZXIiLCJkcmFnSGFuZGxlciIsImtleUhhbmRsZXIiLCJpbnN0YW5jZVVpZCIsImh0bWxFeHByIiwicmVnaXN0ZXJCcmVha3BvaW50cyIsImFjdGl2YXRlQURBIiwidGFiaW5kZXgiLCJhZGRTbGlkZSIsInNsaWNrQWRkIiwidW5sb2FkIiwiaW5zZXJ0QWZ0ZXIiLCJwcmVwZW5kVG8iLCJkZXRhY2giLCJyZWluaXQiLCJhbmltYXRlSGVpZ2h0Iiwib3V0ZXJIZWlnaHQiLCJhbmltYXRlU2xpZGUiLCJhbmltU3RhcnQiLCJzdGVwIiwiY2VpbCIsImFwcGx5VHJhbnNpdGlvbiIsImRpc2FibGVUcmFuc2l0aW9uIiwiZ2V0TmF2VGFyZ2V0Iiwic2xpY2siLCJzbGlkZUhhbmRsZXIiLCJzZXRJbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJidWlsZEFycm93cyIsImJ1aWxkRG90cyIsImdldERvdENvdW50IiwiYnVpbGRPdXQiLCJ3cmFwQWxsIiwid3JhcCIsInNldHVwSW5maW5pdGUiLCJ1cGRhdGVEb3RzIiwic2V0U2xpZGVDbGFzc2VzIiwiYnVpbGRSb3dzIiwiZyIsImgiLCJjcmVhdGVEb2N1bWVudEZyYWdtZW50IiwiaiIsImFwcGVuZENoaWxkIiwiZW1wdHkiLCJkaXNwbGF5IiwiY2hlY2tSZXNwb25zaXZlIiwiaW5uZXJXaWR0aCIsIm1pbiIsInVuc2xpY2siLCJyZWZyZXNoIiwiY3VycmVudFRhcmdldCIsImNsb3Nlc3QiLCJtZXNzYWdlIiwiY2hlY2tOYXZpZ2FibGUiLCJnZXROYXZpZ2FibGVJbmRleGVzIiwiY2xlYW5VcEV2ZW50cyIsImludGVycnVwdCIsInZpc2liaWxpdHkiLCJjbGVhblVwU2xpZGVFdmVudHMiLCJvcmllbnRhdGlvbkNoYW5nZSIsInJlc2l6ZSIsImNsZWFuVXBSb3dzIiwiZGVzdHJveSIsInJlbW92ZSIsImZhZGVTbGlkZSIsIm9wYWNpdHkiLCJmYWRlU2xpZGVPdXQiLCJmaWx0ZXJTbGlkZXMiLCJzbGlja0ZpbHRlciIsImZvY3VzSGFuZGxlciIsImdldEN1cnJlbnQiLCJzbGlja0N1cnJlbnRTbGlkZSIsImdldExlZnQiLCJmbG9vciIsIm9mZnNldExlZnQiLCJvdXRlcldpZHRoIiwiZ2V0T3B0aW9uIiwic2xpY2tHZXRPcHRpb24iLCJnZXRTbGljayIsImdldFNsaWRlQ291bnQiLCJnb1RvIiwic2xpY2tHb1RvIiwicGFyc2VJbnQiLCJzZXRQcm9wcyIsInN0YXJ0TG9hZCIsImxvYWRTbGlkZXIiLCJpbml0aWFsaXplRXZlbnRzIiwidXBkYXRlQXJyb3dzIiwiaW5pdEFEQSIsInJvbGUiLCJpbml0QXJyb3dFdmVudHMiLCJpbml0RG90RXZlbnRzIiwiaW5pdFNsaWRlRXZlbnRzIiwiYWN0aW9uIiwiaW5pdFVJIiwidGFnTmFtZSIsIm9ubG9hZCIsIm9uZXJyb3IiLCJzcmMiLCJwcm9ncmVzc2l2ZUxhenlMb2FkIiwic2xpY2tOZXh0Iiwic2xpY2tQYXVzZSIsInBsYXkiLCJzbGlja1BsYXkiLCJwb3N0U2xpZGUiLCJwcmV2Iiwic2xpY2tQcmV2IiwiYnJlYWtwb2ludCIsInNldHRpbmdzIiwic29ydCIsIndpbmRvd0RlbGF5IiwicmVtb3ZlU2xpZGUiLCJzbGlja1JlbW92ZSIsInNldENTUyIsInNldERpbWVuc2lvbnMiLCJwYWRkaW5nIiwic2V0RmFkZSIsInNldEhlaWdodCIsInNldE9wdGlvbiIsInNsaWNrU2V0T3B0aW9uIiwiV2Via2l0VHJhbnNpdGlvbiIsIk1velRyYW5zaXRpb24iLCJtc1RyYW5zaXRpb24iLCJPVHJhbnNmb3JtIiwicGVyc3BlY3RpdmVQcm9wZXJ0eSIsIndlYmtpdFBlcnNwZWN0aXZlIiwiTW96VHJhbnNmb3JtIiwiTW96UGVyc3BlY3RpdmUiLCJ3ZWJraXRUcmFuc2Zvcm0iLCJtc1RyYW5zZm9ybSIsInRyYW5zZm9ybSIsImNsb25lIiwic3dpcGVEaXJlY3Rpb24iLCJzdGFydFgiLCJjdXJYIiwic3RhcnRZIiwiY3VyWSIsImF0YW4yIiwiUEkiLCJzd2lwZUVuZCIsInN3aXBlTGVuZ3RoIiwiZWRnZUhpdCIsIm1pblN3aXBlIiwiZmluZ2VyQ291bnQiLCJvcmlnaW5hbEV2ZW50Iiwic3dpcGVTdGFydCIsInN3aXBlTW92ZSIsInNxcnQiLCJ1bmZpbHRlclNsaWRlcyIsInNsaWNrVW5maWx0ZXIiLCJsYXp5U2l6ZXMiLCJnZXRFbGVtZW50c0J5Q2xhc3NOYW1lIiwiSFRNTFBpY3R1cmVFbGVtZW50IiwibCIsInJlcXVlc3RJZGxlQ2FsbGJhY2siLCJtIiwibiIsIm8iLCJxIiwiciIsInMiLCJ1IiwiaW5pdEN1c3RvbUV2ZW50IiwidiIsInBpY3R1cmVmaWxsIiwicGYiLCJyZWV2YWx1YXRlIiwiZWxlbWVudHMiLCJ3IiwibWluU2l6ZSIsIl9sYXp5c2l6ZXNXaWR0aCIsInNoaWZ0IiwiX2xzRmx1c2giLCJ6IiwiQSIsInRpbWVvdXQiLCJCIiwiQyIsIkUiLCJGIiwiRyIsIkgiLCJJIiwiSiIsIksiLCJMIiwiTSIsIk4iLCJPIiwiUCIsIlEiLCJSIiwiUyIsIlQiLCJVIiwib2Zmc2V0UGFyZW50IiwiViIsImxvYWRNb2RlIiwiZXhwYW5kIiwiY2xpZW50SGVpZ2h0IiwiY2xpZW50V2lkdGgiLCJleHBGYWN0b3IiLCJfbGF6eVJhY2UiLCJpbm5lckhlaWdodCIsImJhIiwicHJlbG9hZEFmdGVyTG9hZCIsInNpemVzQXR0ciIsIlciLCJYIiwibG9hZGVkQ2xhc3MiLCJsb2FkaW5nQ2xhc3MiLCJaIiwiWSIsImNvbnRlbnRXaW5kb3ciLCJsb2NhdGlvbiIsIl8iLCJzcmNzZXRBdHRyIiwiY3VzdG9tTWVkaWEiLCJjbG9uZU5vZGUiLCJyZW1vdmVDaGlsZCIsImFhIiwiZGVmYXVsdFByZXZlbnRlZCIsImF1dG9zaXplc0NsYXNzIiwic3JjQXR0ciIsImZpcmVzTG9hZCIsImxhenlDbGFzcyIsInNyY3NldCIsImVycm9yQ2xhc3MiLCJkZXRhaWwiLCJEIiwidXBkYXRlRWxlbSIsImNhIiwicHJlbG9hZENsYXNzIiwiaEZhYyIsInJlYWR5U3RhdGUiLCJjaGVja0VsZW1zIiwidW52ZWlsIiwiZGF0YUF0dHIiLCJsYXp5U2l6ZXNDb25maWciLCJsYXp5c2l6ZXNDb25maWciLCJjZmciLCJhdXRvU2l6ZXIiLCJsb2FkZXIiLCJ1UCIsImFDIiwickMiLCJoQyIsImZpcmUiLCJnVyIsInJBRiJdLCJtYXBwaW5ncyI6Ijs7QUFBQUEsT0FBT0MsU0FBUCxHQUFvQixZQUFXOztBQUU3Qjs7QUFFQTs7Ozs7O0FBTUE7O0FBQ0EsTUFBSUMsYUFBYSxFQUFqQjs7QUFFQTtBQUNBLE1BQUlDLElBQUo7O0FBRUE7QUFDQSxNQUFJQyxTQUFTLEtBQWI7O0FBRUE7QUFDQSxNQUFJQyxlQUFlLElBQW5COztBQUVBO0FBQ0EsTUFBSUMsa0JBQWtCLENBQ3BCLFFBRG9CLEVBRXBCLFVBRm9CLEVBR3BCLE1BSG9CLEVBSXBCLE9BSm9CLEVBS3BCLE9BTG9CLEVBTXBCLE9BTm9CLEVBT3BCLFFBUG9CLENBQXRCOztBQVVBO0FBQ0E7QUFDQSxNQUFJQyxhQUFhQyxhQUFqQjs7QUFFQTtBQUNBO0FBQ0EsTUFBSUMsWUFBWSxDQUNkLEVBRGMsRUFDVjtBQUNKLElBRmMsRUFFVjtBQUNKLElBSGMsRUFHVjtBQUNKLElBSmMsRUFJVjtBQUNKLElBTGMsQ0FLVjtBQUxVLEdBQWhCOztBQVFBO0FBQ0EsTUFBSUMsV0FBVztBQUNiLGVBQVcsVUFERTtBQUViLGFBQVMsVUFGSTtBQUdiLGlCQUFhLE9BSEE7QUFJYixpQkFBYSxPQUpBO0FBS2IscUJBQWlCLFNBTEo7QUFNYixx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RCxFQUF1RHlGLE1BQUt0RixDQUE1RCxFQUE4RHVGLElBQUc1ZixDQUFqRSxFQUFtRTZmLEtBQUkxZixDQUF2RSxFQUF4YjtBQUFrZ0I7QUFBQyxDQUEzeU0sQ0FBRDs7O0FDREEsQ0FBQyxVQUFTblQsQ0FBVCxFQUFZO0FBQ1RBLE1BQUViLFFBQUYsRUFBWWlELFVBQVo7QUFDSCxDQUZELEVBRUd5RixNQUZIIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy53aGF0SW5wdXQgPSAoZnVuY3Rpb24oKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgdmFyaWFibGVzXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gYXJyYXkgb2YgYWN0aXZlbHkgcHJlc3NlZCBrZXlzXG4gIHZhciBhY3RpdmVLZXlzID0gW107XG5cbiAgLy8gY2FjaGUgZG9jdW1lbnQuYm9keVxuICB2YXIgYm9keTtcblxuICAvLyBib29sZWFuOiB0cnVlIGlmIHRvdWNoIGJ1ZmZlciB0aW1lciBpcyBydW5uaW5nXG4gIHZhciBidWZmZXIgPSBmYWxzZTtcblxuICAvLyB0aGUgbGFzdCB1c2VkIGlucHV0IHR5cGVcbiAgdmFyIGN1cnJlbnRJbnB1dCA9IG51bGw7XG5cbiAgLy8gYGlucHV0YCB0eXBlcyB0aGF0IGRvbid0IGFjY2VwdCB0ZXh0XG4gIHZhciBub25UeXBpbmdJbnB1dHMgPSBbXG4gICAgJ2J1dHRvbicsXG4gICAgJ2NoZWNrYm94JyxcbiAgICAnZmlsZScsXG4gICAgJ2ltYWdlJyxcbiAgICAncmFkaW8nLFxuICAgICdyZXNldCcsXG4gICAgJ3N1Ym1pdCdcbiAgXTtcblxuICAvLyBkZXRlY3QgdmVyc2lvbiBvZiBtb3VzZSB3aGVlbCBldmVudCB0byB1c2VcbiAgLy8gdmlhIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbFxuICB2YXIgbW91c2VXaGVlbCA9IGRldGVjdFdoZWVsKCk7XG5cbiAgLy8gbGlzdCBvZiBtb2RpZmllciBrZXlzIGNvbW1vbmx5IHVzZWQgd2l0aCB0aGUgbW91c2UgYW5kXG4gIC8vIGNhbiBiZSBzYWZlbHkgaWdub3JlZCB0byBwcmV2ZW50IGZhbHNlIGtleWJvYXJkIGRldGVjdGlvblxuICB2YXIgaWdub3JlTWFwID0gW1xuICAgIDE2LCAvLyBzaGlmdFxuICAgIDE3LCAvLyBjb250cm9sXG4gICAgMTgsIC8vIGFsdFxuICAgIDkxLCAvLyBXaW5kb3dzIGtleSAvIGxlZnQgQXBwbGUgY21kXG4gICAgOTMgIC8vIFdpbmRvd3MgbWVudSAvIHJpZ2h0IEFwcGxlIGNtZFxuICBdO1xuXG4gIC8vIG1hcHBpbmcgb2YgZXZlbnRzIHRvIGlucHV0IHR5cGVzXG4gIHZhciBpbnB1dE1hcCA9IHtcbiAgICAna2V5ZG93bic6ICdrZXlib2FyZCcsXG4gICAgJ2tleXVwJzogJ2tleWJvYXJkJyxcbiAgICAnbW91c2Vkb3duJzogJ21vdXNlJyxcbiAgICAnbW91c2Vtb3ZlJzogJ21vdXNlJyxcbiAgICAnTVNQb2ludGVyRG93bic6ICdwb2ludGVyJyxcbiAgICAnTVNQb2ludGVyTW92ZSc6ICdwb2ludGVyJyxcbiAgICAncG9pbnRlcmRvd24nOiAncG9pbnRlcicsXG4gICAgJ3BvaW50ZXJtb3ZlJzogJ3BvaW50ZXInLFxuICAgICd0b3VjaHN0YXJ0JzogJ3RvdWNoJ1xuICB9O1xuXG4gIC8vIGFkZCBjb3JyZWN0IG1vdXNlIHdoZWVsIGV2ZW50IG1hcHBpbmcgdG8gYGlucHV0TWFwYFxuICBpbnB1dE1hcFtkZXRlY3RXaGVlbCgpXSA9ICdtb3VzZSc7XG5cbiAgLy8gYXJyYXkgb2YgYWxsIHVzZWQgaW5wdXQgdHlwZXNcbiAgdmFyIGlucHV0VHlwZXMgPSBbXTtcblxuICAvLyBtYXBwaW5nIG9mIGtleSBjb2RlcyB0byBhIGNvbW1vbiBuYW1lXG4gIHZhciBrZXlNYXAgPSB7XG4gICAgOTogJ3RhYicsXG4gICAgMTM6ICdlbnRlcicsXG4gICAgMTY6ICdzaGlmdCcsXG4gICAgMjc6ICdlc2MnLFxuICAgIDMyOiAnc3BhY2UnLFxuICAgIDM3OiAnbGVmdCcsXG4gICAgMzg6ICd1cCcsXG4gICAgMzk6ICdyaWdodCcsXG4gICAgNDA6ICdkb3duJ1xuICB9O1xuXG4gIC8vIG1hcCBvZiBJRSAxMCBwb2ludGVyIGV2ZW50c1xuICB2YXIgcG9pbnRlck1hcCA9IHtcbiAgICAyOiAndG91Y2gnLFxuICAgIDM6ICd0b3VjaCcsIC8vIHRyZWF0IHBlbiBsaWtlIHRvdWNoXG4gICAgNDogJ21vdXNlJ1xuICB9O1xuXG4gIC8vIHRvdWNoIGJ1ZmZlciB0aW1lclxuICB2YXIgdGltZXI7XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGFsbG93cyBldmVudHMgdGhhdCBhcmUgYWxzbyB0cmlnZ2VyZWQgdG8gYmUgZmlsdGVyZWQgb3V0IGZvciBgdG91Y2hzdGFydGBcbiAgZnVuY3Rpb24gZXZlbnRCdWZmZXIoKSB7XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIHNldElucHV0KGV2ZW50KTtcblxuICAgIGJ1ZmZlciA9IHRydWU7XG4gICAgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGJ1ZmZlciA9IGZhbHNlO1xuICAgIH0sIDY1MCk7XG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJlZEV2ZW50KGV2ZW50KSB7XG4gICAgaWYgKCFidWZmZXIpIHNldElucHV0KGV2ZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVuQnVmZmVyZWRFdmVudChldmVudCkge1xuICAgIGNsZWFyVGltZXIoKTtcbiAgICBzZXRJbnB1dChldmVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhclRpbWVyKCkge1xuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0SW5wdXQoZXZlbnQpIHtcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xuICAgIHZhciB2YWx1ZSA9IGlucHV0TWFwW2V2ZW50LnR5cGVdO1xuICAgIGlmICh2YWx1ZSA9PT0gJ3BvaW50ZXInKSB2YWx1ZSA9IHBvaW50ZXJUeXBlKGV2ZW50KTtcblxuICAgIC8vIGRvbid0IGRvIGFueXRoaW5nIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBpbnB1dCB0eXBlIGFscmVhZHkgc2V0XG4gICAgaWYgKGN1cnJlbnRJbnB1dCAhPT0gdmFsdWUpIHtcbiAgICAgIHZhciBldmVudFRhcmdldCA9IHRhcmdldChldmVudCk7XG4gICAgICB2YXIgZXZlbnRUYXJnZXROb2RlID0gZXZlbnRUYXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciBldmVudFRhcmdldFR5cGUgPSAoZXZlbnRUYXJnZXROb2RlID09PSAnaW5wdXQnKSA/IGV2ZW50VGFyZ2V0LmdldEF0dHJpYnV0ZSgndHlwZScpIDogbnVsbDtcblxuICAgICAgaWYgKFxuICAgICAgICAoLy8gb25seSBpZiB0aGUgdXNlciBmbGFnIHRvIGFsbG93IHR5cGluZyBpbiBmb3JtIGZpZWxkcyBpc24ndCBzZXRcbiAgICAgICAgIWJvZHkuaGFzQXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dC1mb3JtdHlwaW5nJykgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIGN1cnJlbnRJbnB1dCBoYXMgYSB2YWx1ZVxuICAgICAgICBjdXJyZW50SW5wdXQgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIHRoZSBpbnB1dCBpcyBga2V5Ym9hcmRgXG4gICAgICAgIHZhbHVlID09PSAna2V5Ym9hcmQnICYmXG5cbiAgICAgICAgLy8gbm90IGlmIHRoZSBrZXkgaXMgYFRBQmBcbiAgICAgICAga2V5TWFwW2V2ZW50S2V5XSAhPT0gJ3RhYicgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIHRoZSB0YXJnZXQgaXMgYSBmb3JtIGlucHV0IHRoYXQgYWNjZXB0cyB0ZXh0XG4gICAgICAgIChcbiAgICAgICAgICAgZXZlbnRUYXJnZXROb2RlID09PSAndGV4dGFyZWEnIHx8XG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3NlbGVjdCcgfHxcbiAgICAgICAgICAgKGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ2lucHV0JyAmJiBub25UeXBpbmdJbnB1dHMuaW5kZXhPZihldmVudFRhcmdldFR5cGUpIDwgMClcbiAgICAgICAgKSkgfHwgKFxuICAgICAgICAgIC8vIGlnbm9yZSBtb2RpZmllciBrZXlzXG4gICAgICAgICAgaWdub3JlTWFwLmluZGV4T2YoZXZlbnRLZXkpID4gLTFcbiAgICAgICAgKVxuICAgICAgKSB7XG4gICAgICAgIC8vIGlnbm9yZSBrZXlib2FyZCB0eXBpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaElucHV0KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09ICdrZXlib2FyZCcpIGxvZ0tleXMoZXZlbnRLZXkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3dpdGNoSW5wdXQoc3RyaW5nKSB7XG4gICAgY3VycmVudElucHV0ID0gc3RyaW5nO1xuICAgIGJvZHkuc2V0QXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dCcsIGN1cnJlbnRJbnB1dCk7XG5cbiAgICBpZiAoaW5wdXRUeXBlcy5pbmRleE9mKGN1cnJlbnRJbnB1dCkgPT09IC0xKSBpbnB1dFR5cGVzLnB1c2goY3VycmVudElucHV0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleShldmVudCkge1xuICAgIHJldHVybiAoZXZlbnQua2V5Q29kZSkgPyBldmVudC5rZXlDb2RlIDogZXZlbnQud2hpY2g7XG4gIH1cblxuICBmdW5jdGlvbiB0YXJnZXQoZXZlbnQpIHtcbiAgICByZXR1cm4gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LnNyY0VsZW1lbnQ7XG4gIH1cblxuICBmdW5jdGlvbiBwb2ludGVyVHlwZShldmVudCkge1xuICAgIGlmICh0eXBlb2YgZXZlbnQucG9pbnRlclR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gcG9pbnRlck1hcFtldmVudC5wb2ludGVyVHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAoZXZlbnQucG9pbnRlclR5cGUgPT09ICdwZW4nKSA/ICd0b3VjaCcgOiBldmVudC5wb2ludGVyVHlwZTsgLy8gdHJlYXQgcGVuIGxpa2UgdG91Y2hcbiAgICB9XG4gIH1cblxuICAvLyBrZXlib2FyZCBsb2dnaW5nXG4gIGZ1bmN0aW9uIGxvZ0tleXMoZXZlbnRLZXkpIHtcbiAgICBpZiAoYWN0aXZlS2V5cy5pbmRleE9mKGtleU1hcFtldmVudEtleV0pID09PSAtMSAmJiBrZXlNYXBbZXZlbnRLZXldKSBhY3RpdmVLZXlzLnB1c2goa2V5TWFwW2V2ZW50S2V5XSk7XG4gIH1cblxuICBmdW5jdGlvbiB1bkxvZ0tleXMoZXZlbnQpIHtcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xuICAgIHZhciBhcnJheVBvcyA9IGFjdGl2ZUtleXMuaW5kZXhPZihrZXlNYXBbZXZlbnRLZXldKTtcblxuICAgIGlmIChhcnJheVBvcyAhPT0gLTEpIGFjdGl2ZUtleXMuc3BsaWNlKGFycmF5UG9zLCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJpbmRFdmVudHMoKSB7XG4gICAgYm9keSA9IGRvY3VtZW50LmJvZHk7XG5cbiAgICAvLyBwb2ludGVyIGV2ZW50cyAobW91c2UsIHBlbiwgdG91Y2gpXG4gICAgaWYgKHdpbmRvdy5Qb2ludGVyRXZlbnQpIHtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCBidWZmZXJlZEV2ZW50KTtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBidWZmZXJlZEV2ZW50KTtcbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5NU1BvaW50ZXJFdmVudCkge1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdNU1BvaW50ZXJEb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ01TUG9pbnRlck1vdmUnLCBidWZmZXJlZEV2ZW50KTtcbiAgICB9IGVsc2Uge1xuXG4gICAgICAvLyBtb3VzZSBldmVudHNcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGJ1ZmZlcmVkRXZlbnQpO1xuXG4gICAgICAvLyB0b3VjaCBldmVudHNcbiAgICAgIGlmICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHtcbiAgICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZXZlbnRCdWZmZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1vdXNlIHdoZWVsXG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKG1vdXNlV2hlZWwsIGJ1ZmZlcmVkRXZlbnQpO1xuXG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdW5CdWZmZXJlZEV2ZW50KTtcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdW5CdWZmZXJlZEV2ZW50KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHVuTG9nS2V5cyk7XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgdXRpbGl0aWVzXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gZGV0ZWN0IHZlcnNpb24gb2YgbW91c2Ugd2hlZWwgZXZlbnQgdG8gdXNlXG4gIC8vIHZpYSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWxcbiAgZnVuY3Rpb24gZGV0ZWN0V2hlZWwoKSB7XG4gICAgcmV0dXJuIG1vdXNlV2hlZWwgPSAnb253aGVlbCcgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykgP1xuICAgICAgJ3doZWVsJyA6IC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxuXG4gICAgICBkb2N1bWVudC5vbm1vdXNld2hlZWwgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgICdtb3VzZXdoZWVsJyA6IC8vIFdlYmtpdCBhbmQgSUUgc3VwcG9ydCBhdCBsZWFzdCBcIm1vdXNld2hlZWxcIlxuICAgICAgICAnRE9NTW91c2VTY3JvbGwnOyAvLyBsZXQncyBhc3N1bWUgdGhhdCByZW1haW5pbmcgYnJvd3NlcnMgYXJlIG9sZGVyIEZpcmVmb3hcbiAgfVxuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICBpbml0XG5cbiAgICBkb24ndCBzdGFydCBzY3JpcHQgdW5sZXNzIGJyb3dzZXIgY3V0cyB0aGUgbXVzdGFyZCxcbiAgICBhbHNvIHBhc3NlcyBpZiBwb2x5ZmlsbHMgYXJlIHVzZWRcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICBpZiAoXG4gICAgJ2FkZEV2ZW50TGlzdGVuZXInIGluIHdpbmRvdyAmJlxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mXG4gICkge1xuXG4gICAgLy8gaWYgdGhlIGRvbSBpcyBhbHJlYWR5IHJlYWR5IGFscmVhZHkgKHNjcmlwdCB3YXMgcGxhY2VkIGF0IGJvdHRvbSBvZiA8Ym9keT4pXG4gICAgaWYgKGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIGJpbmRFdmVudHMoKTtcblxuICAgIC8vIG90aGVyd2lzZSB3YWl0IGZvciB0aGUgZG9tIHRvIGxvYWQgKHNjcmlwdCB3YXMgcGxhY2VkIGluIHRoZSA8aGVhZD4pXG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBiaW5kRXZlbnRzKTtcbiAgICB9XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgYXBpXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgcmV0dXJuIHtcblxuICAgIC8vIHJldHVybnMgc3RyaW5nOiB0aGUgY3VycmVudCBpbnB1dCB0eXBlXG4gICAgYXNrOiBmdW5jdGlvbigpIHsgcmV0dXJuIGN1cnJlbnRJbnB1dDsgfSxcblxuICAgIC8vIHJldHVybnMgYXJyYXk6IGN1cnJlbnRseSBwcmVzc2VkIGtleXNcbiAgICBrZXlzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGFjdGl2ZUtleXM7IH0sXG5cbiAgICAvLyByZXR1cm5zIGFycmF5OiBhbGwgdGhlIGRldGVjdGVkIGlucHV0IHR5cGVzXG4gICAgdHlwZXM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gaW5wdXRUeXBlczsgfSxcblxuICAgIC8vIGFjY2VwdHMgc3RyaW5nOiBtYW51YWxseSBzZXQgdGhlIGlucHV0IHR5cGVcbiAgICBzZXQ6IHN3aXRjaElucHV0XG4gIH07XG5cbn0oKSk7XG4iLCIhZnVuY3Rpb24oJCkge1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIEZPVU5EQVRJT05fVkVSU0lPTiA9ICc2LjIuNCc7XG5cbi8vIEdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuLy8gVGhpcyBpcyBhdHRhY2hlZCB0byB0aGUgd2luZG93LCBvciB1c2VkIGFzIGEgbW9kdWxlIGZvciBBTUQvQnJvd3NlcmlmeVxudmFyIEZvdW5kYXRpb24gPSB7XG4gIHZlcnNpb246IEZPVU5EQVRJT05fVkVSU0lPTixcblxuICAvKipcbiAgICogU3RvcmVzIGluaXRpYWxpemVkIHBsdWdpbnMuXG4gICAqL1xuICBfcGx1Z2luczoge30sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBnZW5lcmF0ZWQgdW5pcXVlIGlkcyBmb3IgcGx1Z2luIGluc3RhbmNlc1xuICAgKi9cbiAgX3V1aWRzOiBbXSxcblxuICAvKipcbiAgICogUmV0dXJucyBhIGJvb2xlYW4gZm9yIFJUTCBzdXBwb3J0XG4gICAqL1xuICBydGw6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuICQoJ2h0bWwnKS5hdHRyKCdkaXInKSA9PT0gJ3J0bCc7XG4gIH0sXG4gIC8qKlxuICAgKiBEZWZpbmVzIGEgRm91bmRhdGlvbiBwbHVnaW4sIGFkZGluZyBpdCB0byB0aGUgYEZvdW5kYXRpb25gIG5hbWVzcGFjZSBhbmQgdGhlIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplIHdoZW4gcmVmbG93aW5nLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gVGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBwbHVnaW4uXG4gICAqL1xuICBwbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSkge1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gYWRkaW5nIHRvIGdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuICAgIC8vIEV4YW1wbGVzOiBGb3VuZGF0aW9uLlJldmVhbCwgRm91bmRhdGlvbi5PZmZDYW52YXNcbiAgICB2YXIgY2xhc3NOYW1lID0gKG5hbWUgfHwgZnVuY3Rpb25OYW1lKHBsdWdpbikpO1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gc3RvcmluZyB0aGUgcGx1Z2luLCBhbHNvIHVzZWQgdG8gY3JlYXRlIHRoZSBpZGVudGlmeWluZyBkYXRhIGF0dHJpYnV0ZSBmb3IgdGhlIHBsdWdpblxuICAgIC8vIEV4YW1wbGVzOiBkYXRhLXJldmVhbCwgZGF0YS1vZmYtY2FudmFzXG4gICAgdmFyIGF0dHJOYW1lICA9IGh5cGhlbmF0ZShjbGFzc05hbWUpO1xuXG4gICAgLy8gQWRkIHRvIHRoZSBGb3VuZGF0aW9uIG9iamVjdCBhbmQgdGhlIHBsdWdpbnMgbGlzdCAoZm9yIHJlZmxvd2luZylcbiAgICB0aGlzLl9wbHVnaW5zW2F0dHJOYW1lXSA9IHRoaXNbY2xhc3NOYW1lXSA9IHBsdWdpbjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBQb3B1bGF0ZXMgdGhlIF91dWlkcyBhcnJheSB3aXRoIHBvaW50ZXJzIHRvIGVhY2ggaW5kaXZpZHVhbCBwbHVnaW4gaW5zdGFuY2UuXG4gICAqIEFkZHMgdGhlIGB6ZlBsdWdpbmAgZGF0YS1hdHRyaWJ1dGUgdG8gcHJvZ3JhbW1hdGljYWxseSBjcmVhdGVkIHBsdWdpbnMgdG8gYWxsb3cgdXNlIG9mICQoc2VsZWN0b3IpLmZvdW5kYXRpb24obWV0aG9kKSBjYWxscy5cbiAgICogQWxzbyBmaXJlcyB0aGUgaW5pdGlhbGl6YXRpb24gZXZlbnQgZm9yIGVhY2ggcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIHRoZSBuYW1lIG9mIHRoZSBwbHVnaW4sIHBhc3NlZCBhcyBhIGNhbWVsQ2FzZWQgc3RyaW5nLlxuICAgKiBAZmlyZXMgUGx1Z2luI2luaXRcbiAgICovXG4gIHJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpe1xuICAgIHZhciBwbHVnaW5OYW1lID0gbmFtZSA/IGh5cGhlbmF0ZShuYW1lKSA6IGZ1bmN0aW9uTmFtZShwbHVnaW4uY29uc3RydWN0b3IpLnRvTG93ZXJDYXNlKCk7XG4gICAgcGx1Z2luLnV1aWQgPSB0aGlzLkdldFlvRGlnaXRzKDYsIHBsdWdpbk5hbWUpO1xuXG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKSl7IHBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gLCBwbHVnaW4udXVpZCk7IH1cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykpeyBwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nLCBwbHVnaW4pOyB9XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBpbml0aWFsaXplZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2luaXRcbiAgICAgICAgICAgKi9cbiAgICBwbHVnaW4uJGVsZW1lbnQudHJpZ2dlcihgaW5pdC56Zi4ke3BsdWdpbk5hbWV9YCk7XG5cbiAgICB0aGlzLl91dWlkcy5wdXNoKHBsdWdpbi51dWlkKTtcblxuICAgIHJldHVybjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBSZW1vdmVzIHRoZSBwbHVnaW5zIHV1aWQgZnJvbSB0aGUgX3V1aWRzIGFycmF5LlxuICAgKiBSZW1vdmVzIHRoZSB6ZlBsdWdpbiBkYXRhIGF0dHJpYnV0ZSwgYXMgd2VsbCBhcyB0aGUgZGF0YS1wbHVnaW4tbmFtZSBhdHRyaWJ1dGUuXG4gICAqIEFsc28gZmlyZXMgdGhlIGRlc3Ryb3llZCBldmVudCBmb3IgdGhlIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQGZpcmVzIFBsdWdpbiNkZXN0cm95ZWRcbiAgICovXG4gIHVucmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBoeXBoZW5hdGUoZnVuY3Rpb25OYW1lKHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpLmNvbnN0cnVjdG9yKSk7XG5cbiAgICB0aGlzLl91dWlkcy5zcGxpY2UodGhpcy5fdXVpZHMuaW5kZXhPZihwbHVnaW4udXVpZCksIDEpO1xuICAgIHBsdWdpbi4kZWxlbWVudC5yZW1vdmVBdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKS5yZW1vdmVEYXRhKCd6ZlBsdWdpbicpXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBiZWVuIGRlc3Ryb3llZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2Rlc3Ryb3llZFxuICAgICAgICAgICAqL1xuICAgICAgICAgIC50cmlnZ2VyKGBkZXN0cm95ZWQuemYuJHtwbHVnaW5OYW1lfWApO1xuICAgIGZvcih2YXIgcHJvcCBpbiBwbHVnaW4pe1xuICAgICAgcGx1Z2luW3Byb3BdID0gbnVsbDsvL2NsZWFuIHVwIHNjcmlwdCB0byBwcmVwIGZvciBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gICAgfVxuICAgIHJldHVybjtcbiAgfSxcblxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIENhdXNlcyBvbmUgb3IgbW9yZSBhY3RpdmUgcGx1Z2lucyB0byByZS1pbml0aWFsaXplLCByZXNldHRpbmcgZXZlbnQgbGlzdGVuZXJzLCByZWNhbGN1bGF0aW5nIHBvc2l0aW9ucywgZXRjLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGx1Z2lucyAtIG9wdGlvbmFsIHN0cmluZyBvZiBhbiBpbmRpdmlkdWFsIHBsdWdpbiBrZXksIGF0dGFpbmVkIGJ5IGNhbGxpbmcgYCQoZWxlbWVudCkuZGF0YSgncGx1Z2luTmFtZScpYCwgb3Igc3RyaW5nIG9mIGEgcGx1Z2luIGNsYXNzIGkuZS4gYCdkcm9wZG93bidgXG4gICAqIEBkZWZhdWx0IElmIG5vIGFyZ3VtZW50IGlzIHBhc3NlZCwgcmVmbG93IGFsbCBjdXJyZW50bHkgYWN0aXZlIHBsdWdpbnMuXG4gICAqL1xuICAgcmVJbml0OiBmdW5jdGlvbihwbHVnaW5zKXtcbiAgICAgdmFyIGlzSlEgPSBwbHVnaW5zIGluc3RhbmNlb2YgJDtcbiAgICAgdHJ5e1xuICAgICAgIGlmKGlzSlEpe1xuICAgICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICQodGhpcykuZGF0YSgnemZQbHVnaW4nKS5faW5pdCgpO1xuICAgICAgICAgfSk7XG4gICAgICAgfWVsc2V7XG4gICAgICAgICB2YXIgdHlwZSA9IHR5cGVvZiBwbHVnaW5zLFxuICAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgZm5zID0ge1xuICAgICAgICAgICAnb2JqZWN0JzogZnVuY3Rpb24ocGxncyl7XG4gICAgICAgICAgICAgcGxncy5mb3JFYWNoKGZ1bmN0aW9uKHApe1xuICAgICAgICAgICAgICAgcCA9IGh5cGhlbmF0ZShwKTtcbiAgICAgICAgICAgICAgICQoJ1tkYXRhLScrIHAgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3N0cmluZyc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgcGx1Z2lucyA9IGh5cGhlbmF0ZShwbHVnaW5zKTtcbiAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwbHVnaW5zICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICd1bmRlZmluZWQnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHRoaXNbJ29iamVjdCddKE9iamVjdC5rZXlzKF90aGlzLl9wbHVnaW5zKSk7XG4gICAgICAgICAgIH1cbiAgICAgICAgIH07XG4gICAgICAgICBmbnNbdHlwZV0ocGx1Z2lucyk7XG4gICAgICAgfVxuICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgIH1maW5hbGx5e1xuICAgICAgIHJldHVybiBwbHVnaW5zO1xuICAgICB9XG4gICB9LFxuXG4gIC8qKlxuICAgKiByZXR1cm5zIGEgcmFuZG9tIGJhc2UtMzYgdWlkIHdpdGggbmFtZXNwYWNpbmdcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggLSBudW1iZXIgb2YgcmFuZG9tIGJhc2UtMzYgZGlnaXRzIGRlc2lyZWQuIEluY3JlYXNlIGZvciBtb3JlIHJhbmRvbSBzdHJpbmdzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlIC0gbmFtZSBvZiBwbHVnaW4gdG8gYmUgaW5jb3Jwb3JhdGVkIGluIHVpZCwgb3B0aW9uYWwuXG4gICAqIEBkZWZhdWx0IHtTdHJpbmd9ICcnIC0gaWYgbm8gcGx1Z2luIG5hbWUgaXMgcHJvdmlkZWQsIG5vdGhpbmcgaXMgYXBwZW5kZWQgdG8gdGhlIHVpZC5cbiAgICogQHJldHVybnMge1N0cmluZ30gLSB1bmlxdWUgaWRcbiAgICovXG4gIEdldFlvRGlnaXRzOiBmdW5jdGlvbihsZW5ndGgsIG5hbWVzcGFjZSl7XG4gICAgbGVuZ3RoID0gbGVuZ3RoIHx8IDY7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucG93KDM2LCBsZW5ndGggKyAxKSAtIE1hdGgucmFuZG9tKCkgKiBNYXRoLnBvdygzNiwgbGVuZ3RoKSkpLnRvU3RyaW5nKDM2KS5zbGljZSgxKSArIChuYW1lc3BhY2UgPyBgLSR7bmFtZXNwYWNlfWAgOiAnJyk7XG4gIH0sXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHBsdWdpbnMgb24gYW55IGVsZW1lbnRzIHdpdGhpbiBgZWxlbWAgKGFuZCBgZWxlbWAgaXRzZWxmKSB0aGF0IGFyZW4ndCBhbHJlYWR5IGluaXRpYWxpemVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbSAtIGpRdWVyeSBvYmplY3QgY29udGFpbmluZyB0aGUgZWxlbWVudCB0byBjaGVjayBpbnNpZGUuIEFsc28gY2hlY2tzIHRoZSBlbGVtZW50IGl0c2VsZiwgdW5sZXNzIGl0J3MgdGhlIGBkb2N1bWVudGAgb2JqZWN0LlxuICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gcGx1Z2lucyAtIEEgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUuIExlYXZlIHRoaXMgb3V0IHRvIGluaXRpYWxpemUgZXZlcnl0aGluZy5cbiAgICovXG4gIHJlZmxvdzogZnVuY3Rpb24oZWxlbSwgcGx1Z2lucykge1xuXG4gICAgLy8gSWYgcGx1Z2lucyBpcyB1bmRlZmluZWQsIGp1c3QgZ3JhYiBldmVyeXRoaW5nXG4gICAgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcGx1Z2lucyA9IE9iamVjdC5rZXlzKHRoaXMuX3BsdWdpbnMpO1xuICAgIH1cbiAgICAvLyBJZiBwbHVnaW5zIGlzIGEgc3RyaW5nLCBjb252ZXJ0IGl0IHRvIGFuIGFycmF5IHdpdGggb25lIGl0ZW1cbiAgICBlbHNlIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHBsdWdpbnMgPSBbcGx1Z2luc107XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHBsdWdpblxuICAgICQuZWFjaChwbHVnaW5zLCBmdW5jdGlvbihpLCBuYW1lKSB7XG4gICAgICAvLyBHZXQgdGhlIGN1cnJlbnQgcGx1Z2luXG4gICAgICB2YXIgcGx1Z2luID0gX3RoaXMuX3BsdWdpbnNbbmFtZV07XG5cbiAgICAgIC8vIExvY2FsaXplIHRoZSBzZWFyY2ggdG8gYWxsIGVsZW1lbnRzIGluc2lkZSBlbGVtLCBhcyB3ZWxsIGFzIGVsZW0gaXRzZWxmLCB1bmxlc3MgZWxlbSA9PT0gZG9jdW1lbnRcbiAgICAgIHZhciAkZWxlbSA9ICQoZWxlbSkuZmluZCgnW2RhdGEtJytuYW1lKyddJykuYWRkQmFjaygnW2RhdGEtJytuYW1lKyddJyk7XG5cbiAgICAgIC8vIEZvciBlYWNoIHBsdWdpbiBmb3VuZCwgaW5pdGlhbGl6ZSBpdFxuICAgICAgJGVsZW0uZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRlbCA9ICQodGhpcyksXG4gICAgICAgICAgICBvcHRzID0ge307XG4gICAgICAgIC8vIERvbid0IGRvdWJsZS1kaXAgb24gcGx1Z2luc1xuICAgICAgICBpZiAoJGVsLmRhdGEoJ3pmUGx1Z2luJykpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCJUcmllZCB0byBpbml0aWFsaXplIFwiK25hbWUrXCIgb24gYW4gZWxlbWVudCB0aGF0IGFscmVhZHkgaGFzIGEgRm91bmRhdGlvbiBwbHVnaW4uXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKSl7XG4gICAgICAgICAgdmFyIHRoaW5nID0gJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpLnNwbGl0KCc7JykuZm9yRWFjaChmdW5jdGlvbihlLCBpKXtcbiAgICAgICAgICAgIHZhciBvcHQgPSBlLnNwbGl0KCc6JykubWFwKGZ1bmN0aW9uKGVsKXsgcmV0dXJuIGVsLnRyaW0oKTsgfSk7XG4gICAgICAgICAgICBpZihvcHRbMF0pIG9wdHNbb3B0WzBdXSA9IHBhcnNlVmFsdWUob3B0WzFdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgJGVsLmRhdGEoJ3pmUGx1Z2luJywgbmV3IHBsdWdpbigkKHRoaXMpLCBvcHRzKSk7XG4gICAgICAgIH1jYXRjaChlcil7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcik7XG4gICAgICAgIH1maW5hbGx5e1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIGdldEZuTmFtZTogZnVuY3Rpb25OYW1lLFxuICB0cmFuc2l0aW9uZW5kOiBmdW5jdGlvbigkZWxlbSl7XG4gICAgdmFyIHRyYW5zaXRpb25zID0ge1xuICAgICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAgICdNb3pUcmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICAgIH07XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcbiAgICAgICAgZW5kO1xuXG4gICAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucyl7XG4gICAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgZW5kID0gdHJhbnNpdGlvbnNbdF07XG4gICAgICB9XG4gICAgfVxuICAgIGlmKGVuZCl7XG4gICAgICByZXR1cm4gZW5kO1xuICAgIH1lbHNle1xuICAgICAgZW5kID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAkZWxlbS50cmlnZ2VySGFuZGxlcigndHJhbnNpdGlvbmVuZCcsIFskZWxlbV0pO1xuICAgICAgfSwgMSk7XG4gICAgICByZXR1cm4gJ3RyYW5zaXRpb25lbmQnO1xuICAgIH1cbiAgfVxufTtcblxuRm91bmRhdGlvbi51dGlsID0ge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGFwcGx5aW5nIGEgZGVib3VuY2UgZWZmZWN0IHRvIGEgZnVuY3Rpb24gY2FsbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgLSBGdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgZW5kIG9mIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheSAtIFRpbWUgaW4gbXMgdG8gZGVsYXkgdGhlIGNhbGwgb2YgYGZ1bmNgLlxuICAgKiBAcmV0dXJucyBmdW5jdGlvblxuICAgKi9cbiAgdGhyb3R0bGU6IGZ1bmN0aW9uIChmdW5jLCBkZWxheSkge1xuICAgIHZhciB0aW1lciA9IG51bGw7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICBpZiAodGltZXIgPT09IG51bGwpIHtcbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgICAgfSwgZGVsYXkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn07XG5cbi8vIFRPRE86IGNvbnNpZGVyIG5vdCBtYWtpbmcgdGhpcyBhIGpRdWVyeSBmdW5jdGlvblxuLy8gVE9ETzogbmVlZCB3YXkgdG8gcmVmbG93IHZzLiByZS1pbml0aWFsaXplXG4vKipcbiAqIFRoZSBGb3VuZGF0aW9uIGpRdWVyeSBtZXRob2QuXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gbWV0aG9kIC0gQW4gYWN0aW9uIHRvIHBlcmZvcm0gb24gdGhlIGN1cnJlbnQgalF1ZXJ5IG9iamVjdC5cbiAqL1xudmFyIGZvdW5kYXRpb24gPSBmdW5jdGlvbihtZXRob2QpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgbWV0aG9kLFxuICAgICAgJG1ldGEgPSAkKCdtZXRhLmZvdW5kYXRpb24tbXEnKSxcbiAgICAgICRub0pTID0gJCgnLm5vLWpzJyk7XG5cbiAgaWYoISRtZXRhLmxlbmd0aCl7XG4gICAgJCgnPG1ldGEgY2xhc3M9XCJmb3VuZGF0aW9uLW1xXCI+JykuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZCk7XG4gIH1cbiAgaWYoJG5vSlMubGVuZ3RoKXtcbiAgICAkbm9KUy5yZW1vdmVDbGFzcygnbm8tanMnKTtcbiAgfVxuXG4gIGlmKHR5cGUgPT09ICd1bmRlZmluZWQnKXsvL25lZWRzIHRvIGluaXRpYWxpemUgdGhlIEZvdW5kYXRpb24gb2JqZWN0LCBvciBhbiBpbmRpdmlkdWFsIHBsdWdpbi5cbiAgICBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuX2luaXQoKTtcbiAgICBGb3VuZGF0aW9uLnJlZmxvdyh0aGlzKTtcbiAgfWVsc2UgaWYodHlwZSA9PT0gJ3N0cmluZycpey8vYW4gaW5kaXZpZHVhbCBtZXRob2QgdG8gaW52b2tlIG9uIGEgcGx1Z2luIG9yIGdyb3VwIG9mIHBsdWdpbnNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7Ly9jb2xsZWN0IGFsbCB0aGUgYXJndW1lbnRzLCBpZiBuZWNlc3NhcnlcbiAgICB2YXIgcGx1Z0NsYXNzID0gdGhpcy5kYXRhKCd6ZlBsdWdpbicpOy8vZGV0ZXJtaW5lIHRoZSBjbGFzcyBvZiBwbHVnaW5cblxuICAgIGlmKHBsdWdDbGFzcyAhPT0gdW5kZWZpbmVkICYmIHBsdWdDbGFzc1ttZXRob2RdICE9PSB1bmRlZmluZWQpey8vbWFrZSBzdXJlIGJvdGggdGhlIGNsYXNzIGFuZCBtZXRob2QgZXhpc3RcbiAgICAgIGlmKHRoaXMubGVuZ3RoID09PSAxKXsvL2lmIHRoZXJlJ3Mgb25seSBvbmUsIGNhbGwgaXQgZGlyZWN0bHkuXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkocGx1Z0NsYXNzLCBhcmdzKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSwgZWwpey8vb3RoZXJ3aXNlIGxvb3AgdGhyb3VnaCB0aGUgalF1ZXJ5IGNvbGxlY3Rpb24gYW5kIGludm9rZSB0aGUgbWV0aG9kIG9uIGVhY2hcbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseSgkKGVsKS5kYXRhKCd6ZlBsdWdpbicpLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfWVsc2V7Ly9lcnJvciBmb3Igbm8gY2xhc3Mgb3Igbm8gbWV0aG9kXG4gICAgICB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJXZSdyZSBzb3JyeSwgJ1wiICsgbWV0aG9kICsgXCInIGlzIG5vdCBhbiBhdmFpbGFibGUgbWV0aG9kIGZvciBcIiArIChwbHVnQ2xhc3MgPyBmdW5jdGlvbk5hbWUocGx1Z0NsYXNzKSA6ICd0aGlzIGVsZW1lbnQnKSArICcuJyk7XG4gICAgfVxuICB9ZWxzZXsvL2Vycm9yIGZvciBpbnZhbGlkIGFyZ3VtZW50IHR5cGVcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBXZSdyZSBzb3JyeSwgJHt0eXBlfSBpcyBub3QgYSB2YWxpZCBwYXJhbWV0ZXIuIFlvdSBtdXN0IHVzZSBhIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG1ldGhvZCB5b3Ugd2lzaCB0byBpbnZva2UuYCk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG53aW5kb3cuRm91bmRhdGlvbiA9IEZvdW5kYXRpb247XG4kLmZuLmZvdW5kYXRpb24gPSBmb3VuZGF0aW9uO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cgfHwgIXdpbmRvdy5EYXRlLm5vdylcbiAgICB3aW5kb3cuRGF0ZS5ub3cgPSBEYXRlLm5vdyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgdmFyIHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKytpKSB7XG4gICAgICB2YXIgdnAgPSB2ZW5kb3JzW2ldO1xuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2cCsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAod2luZG93W3ZwKydDYW5jZWxBbmltYXRpb25GcmFtZSddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3dbdnArJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddKTtcbiAgfVxuICBpZiAoL2lQKGFkfGhvbmV8b2QpLipPUyA2Ly50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxuICAgIHx8ICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdmFyIG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGxhc3RUaW1lID0gbmV4dFRpbWUpOyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSAtIG5vdyk7XG4gICAgfTtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG4gIH1cbiAgLyoqXG4gICAqIFBvbHlmaWxsIGZvciBwZXJmb3JtYW5jZS5ub3csIHJlcXVpcmVkIGJ5IHJBRlxuICAgKi9cbiAgaWYoIXdpbmRvdy5wZXJmb3JtYW5jZSB8fCAhd2luZG93LnBlcmZvcm1hbmNlLm5vdyl7XG4gICAgd2luZG93LnBlcmZvcm1hbmNlID0ge1xuICAgICAgc3RhcnQ6IERhdGUubm93KCksXG4gICAgICBub3c6IGZ1bmN0aW9uKCl7IHJldHVybiBEYXRlLm5vdygpIC0gdGhpcy5zdGFydDsgfVxuICAgIH07XG4gIH1cbn0pKCk7XG5pZiAoIUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kKSB7XG4gIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24ob1RoaXMpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIGNsb3Nlc3QgdGhpbmcgcG9zc2libGUgdG8gdGhlIEVDTUFTY3JpcHQgNVxuICAgICAgLy8gaW50ZXJuYWwgSXNDYWxsYWJsZSBmdW5jdGlvblxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSB3aGF0IGlzIHRyeWluZyB0byBiZSBib3VuZCBpcyBub3QgY2FsbGFibGUnKTtcbiAgICB9XG5cbiAgICB2YXIgYUFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICAgIGZUb0JpbmQgPSB0aGlzLFxuICAgICAgICBmTk9QICAgID0gZnVuY3Rpb24oKSB7fSxcbiAgICAgICAgZkJvdW5kICA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBmVG9CaW5kLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBmTk9QXG4gICAgICAgICAgICAgICAgID8gdGhpc1xuICAgICAgICAgICAgICAgICA6IG9UaGlzLFxuICAgICAgICAgICAgICAgICBhQXJncy5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgICB9O1xuXG4gICAgaWYgKHRoaXMucHJvdG90eXBlKSB7XG4gICAgICAvLyBuYXRpdmUgZnVuY3Rpb25zIGRvbid0IGhhdmUgYSBwcm90b3R5cGVcbiAgICAgIGZOT1AucHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGU7XG4gICAgfVxuICAgIGZCb3VuZC5wcm90b3R5cGUgPSBuZXcgZk5PUCgpO1xuXG4gICAgcmV0dXJuIGZCb3VuZDtcbiAgfTtcbn1cbi8vIFBvbHlmaWxsIHRvIGdldCB0aGUgbmFtZSBvZiBhIGZ1bmN0aW9uIGluIElFOVxuZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZuKSB7XG4gIGlmIChGdW5jdGlvbi5wcm90b3R5cGUubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGZ1bmNOYW1lUmVnZXggPSAvZnVuY3Rpb25cXHMoW14oXXsxLH0pXFwoLztcbiAgICB2YXIgcmVzdWx0cyA9IChmdW5jTmFtZVJlZ2V4KS5leGVjKChmbikudG9TdHJpbmcoKSk7XG4gICAgcmV0dXJuIChyZXN1bHRzICYmIHJlc3VsdHMubGVuZ3RoID4gMSkgPyByZXN1bHRzWzFdLnRyaW0oKSA6IFwiXCI7XG4gIH1cbiAgZWxzZSBpZiAoZm4ucHJvdG90eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZm4uY29uc3RydWN0b3IubmFtZTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gZm4ucHJvdG90eXBlLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbn1cbmZ1bmN0aW9uIHBhcnNlVmFsdWUoc3RyKXtcbiAgaWYoL3RydWUvLnRlc3Qoc3RyKSkgcmV0dXJuIHRydWU7XG4gIGVsc2UgaWYoL2ZhbHNlLy50ZXN0KHN0cikpIHJldHVybiBmYWxzZTtcbiAgZWxzZSBpZighaXNOYU4oc3RyICogMSkpIHJldHVybiBwYXJzZUZsb2F0KHN0cik7XG4gIHJldHVybiBzdHI7XG59XG4vLyBDb252ZXJ0IFBhc2NhbENhc2UgdG8ga2ViYWItY2FzZVxuLy8gVGhhbmsgeW91OiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS84OTU1NTgwXG5mdW5jdGlvbiBoeXBoZW5hdGUoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgJyQxLSQyJykudG9Mb3dlckNhc2UoKTtcbn1cblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5Gb3VuZGF0aW9uLkJveCA9IHtcbiAgSW1Ob3RUb3VjaGluZ1lvdTogSW1Ob3RUb3VjaGluZ1lvdSxcbiAgR2V0RGltZW5zaW9uczogR2V0RGltZW5zaW9ucyxcbiAgR2V0T2Zmc2V0czogR2V0T2Zmc2V0c1xufVxuXG4vKipcbiAqIENvbXBhcmVzIHRoZSBkaW1lbnNpb25zIG9mIGFuIGVsZW1lbnQgdG8gYSBjb250YWluZXIgYW5kIGRldGVybWluZXMgY29sbGlzaW9uIGV2ZW50cyB3aXRoIGNvbnRhaW5lci5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHRlc3QgZm9yIGNvbGxpc2lvbnMuXG4gKiBAcGFyYW0ge2pRdWVyeX0gcGFyZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgYm91bmRpbmcgY29udGFpbmVyLlxuICogQHBhcmFtIHtCb29sZWFufSBsck9ubHkgLSBzZXQgdG8gdHJ1ZSB0byBjaGVjayBsZWZ0IGFuZCByaWdodCB2YWx1ZXMgb25seS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdGJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgdG9wIGFuZCBib3R0b20gdmFsdWVzIG9ubHkuXG4gKiBAZGVmYXVsdCBpZiBubyBwYXJlbnQgb2JqZWN0IHBhc3NlZCwgZGV0ZWN0cyBjb2xsaXNpb25zIHdpdGggYHdpbmRvd2AuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSB0cnVlIGlmIGNvbGxpc2lvbiBmcmVlLCBmYWxzZSBpZiBhIGNvbGxpc2lvbiBpbiBhbnkgZGlyZWN0aW9uLlxuICovXG5mdW5jdGlvbiBJbU5vdFRvdWNoaW5nWW91KGVsZW1lbnQsIHBhcmVudCwgbHJPbmx5LCB0Yk9ubHkpIHtcbiAgdmFyIGVsZURpbXMgPSBHZXREaW1lbnNpb25zKGVsZW1lbnQpLFxuICAgICAgdG9wLCBib3R0b20sIGxlZnQsIHJpZ2h0O1xuXG4gIGlmIChwYXJlbnQpIHtcbiAgICB2YXIgcGFyRGltcyA9IEdldERpbWVuc2lvbnMocGFyZW50KTtcblxuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBwYXJEaW1zLmhlaWdodCArIHBhckRpbXMub2Zmc2V0LnRvcCk7XG4gICAgdG9wICAgID0gKGVsZURpbXMub2Zmc2V0LnRvcCA+PSBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICAgIHJpZ2h0ICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ICsgZWxlRGltcy53aWR0aCA8PSBwYXJEaW1zLndpZHRoICsgcGFyRGltcy5vZmZzZXQubGVmdCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgYm90dG9tID0gKGVsZURpbXMub2Zmc2V0LnRvcCArIGVsZURpbXMuaGVpZ2h0IDw9IGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgKyBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCk7XG4gICAgdG9wICAgID0gKGVsZURpbXMub2Zmc2V0LnRvcCA+PSBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCk7XG4gICAgbGVmdCAgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gZWxlRGltcy53aW5kb3dEaW1zLndpZHRoKTtcbiAgfVxuXG4gIHZhciBhbGxEaXJzID0gW2JvdHRvbSwgdG9wLCBsZWZ0LCByaWdodF07XG5cbiAgaWYgKGxyT25seSkge1xuICAgIHJldHVybiBsZWZ0ID09PSByaWdodCA9PT0gdHJ1ZTtcbiAgfVxuXG4gIGlmICh0Yk9ubHkpIHtcbiAgICByZXR1cm4gdG9wID09PSBib3R0b20gPT09IHRydWU7XG4gIH1cblxuICByZXR1cm4gYWxsRGlycy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG59O1xuXG4vKipcbiAqIFVzZXMgbmF0aXZlIG1ldGhvZHMgdG8gcmV0dXJuIGFuIG9iamVjdCBvZiBkaW1lbnNpb24gdmFsdWVzLlxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeSB8fCBIVE1MfSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCBvciBET00gZWxlbWVudCBmb3Igd2hpY2ggdG8gZ2V0IHRoZSBkaW1lbnNpb25zLiBDYW4gYmUgYW55IGVsZW1lbnQgb3RoZXIgdGhhdCBkb2N1bWVudCBvciB3aW5kb3cuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAtIG5lc3RlZCBvYmplY3Qgb2YgaW50ZWdlciBwaXhlbCB2YWx1ZXNcbiAqIFRPRE8gLSBpZiBlbGVtZW50IGlzIHdpbmRvdywgcmV0dXJuIG9ubHkgdGhvc2UgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBHZXREaW1lbnNpb25zKGVsZW0sIHRlc3Qpe1xuICBlbGVtID0gZWxlbS5sZW5ndGggPyBlbGVtWzBdIDogZWxlbTtcblxuICBpZiAoZWxlbSA9PT0gd2luZG93IHx8IGVsZW0gPT09IGRvY3VtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSSdtIHNvcnJ5LCBEYXZlLiBJJ20gYWZyYWlkIEkgY2FuJ3QgZG8gdGhhdC5cIik7XG4gIH1cblxuICB2YXIgcmVjdCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICBwYXJSZWN0ID0gZWxlbS5wYXJlbnROb2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luUmVjdCA9IGRvY3VtZW50LmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICB3aW5ZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxuICAgICAgd2luWCA9IHdpbmRvdy5wYWdlWE9mZnNldDtcblxuICByZXR1cm4ge1xuICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgIGhlaWdodDogcmVjdC5oZWlnaHQsXG4gICAgb2Zmc2V0OiB7XG4gICAgICB0b3A6IHJlY3QudG9wICsgd2luWSxcbiAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHdpblhcbiAgICB9LFxuICAgIHBhcmVudERpbXM6IHtcbiAgICAgIHdpZHRoOiBwYXJSZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiBwYXJSZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHBhclJlY3QudG9wICsgd2luWSxcbiAgICAgICAgbGVmdDogcGFyUmVjdC5sZWZ0ICsgd2luWFxuICAgICAgfVxuICAgIH0sXG4gICAgd2luZG93RGltczoge1xuICAgICAgd2lkdGg6IHdpblJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IHdpblJlY3QuaGVpZ2h0LFxuICAgICAgb2Zmc2V0OiB7XG4gICAgICAgIHRvcDogd2luWSxcbiAgICAgICAgbGVmdDogd2luWFxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IG9mIHRvcCBhbmQgbGVmdCBpbnRlZ2VyIHBpeGVsIHZhbHVlcyBmb3IgZHluYW1pY2FsbHkgcmVuZGVyZWQgZWxlbWVudHMsXG4gKiBzdWNoIGFzOiBUb29sdGlwLCBSZXZlYWwsIGFuZCBEcm9wZG93blxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50IGJlaW5nIHBvc2l0aW9uZWQuXG4gKiBAcGFyYW0ge2pRdWVyeX0gYW5jaG9yIC0galF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQncyBhbmNob3IgcG9pbnQuXG4gKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBhIHN0cmluZyByZWxhdGluZyB0byB0aGUgZGVzaXJlZCBwb3NpdGlvbiBvZiB0aGUgZWxlbWVudCwgcmVsYXRpdmUgdG8gaXQncyBhbmNob3JcbiAqIEBwYXJhbSB7TnVtYmVyfSB2T2Zmc2V0IC0gaW50ZWdlciBwaXhlbCB2YWx1ZSBvZiBkZXNpcmVkIHZlcnRpY2FsIHNlcGFyYXRpb24gYmV0d2VlbiBhbmNob3IgYW5kIGVsZW1lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0gaE9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCBob3Jpem9udGFsIHNlcGFyYXRpb24gYmV0d2VlbiBhbmNob3IgYW5kIGVsZW1lbnQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzT3ZlcmZsb3cgLSBpZiBhIGNvbGxpc2lvbiBldmVudCBpcyBkZXRlY3RlZCwgc2V0cyB0byB0cnVlIHRvIGRlZmF1bHQgdGhlIGVsZW1lbnQgdG8gZnVsbCB3aWR0aCAtIGFueSBkZXNpcmVkIG9mZnNldC5cbiAqIFRPRE8gYWx0ZXIvcmV3cml0ZSB0byB3b3JrIHdpdGggYGVtYCB2YWx1ZXMgYXMgd2VsbC9pbnN0ZWFkIG9mIHBpeGVsc1xuICovXG5mdW5jdGlvbiBHZXRPZmZzZXRzKGVsZW1lbnQsIGFuY2hvciwgcG9zaXRpb24sIHZPZmZzZXQsIGhPZmZzZXQsIGlzT3ZlcmZsb3cpIHtcbiAgdmFyICRlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgICRhbmNob3JEaW1zID0gYW5jaG9yID8gR2V0RGltZW5zaW9ucyhhbmNob3IpIDogbnVsbDtcblxuICBzd2l0Y2ggKHBvc2l0aW9uKSB7XG4gICAgY2FzZSAndG9wJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgLSAoJGVsZURpbXMuaGVpZ2h0ICsgdk9mZnNldClcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgdG9wJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgLSAoJGVsZURpbXMuaGVpZ2h0ICsgdk9mZnNldClcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogaXNPdmVyZmxvdyA/IGhPZmZzZXQgOiAoKCRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgKCRhbmNob3JEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMikpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgbGVmdCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICgkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgKCRhbmNob3JEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHJpZ2h0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0ICsgMSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlcic6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCArICgkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMiksXG4gICAgICAgIHRvcDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCArICgkZWxlRGltcy53aW5kb3dEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmV2ZWFsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC0gJGVsZURpbXMud2lkdGgpIC8gMixcbiAgICAgICAgdG9wOiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyB2T2Zmc2V0XG4gICAgICB9XG4gICAgY2FzZSAncmV2ZWFsIGZ1bGwnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCxcbiAgICAgICAgdG9wOiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0LFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHRcbiAgICAgIH07XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgLSAkZWxlRGltcy53aWR0aCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICB9XG59XG5cbn0oalF1ZXJ5KTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogVGhpcyB1dGlsIHdhcyBjcmVhdGVkIGJ5IE1hcml1cyBPbGJlcnR6ICpcbiAqIFBsZWFzZSB0aGFuayBNYXJpdXMgb24gR2l0SHViIC9vd2xiZXJ0eiAqXG4gKiBvciB0aGUgd2ViIGh0dHA6Ly93d3cubWFyaXVzb2xiZXJ0ei5kZS8gKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3Qga2V5Q29kZXMgPSB7XG4gIDk6ICdUQUInLFxuICAxMzogJ0VOVEVSJyxcbiAgMjc6ICdFU0NBUEUnLFxuICAzMjogJ1NQQUNFJyxcbiAgMzc6ICdBUlJPV19MRUZUJyxcbiAgMzg6ICdBUlJPV19VUCcsXG4gIDM5OiAnQVJST1dfUklHSFQnLFxuICA0MDogJ0FSUk9XX0RPV04nXG59XG5cbnZhciBjb21tYW5kcyA9IHt9XG5cbnZhciBLZXlib2FyZCA9IHtcbiAga2V5czogZ2V0S2V5Q29kZXMoa2V5Q29kZXMpLFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIChrZXlib2FyZCkgZXZlbnQgYW5kIHJldHVybnMgYSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIGl0cyBrZXlcbiAgICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcmV0dXJuIFN0cmluZyBrZXkgLSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIHRoZSBrZXkgcHJlc3NlZFxuICAgKi9cbiAgcGFyc2VLZXkoZXZlbnQpIHtcbiAgICB2YXIga2V5ID0ga2V5Q29kZXNbZXZlbnQud2hpY2ggfHwgZXZlbnQua2V5Q29kZV0gfHwgU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCkudG9VcHBlckNhc2UoKTtcbiAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIGtleSA9IGBTSElGVF8ke2tleX1gO1xuICAgIGlmIChldmVudC5jdHJsS2V5KSBrZXkgPSBgQ1RSTF8ke2tleX1gO1xuICAgIGlmIChldmVudC5hbHRLZXkpIGtleSA9IGBBTFRfJHtrZXl9YDtcbiAgICByZXR1cm4ga2V5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSBnaXZlbiAoa2V5Ym9hcmQpIGV2ZW50XG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQncyBuYW1lLCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHBhcmFtIHtPYmplY3RzfSBmdW5jdGlvbnMgLSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyB0aGF0IGFyZSB0byBiZSBleGVjdXRlZFxuICAgKi9cbiAgaGFuZGxlS2V5KGV2ZW50LCBjb21wb25lbnQsIGZ1bmN0aW9ucykge1xuICAgIHZhciBjb21tYW5kTGlzdCA9IGNvbW1hbmRzW2NvbXBvbmVudF0sXG4gICAgICBrZXlDb2RlID0gdGhpcy5wYXJzZUtleShldmVudCksXG4gICAgICBjbWRzLFxuICAgICAgY29tbWFuZCxcbiAgICAgIGZuO1xuXG4gICAgaWYgKCFjb21tYW5kTGlzdCkgcmV0dXJuIGNvbnNvbGUud2FybignQ29tcG9uZW50IG5vdCBkZWZpbmVkIScpO1xuXG4gICAgaWYgKHR5cGVvZiBjb21tYW5kTGlzdC5sdHIgPT09ICd1bmRlZmluZWQnKSB7IC8vIHRoaXMgY29tcG9uZW50IGRvZXMgbm90IGRpZmZlcmVudGlhdGUgYmV0d2VlbiBsdHIgYW5kIHJ0bFxuICAgICAgICBjbWRzID0gY29tbWFuZExpc3Q7IC8vIHVzZSBwbGFpbiBsaXN0XG4gICAgfSBlbHNlIHsgLy8gbWVyZ2UgbHRyIGFuZCBydGw6IGlmIGRvY3VtZW50IGlzIHJ0bCwgcnRsIG92ZXJ3cml0ZXMgbHRyIGFuZCB2aWNlIHZlcnNhXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0Lmx0ciwgY29tbWFuZExpc3QucnRsKTtcblxuICAgICAgICBlbHNlIGNtZHMgPSAkLmV4dGVuZCh7fSwgY29tbWFuZExpc3QucnRsLCBjb21tYW5kTGlzdC5sdHIpO1xuICAgIH1cbiAgICBjb21tYW5kID0gY21kc1trZXlDb2RlXTtcblxuICAgIGZuID0gZnVuY3Rpb25zW2NvbW1hbmRdO1xuICAgIGlmIChmbiAmJiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiAgaWYgZXhpc3RzXG4gICAgICB2YXIgcmV0dXJuVmFsdWUgPSBmbi5hcHBseSgpO1xuICAgICAgaWYgKGZ1bmN0aW9ucy5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMuaGFuZGxlZChyZXR1cm5WYWx1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmdW5jdGlvbnMudW5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMudW5oYW5kbGVkID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gd2hlbiBldmVudCB3YXMgbm90IGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMudW5oYW5kbGVkKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBGaW5kcyBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiB0aGUgZ2l2ZW4gYCRlbGVtZW50YFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHNlYXJjaCB3aXRoaW5cbiAgICogQHJldHVybiB7alF1ZXJ5fSAkZm9jdXNhYmxlIC0gYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gYCRlbGVtZW50YFxuICAgKi9cbiAgZmluZEZvY3VzYWJsZSgkZWxlbWVudCkge1xuICAgIHJldHVybiAkZWxlbWVudC5maW5kKCdhW2hyZWZdLCBhcmVhW2hyZWZdLCBpbnB1dDpub3QoW2Rpc2FibGVkXSksIHNlbGVjdDpub3QoW2Rpc2FibGVkXSksIHRleHRhcmVhOm5vdChbZGlzYWJsZWRdKSwgYnV0dG9uOm5vdChbZGlzYWJsZWRdKSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCAqW3RhYmluZGV4XSwgKltjb250ZW50ZWRpdGFibGVdJykuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEkKHRoaXMpLmlzKCc6dmlzaWJsZScpIHx8ICQodGhpcykuYXR0cigndGFiaW5kZXgnKSA8IDApIHsgcmV0dXJuIGZhbHNlOyB9IC8vb25seSBoYXZlIHZpc2libGUgZWxlbWVudHMgYW5kIHRob3NlIHRoYXQgaGF2ZSBhIHRhYmluZGV4IGdyZWF0ZXIgb3IgZXF1YWwgMFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGNvbXBvbmVudCBuYW1lIG5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50LCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHJldHVybiBTdHJpbmcgY29tcG9uZW50TmFtZVxuICAgKi9cblxuICByZWdpc3Rlcihjb21wb25lbnROYW1lLCBjbWRzKSB7XG4gICAgY29tbWFuZHNbY29tcG9uZW50TmFtZV0gPSBjbWRzO1xuICB9XG59XG5cbi8qXG4gKiBDb25zdGFudHMgZm9yIGVhc2llciBjb21wYXJpbmcuXG4gKiBDYW4gYmUgdXNlZCBsaWtlIEZvdW5kYXRpb24ucGFyc2VLZXkoZXZlbnQpID09PSBGb3VuZGF0aW9uLmtleXMuU1BBQ0VcbiAqL1xuZnVuY3Rpb24gZ2V0S2V5Q29kZXMoa2NzKSB7XG4gIHZhciBrID0ge307XG4gIGZvciAodmFyIGtjIGluIGtjcykga1trY3Nba2NdXSA9IGtjc1trY107XG4gIHJldHVybiBrO1xufVxuXG5Gb3VuZGF0aW9uLktleWJvYXJkID0gS2V5Ym9hcmQ7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLy8gRGVmYXVsdCBzZXQgb2YgbWVkaWEgcXVlcmllc1xuY29uc3QgZGVmYXVsdFF1ZXJpZXMgPSB7XG4gICdkZWZhdWx0JyA6ICdvbmx5IHNjcmVlbicsXG4gIGxhbmRzY2FwZSA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBsYW5kc2NhcGUpJyxcbiAgcG9ydHJhaXQgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogcG9ydHJhaXQpJyxcbiAgcmV0aW5hIDogJ29ubHkgc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tLW1vei1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIvMSksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDE5MmRwaSksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDJkcHB4KSdcbn07XG5cbnZhciBNZWRpYVF1ZXJ5ID0ge1xuICBxdWVyaWVzOiBbXSxcblxuICBjdXJyZW50OiAnJyxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1lZGlhIHF1ZXJ5IGhlbHBlciwgYnkgZXh0cmFjdGluZyB0aGUgYnJlYWtwb2ludCBsaXN0IGZyb20gdGhlIENTUyBhbmQgYWN0aXZhdGluZyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZXh0cmFjdGVkU3R5bGVzID0gJCgnLmZvdW5kYXRpb24tbXEnKS5jc3MoJ2ZvbnQtZmFtaWx5Jyk7XG4gICAgdmFyIG5hbWVkUXVlcmllcztcblxuICAgIG5hbWVkUXVlcmllcyA9IHBhcnNlU3R5bGVUb09iamVjdChleHRyYWN0ZWRTdHlsZXMpO1xuXG4gICAgZm9yICh2YXIga2V5IGluIG5hbWVkUXVlcmllcykge1xuICAgICAgaWYobmFtZWRRdWVyaWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc2VsZi5xdWVyaWVzLnB1c2goe1xuICAgICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgICB2YWx1ZTogYG9ubHkgc2NyZWVuIGFuZCAobWluLXdpZHRoOiAke25hbWVkUXVlcmllc1trZXldfSlgXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCk7XG5cbiAgICB0aGlzLl93YXRjaGVyKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgc2NyZWVuIGlzIGF0IGxlYXN0IGFzIHdpZGUgYXMgYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gYHRydWVgIGlmIHRoZSBicmVha3BvaW50IG1hdGNoZXMsIGBmYWxzZWAgaWYgaXQncyBzbWFsbGVyLlxuICAgKi9cbiAgYXRMZWFzdChzaXplKSB7XG4gICAgdmFyIHF1ZXJ5ID0gdGhpcy5nZXQoc2l6ZSk7XG5cbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHJldHVybiB3aW5kb3cubWF0Y2hNZWRpYShxdWVyeSkubWF0Y2hlcztcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG1lZGlhIHF1ZXJ5IG9mIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBnZXQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd8bnVsbH0gLSBUaGUgbWVkaWEgcXVlcnkgb2YgdGhlIGJyZWFrcG9pbnQsIG9yIGBudWxsYCBpZiB0aGUgYnJlYWtwb2ludCBkb2Vzbid0IGV4aXN0LlxuICAgKi9cbiAgZ2V0KHNpemUpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcmllcykge1xuICAgICAgaWYodGhpcy5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcbiAgICAgICAgaWYgKHNpemUgPT09IHF1ZXJ5Lm5hbWUpIHJldHVybiBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgY3VycmVudCBicmVha3BvaW50IG5hbWUgYnkgdGVzdGluZyBldmVyeSBicmVha3BvaW50IGFuZCByZXR1cm5pbmcgdGhlIGxhc3Qgb25lIHRvIG1hdGNoICh0aGUgYmlnZ2VzdCBvbmUpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybnMge1N0cmluZ30gTmFtZSBvZiB0aGUgY3VycmVudCBicmVha3BvaW50LlxuICAgKi9cbiAgX2dldEN1cnJlbnRTaXplKCkge1xuICAgIHZhciBtYXRjaGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnF1ZXJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcblxuICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5LnZhbHVlKS5tYXRjaGVzKSB7XG4gICAgICAgIG1hdGNoZWQgPSBxdWVyeTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZC5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFjdGl2YXRlcyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLCB3aGljaCBmaXJlcyBhbiBldmVudCBvbiB0aGUgd2luZG93IHdoZW5ldmVyIHRoZSBicmVha3BvaW50IGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3dhdGNoZXIoKSB7XG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUuemYubWVkaWFxdWVyeScsICgpID0+IHtcbiAgICAgIHZhciBuZXdTaXplID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKSwgY3VycmVudFNpemUgPSB0aGlzLmN1cnJlbnQ7XG5cbiAgICAgIGlmIChuZXdTaXplICE9PSBjdXJyZW50U2l6ZSkge1xuICAgICAgICAvLyBDaGFuZ2UgdGhlIGN1cnJlbnQgbWVkaWEgcXVlcnlcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbmV3U2l6ZTtcblxuICAgICAgICAvLyBCcm9hZGNhc3QgdGhlIG1lZGlhIHF1ZXJ5IGNoYW5nZSBvbiB0aGUgd2luZG93XG4gICAgICAgICQod2luZG93KS50cmlnZ2VyKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBbbmV3U2l6ZSwgY3VycmVudFNpemVdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxuLy8gbWF0Y2hNZWRpYSgpIHBvbHlmaWxsIC0gVGVzdCBhIENTUyBtZWRpYSB0eXBlL3F1ZXJ5IGluIEpTLlxuLy8gQXV0aG9ycyAmIGNvcHlyaWdodCAoYykgMjAxMjogU2NvdHQgSmVobCwgUGF1bCBJcmlzaCwgTmljaG9sYXMgWmFrYXMsIERhdmlkIEtuaWdodC4gRHVhbCBNSVQvQlNEIGxpY2Vuc2VcbndpbmRvdy5tYXRjaE1lZGlhIHx8ICh3aW5kb3cubWF0Y2hNZWRpYSA9IGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gRm9yIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBtYXRjaE1lZGl1bSBhcGkgc3VjaCBhcyBJRSA5IGFuZCB3ZWJraXRcbiAgdmFyIHN0eWxlTWVkaWEgPSAod2luZG93LnN0eWxlTWVkaWEgfHwgd2luZG93Lm1lZGlhKTtcblxuICAvLyBGb3IgdGhvc2UgdGhhdCBkb24ndCBzdXBwb3J0IG1hdGNoTWVkaXVtXG4gIGlmICghc3R5bGVNZWRpYSkge1xuICAgIHZhciBzdHlsZSAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKSxcbiAgICBzY3JpcHQgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXSxcbiAgICBpbmZvICAgICAgICA9IG51bGw7XG5cbiAgICBzdHlsZS50eXBlICA9ICd0ZXh0L2Nzcyc7XG4gICAgc3R5bGUuaWQgICAgPSAnbWF0Y2htZWRpYWpzLXRlc3QnO1xuXG4gICAgc2NyaXB0ICYmIHNjcmlwdC5wYXJlbnROb2RlICYmIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdHlsZSwgc2NyaXB0KTtcblxuICAgIC8vICdzdHlsZS5jdXJyZW50U3R5bGUnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlJyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgaW5mbyA9ICgnZ2V0Q29tcHV0ZWRTdHlsZScgaW4gd2luZG93KSAmJiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShzdHlsZSwgbnVsbCkgfHwgc3R5bGUuY3VycmVudFN0eWxlO1xuXG4gICAgc3R5bGVNZWRpYSA9IHtcbiAgICAgIG1hdGNoTWVkaXVtKG1lZGlhKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gYEBtZWRpYSAke21lZGlhfXsgI21hdGNobWVkaWFqcy10ZXN0IHsgd2lkdGg6IDFweDsgfSB9YDtcblxuICAgICAgICAvLyAnc3R5bGUuc3R5bGVTaGVldCcgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnc3R5bGUudGV4dENvbnRlbnQnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSB0ZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlc3QgaWYgbWVkaWEgcXVlcnkgaXMgdHJ1ZSBvciBmYWxzZVxuICAgICAgICByZXR1cm4gaW5mby53aWR0aCA9PT0gJzFweCc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG1lZGlhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZXM6IHN0eWxlTWVkaWEubWF0Y2hNZWRpdW0obWVkaWEgfHwgJ2FsbCcpLFxuICAgICAgbWVkaWE6IG1lZGlhIHx8ICdhbGwnXG4gICAgfTtcbiAgfVxufSgpKTtcblxuLy8gVGhhbmsgeW91OiBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZ1xuZnVuY3Rpb24gcGFyc2VTdHlsZVRvT2JqZWN0KHN0cikge1xuICB2YXIgc3R5bGVPYmplY3QgPSB7fTtcblxuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XG4gIH1cblxuICBzdHIgPSBzdHIudHJpbSgpLnNsaWNlKDEsIC0xKTsgLy8gYnJvd3NlcnMgcmUtcXVvdGUgc3RyaW5nIHN0eWxlIHZhbHVlc1xuXG4gIGlmICghc3RyKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3R5bGVPYmplY3QgPSBzdHIuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocmV0LCBwYXJhbSkge1xuICAgIHZhciBwYXJ0cyA9IHBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWwgPSBwYXJ0c1sxXTtcbiAgICBrZXkgPSBkZWNvZGVVUklDb21wb25lbnQoa2V5KTtcblxuICAgIC8vIG1pc3NpbmcgYD1gIHNob3VsZCBiZSBgbnVsbGA6XG4gICAgLy8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuICAgIHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG4gICAgaWYgKCFyZXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0W2tleV0gPSB2YWw7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJldFtrZXldKSkge1xuICAgICAgcmV0W2tleV0ucHVzaCh2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXRba2V5XSA9IFtyZXRba2V5XSwgdmFsXTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSwge30pO1xuXG4gIHJldHVybiBzdHlsZU9iamVjdDtcbn1cblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1vdGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubW90aW9uXG4gKi9cblxuY29uc3QgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xuY29uc3QgYWN0aXZlQ2xhc3NlcyA9IFsnbXVpLWVudGVyLWFjdGl2ZScsICdtdWktbGVhdmUtYWN0aXZlJ107XG5cbmNvbnN0IE1vdGlvbiA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cblxuZnVuY3Rpb24gTW92ZShkdXJhdGlvbiwgZWxlbSwgZm4pe1xuICB2YXIgYW5pbSwgcHJvZywgc3RhcnQgPSBudWxsO1xuICAvLyBjb25zb2xlLmxvZygnY2FsbGVkJyk7XG5cbiAgZnVuY3Rpb24gbW92ZSh0cyl7XG4gICAgaWYoIXN0YXJ0KSBzdGFydCA9IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICAvLyBjb25zb2xlLmxvZyhzdGFydCwgdHMpO1xuICAgIHByb2cgPSB0cyAtIHN0YXJ0O1xuICAgIGZuLmFwcGx5KGVsZW0pO1xuXG4gICAgaWYocHJvZyA8IGR1cmF0aW9uKXsgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSwgZWxlbSk7IH1cbiAgICBlbHNle1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW0pO1xuICAgICAgZWxlbS50cmlnZ2VyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKS50cmlnZ2VySGFuZGxlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSk7XG4gICAgfVxuICB9XG4gIGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUpO1xufVxuXG4vKipcbiAqIEFuaW1hdGVzIGFuIGVsZW1lbnQgaW4gb3Igb3V0IHVzaW5nIGEgQ1NTIHRyYW5zaXRpb24gY2xhc3MuXG4gKiBAZnVuY3Rpb25cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzSW4gLSBEZWZpbmVzIGlmIHRoZSBhbmltYXRpb24gaXMgaW4gb3Igb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb3IgSFRNTCBvYmplY3QgdG8gYW5pbWF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBhbmltYXRpb24gLSBDU1MgY2xhc3MgdG8gdXNlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBDYWxsYmFjayB0byBydW4gd2hlbiBhbmltYXRpb24gaXMgZmluaXNoZWQuXG4gKi9cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcblxuICBlbGVtZW50XG4gICAgLmFkZENsYXNzKGFuaW1hdGlvbilcbiAgICAuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnRcbiAgICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnJylcbiAgICAgIC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoZWxlbWVudCksIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7aW5pdENsYXNzfSAke2FjdGl2ZUNsYXNzfSAke2FuaW1hdGlvbn1gKTtcbiAgfVxufVxuXG5Gb3VuZGF0aW9uLk1vdmUgPSBNb3ZlO1xuRm91bmRhdGlvbi5Nb3Rpb24gPSBNb3Rpb247XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTmVzdCA9IHtcbiAgRmVhdGhlcihtZW51LCB0eXBlID0gJ3pmJykge1xuICAgIG1lbnUuYXR0cigncm9sZScsICdtZW51YmFyJyk7XG5cbiAgICB2YXIgaXRlbXMgPSBtZW51LmZpbmQoJ2xpJykuYXR0cih7J3JvbGUnOiAnbWVudWl0ZW0nfSksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnUuZmluZCgnYTpmaXJzdCcpLmF0dHIoJ3RhYmluZGV4JywgMCk7XG5cbiAgICBpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRpdGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGl0ZW0uY2hpbGRyZW4oJ3VsJyk7XG5cbiAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xuICAgICAgICAkaXRlbVxuICAgICAgICAgIC5hZGRDbGFzcyhoYXNTdWJDbGFzcylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXG4gICAgICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAgICAgICAgJ2FyaWEtbGFiZWwnOiAkaXRlbS5jaGlsZHJlbignYTpmaXJzdCcpLnRleHQoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICRzdWJcbiAgICAgICAgICAuYWRkQ2xhc3MoYHN1Ym1lbnUgJHtzdWJNZW51Q2xhc3N9YClcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnZGF0YS1zdWJtZW51JzogJycsXG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCRpdGVtLnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW0uYWRkQ2xhc3MoYGlzLXN1Ym1lbnUtaXRlbSAke3N1Ykl0ZW1DbGFzc31gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfSxcblxuICBCdXJuKG1lbnUsIHR5cGUpIHtcbiAgICB2YXIgaXRlbXMgPSBtZW51LmZpbmQoJ2xpJykucmVtb3ZlQXR0cigndGFiaW5kZXgnKSxcbiAgICAgICAgc3ViTWVudUNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudWAsXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXG4gICAgICAgIGhhc1N1YkNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudS1wYXJlbnRgO1xuXG4gICAgbWVudVxuICAgICAgLmZpbmQoJz5saSwgLm1lbnUsIC5tZW51ID4gbGknKVxuICAgICAgLnJlbW92ZUNsYXNzKGAke3N1Yk1lbnVDbGFzc30gJHtzdWJJdGVtQ2xhc3N9ICR7aGFzU3ViQ2xhc3N9IGlzLXN1Ym1lbnUtaXRlbSBzdWJtZW51IGlzLWFjdGl2ZWApXG4gICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykuY3NzKCdkaXNwbGF5JywgJycpO1xuXG4gICAgLy8gY29uc29sZS5sb2coICAgICAgbWVudS5maW5kKCcuJyArIHN1Yk1lbnVDbGFzcyArICcsIC4nICsgc3ViSXRlbUNsYXNzICsgJywgLmhhcy1zdWJtZW51LCAuaXMtc3VibWVudS1pdGVtLCAuc3VibWVudSwgW2RhdGEtc3VibWVudV0nKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQ2xhc3Moc3ViTWVudUNsYXNzICsgJyAnICsgc3ViSXRlbUNsYXNzICsgJyBoYXMtc3VibWVudSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudScpXG4gICAgLy8gICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKSk7XG4gICAgLy8gaXRlbXMuZWFjaChmdW5jdGlvbigpe1xuICAgIC8vICAgdmFyICRpdGVtID0gJCh0aGlzKSxcbiAgICAvLyAgICAgICAkc3ViID0gJGl0ZW0uY2hpbGRyZW4oJ3VsJyk7XG4gICAgLy8gICBpZigkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKXtcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2lzLXN1Ym1lbnUtaXRlbSAnICsgc3ViSXRlbUNsYXNzKTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIGlmKCRzdWIubGVuZ3RoKXtcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2hhcy1zdWJtZW51Jyk7XG4gICAgLy8gICAgICRzdWIucmVtb3ZlQ2xhc3MoJ3N1Ym1lbnUgJyArIHN1Yk1lbnVDbGFzcykucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51Jyk7XG4gICAgLy8gICB9XG4gICAgLy8gfSk7XG4gIH1cbn1cblxuRm91bmRhdGlvbi5OZXN0ID0gTmVzdDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5mdW5jdGlvbiBUaW1lcihlbGVtLCBvcHRpb25zLCBjYikge1xuICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uLC8vb3B0aW9ucyBpcyBhbiBvYmplY3QgZm9yIGVhc2lseSBhZGRpbmcgZmVhdHVyZXMgbGF0ZXIuXG4gICAgICBuYW1lU3BhY2UgPSBPYmplY3Qua2V5cyhlbGVtLmRhdGEoKSlbMF0gfHwgJ3RpbWVyJyxcbiAgICAgIHJlbWFpbiA9IC0xLFxuICAgICAgc3RhcnQsXG4gICAgICB0aW1lcjtcblxuICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XG5cbiAgdGhpcy5yZXN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmVtYWluID0gLTE7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICB0aGlzLnN0YXJ0KCk7XG4gIH1cblxuICB0aGlzLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuICAgIC8vIGlmKCFlbGVtLmRhdGEoJ3BhdXNlZCcpKXsgcmV0dXJuIGZhbHNlOyB9Ly9tYXliZSBpbXBsZW1lbnQgdGhpcyBzYW5pdHkgY2hlY2sgaWYgdXNlZCBmb3Igb3RoZXIgdGhpbmdzLlxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgcmVtYWluID0gcmVtYWluIDw9IDAgPyBkdXJhdGlvbiA6IHJlbWFpbjtcbiAgICBlbGVtLmRhdGEoJ3BhdXNlZCcsIGZhbHNlKTtcbiAgICBzdGFydCA9IERhdGUubm93KCk7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBpZihvcHRpb25zLmluZmluaXRlKXtcbiAgICAgICAgX3RoaXMucmVzdGFydCgpOy8vcmVydW4gdGhlIHRpbWVyLlxuICAgICAgfVxuICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9XG4gICAgfSwgcmVtYWluKTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVyc3RhcnQuemYuJHtuYW1lU3BhY2V9YCk7XG4gIH1cblxuICB0aGlzLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IHRydWU7XG4gICAgLy9pZihlbGVtLmRhdGEoJ3BhdXNlZCcpKXsgcmV0dXJuIGZhbHNlOyB9Ly9tYXliZSBpbXBsZW1lbnQgdGhpcyBzYW5pdHkgY2hlY2sgaWYgdXNlZCBmb3Igb3RoZXIgdGhpbmdzLlxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCB0cnVlKTtcbiAgICB2YXIgZW5kID0gRGF0ZS5ub3coKTtcbiAgICByZW1haW4gPSByZW1haW4gLSAoZW5kIC0gc3RhcnQpO1xuICAgIGVsZW0udHJpZ2dlcihgdGltZXJwYXVzZWQuemYuJHtuYW1lU3BhY2V9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSdW5zIGEgY2FsbGJhY2sgZnVuY3Rpb24gd2hlbiBpbWFnZXMgYXJlIGZ1bGx5IGxvYWRlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBpbWFnZXMgLSBJbWFnZShzKSB0byBjaGVjayBpZiBsb2FkZWQuXG4gKiBAcGFyYW0ge0Z1bmN9IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGltYWdlIGlzIGZ1bGx5IGxvYWRlZC5cbiAqL1xuZnVuY3Rpb24gb25JbWFnZXNMb2FkZWQoaW1hZ2VzLCBjYWxsYmFjayl7XG4gIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIHVubG9hZGVkID0gaW1hZ2VzLmxlbmd0aDtcblxuICBpZiAodW5sb2FkZWQgPT09IDApIHtcbiAgICBjYWxsYmFjaygpO1xuICB9XG5cbiAgaW1hZ2VzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29tcGxldGUpIHtcbiAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiB0aGlzLm5hdHVyYWxXaWR0aCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5uYXR1cmFsV2lkdGggPiAwKSB7XG4gICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICQodGhpcykub25lKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHNpbmdsZUltYWdlTG9hZGVkKCkge1xuICAgIHVubG9hZGVkLS07XG4gICAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxufVxuXG5Gb3VuZGF0aW9uLlRpbWVyID0gVGltZXI7XG5Gb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkID0gb25JbWFnZXNMb2FkZWQ7XG5cbn0oalF1ZXJ5KTtcbiIsIi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKipXb3JrIGluc3BpcmVkIGJ5IG11bHRpcGxlIGpxdWVyeSBzd2lwZSBwbHVnaW5zKipcbi8vKipEb25lIGJ5IFlvaGFpIEFyYXJhdCAqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbihmdW5jdGlvbigkKSB7XG5cbiAgJC5zcG90U3dpcGUgPSB7XG4gICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICBlbmFibGVkOiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gICAgcHJldmVudERlZmF1bHQ6IGZhbHNlLFxuICAgIG1vdmVUaHJlc2hvbGQ6IDc1LFxuICAgIHRpbWVUaHJlc2hvbGQ6IDIwMFxuICB9O1xuXG4gIHZhciAgIHN0YXJ0UG9zWCxcbiAgICAgICAgc3RhcnRQb3NZLFxuICAgICAgICBzdGFydFRpbWUsXG4gICAgICAgIGVsYXBzZWRUaW1lLFxuICAgICAgICBpc01vdmluZyA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIG9uVG91Y2hFbmQoKSB7XG4gICAgLy8gIGFsZXJ0KHRoaXMpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kKTtcbiAgICBpc01vdmluZyA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaE1vdmUoZSkge1xuICAgIGlmICgkLnNwb3RTd2lwZS5wcmV2ZW50RGVmYXVsdCkgeyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICBpZihpc01vdmluZykge1xuICAgICAgdmFyIHggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICB2YXIgeSA9IGUudG91Y2hlc1swXS5wYWdlWTtcbiAgICAgIHZhciBkeCA9IHN0YXJ0UG9zWCAtIHg7XG4gICAgICB2YXIgZHkgPSBzdGFydFBvc1kgLSB5O1xuICAgICAgdmFyIGRpcjtcbiAgICAgIGVsYXBzZWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWU7XG4gICAgICBpZihNYXRoLmFicyhkeCkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAgIGRpciA9IGR4ID4gMCA/ICdsZWZ0JyA6ICdyaWdodCc7XG4gICAgICB9XG4gICAgICAvLyBlbHNlIGlmKE1hdGguYWJzKGR5KSA+PSAkLnNwb3RTd2lwZS5tb3ZlVGhyZXNob2xkICYmIGVsYXBzZWRUaW1lIDw9ICQuc3BvdFN3aXBlLnRpbWVUaHJlc2hvbGQpIHtcbiAgICAgIC8vICAgZGlyID0gZHkgPiAwID8gJ2Rvd24nIDogJ3VwJztcbiAgICAgIC8vIH1cbiAgICAgIGlmKGRpcikge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIG9uVG91Y2hFbmQuY2FsbCh0aGlzKTtcbiAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzd2lwZScsIGRpcikudHJpZ2dlcihgc3dpcGUke2Rpcn1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvblRvdWNoU3RhcnQoZSkge1xuICAgIGlmIChlLnRvdWNoZXMubGVuZ3RoID09IDEpIHtcbiAgICAgIHN0YXJ0UG9zWCA9IGUudG91Y2hlc1swXS5wYWdlWDtcbiAgICAgIHN0YXJ0UG9zWSA9IGUudG91Y2hlc1swXS5wYWdlWTtcbiAgICAgIGlzTW92aW5nID0gdHJ1ZTtcbiAgICAgIHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSwgZmFsc2UpO1xuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uVG91Y2hFbmQsIGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lciAmJiB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQsIGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRlYXJkb3duKCkge1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uVG91Y2hTdGFydCk7XG4gIH1cblxuICAkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7IHNldHVwOiBpbml0IH07XG5cbiAgJC5lYWNoKFsnbGVmdCcsICd1cCcsICdkb3duJywgJ3JpZ2h0J10sIGZ1bmN0aW9uICgpIHtcbiAgICAkLmV2ZW50LnNwZWNpYWxbYHN3aXBlJHt0aGlzfWBdID0geyBzZXR1cDogZnVuY3Rpb24oKXtcbiAgICAgICQodGhpcykub24oJ3N3aXBlJywgJC5ub29wKTtcbiAgICB9IH07XG4gIH0pO1xufSkoalF1ZXJ5KTtcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNZXRob2QgZm9yIGFkZGluZyBwc3VlZG8gZHJhZyBldmVudHMgdG8gZWxlbWVudHMgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiFmdW5jdGlvbigkKXtcbiAgJC5mbi5hZGRUb3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGksZWwpe1xuICAgICAgJChlbCkuYmluZCgndG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vd2UgcGFzcyB0aGUgb3JpZ2luYWwgZXZlbnQgb2JqZWN0IGJlY2F1c2UgdGhlIGpRdWVyeSBldmVudFxuICAgICAgICAvL29iamVjdCBpcyBub3JtYWxpemVkIHRvIHczYyBzcGVjcyBhbmQgZG9lcyBub3QgcHJvdmlkZSB0aGUgVG91Y2hMaXN0XG4gICAgICAgIGhhbmRsZVRvdWNoKGV2ZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIGhhbmRsZVRvdWNoID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgdmFyIHRvdWNoZXMgPSBldmVudC5jaGFuZ2VkVG91Y2hlcyxcbiAgICAgICAgICBmaXJzdCA9IHRvdWNoZXNbMF0sXG4gICAgICAgICAgZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIHRvdWNoc3RhcnQ6ICdtb3VzZWRvd24nLFxuICAgICAgICAgICAgdG91Y2htb3ZlOiAnbW91c2Vtb3ZlJyxcbiAgICAgICAgICAgIHRvdWNoZW5kOiAnbW91c2V1cCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHR5cGUgPSBldmVudFR5cGVzW2V2ZW50LnR5cGVdLFxuICAgICAgICAgIHNpbXVsYXRlZEV2ZW50XG4gICAgICAgIDtcblxuICAgICAgaWYoJ01vdXNlRXZlbnQnIGluIHdpbmRvdyAmJiB0eXBlb2Ygd2luZG93Lk1vdXNlRXZlbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQgPSBuZXcgd2luZG93Lk1vdXNlRXZlbnQodHlwZSwge1xuICAgICAgICAgICdidWJibGVzJzogdHJ1ZSxcbiAgICAgICAgICAnY2FuY2VsYWJsZSc6IHRydWUsXG4gICAgICAgICAgJ3NjcmVlblgnOiBmaXJzdC5zY3JlZW5YLFxuICAgICAgICAgICdzY3JlZW5ZJzogZmlyc3Quc2NyZWVuWSxcbiAgICAgICAgICAnY2xpZW50WCc6IGZpcnN0LmNsaWVudFgsXG4gICAgICAgICAgJ2NsaWVudFknOiBmaXJzdC5jbGllbnRZXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnTW91c2VFdmVudCcpO1xuICAgICAgICBzaW11bGF0ZWRFdmVudC5pbml0TW91c2VFdmVudCh0eXBlLCB0cnVlLCB0cnVlLCB3aW5kb3csIDEsIGZpcnN0LnNjcmVlblgsIGZpcnN0LnNjcmVlblksIGZpcnN0LmNsaWVudFgsIGZpcnN0LmNsaWVudFksIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwLypsZWZ0Ki8sIG51bGwpO1xuICAgICAgfVxuICAgICAgZmlyc3QudGFyZ2V0LmRpc3BhdGNoRXZlbnQoc2ltdWxhdGVkRXZlbnQpO1xuICAgIH07XG4gIH07XG59KGpRdWVyeSk7XG5cblxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqRnJvbSB0aGUgalF1ZXJ5IE1vYmlsZSBMaWJyYXJ5Kipcbi8vKipuZWVkIHRvIHJlY3JlYXRlIGZ1bmN0aW9uYWxpdHkqKlxuLy8qKmFuZCB0cnkgdG8gaW1wcm92ZSBpZiBwb3NzaWJsZSoqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyogUmVtb3ZpbmcgdGhlIGpRdWVyeSBmdW5jdGlvbiAqKioqXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuKGZ1bmN0aW9uKCAkLCB3aW5kb3csIHVuZGVmaW5lZCApIHtcblxuXHR2YXIgJGRvY3VtZW50ID0gJCggZG9jdW1lbnQgKSxcblx0XHQvLyBzdXBwb3J0VG91Y2ggPSAkLm1vYmlsZS5zdXBwb3J0LnRvdWNoLFxuXHRcdHRvdWNoU3RhcnRFdmVudCA9ICd0b3VjaHN0YXJ0Jy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiLFxuXHRcdHRvdWNoU3RvcEV2ZW50ID0gJ3RvdWNoZW5kJy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaGVuZFwiIDogXCJtb3VzZXVwXCIsXG5cdFx0dG91Y2hNb3ZlRXZlbnQgPSAndG91Y2htb3ZlJy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaG1vdmVcIiA6IFwibW91c2Vtb3ZlXCI7XG5cblx0Ly8gc2V0dXAgbmV3IGV2ZW50IHNob3J0Y3V0c1xuXHQkLmVhY2goICggXCJ0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCBcIiArXG5cdFx0XCJzd2lwZSBzd2lwZWxlZnQgc3dpcGVyaWdodFwiICkuc3BsaXQoIFwiIFwiICksIGZ1bmN0aW9uKCBpLCBuYW1lICkge1xuXG5cdFx0JC5mblsgbmFtZSBdID0gZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0cmV0dXJuIGZuID8gdGhpcy5iaW5kKCBuYW1lLCBmbiApIDogdGhpcy50cmlnZ2VyKCBuYW1lICk7XG5cdFx0fTtcblxuXHRcdC8vIGpRdWVyeSA8IDEuOFxuXHRcdGlmICggJC5hdHRyRm4gKSB7XG5cdFx0XHQkLmF0dHJGblsgbmFtZSBdID0gdHJ1ZTtcblx0XHR9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHRyaWdnZXJDdXN0b21FdmVudCggb2JqLCBldmVudFR5cGUsIGV2ZW50LCBidWJibGUgKSB7XG5cdFx0dmFyIG9yaWdpbmFsVHlwZSA9IGV2ZW50LnR5cGU7XG5cdFx0ZXZlbnQudHlwZSA9IGV2ZW50VHlwZTtcblx0XHRpZiAoIGJ1YmJsZSApIHtcblx0XHRcdCQuZXZlbnQudHJpZ2dlciggZXZlbnQsIHVuZGVmaW5lZCwgb2JqICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQuZXZlbnQuZGlzcGF0Y2guY2FsbCggb2JqLCBldmVudCApO1xuXHRcdH1cblx0XHRldmVudC50eXBlID0gb3JpZ2luYWxUeXBlO1xuXHR9XG5cblx0Ly8gYWxzbyBoYW5kbGVzIHRhcGhvbGRcblxuXHQvLyBBbHNvIGhhbmRsZXMgc3dpcGVsZWZ0LCBzd2lwZXJpZ2h0XG5cdCQuZXZlbnQuc3BlY2lhbC5zd2lwZSA9IHtcblxuXHRcdC8vIE1vcmUgdGhhbiB0aGlzIGhvcml6b250YWwgZGlzcGxhY2VtZW50LCBhbmQgd2Ugd2lsbCBzdXBwcmVzcyBzY3JvbGxpbmcuXG5cdFx0c2Nyb2xsU3VwcmVzc2lvblRocmVzaG9sZDogMzAsXG5cblx0XHQvLyBNb3JlIHRpbWUgdGhhbiB0aGlzLCBhbmQgaXQgaXNuJ3QgYSBzd2lwZS5cblx0XHRkdXJhdGlvblRocmVzaG9sZDogMTAwMCxcblxuXHRcdC8vIFN3aXBlIGhvcml6b250YWwgZGlzcGxhY2VtZW50IG11c3QgYmUgbW9yZSB0aGFuIHRoaXMuXG5cdFx0aG9yaXpvbnRhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdC8vIFN3aXBlIHZlcnRpY2FsIGRpc3BsYWNlbWVudCBtdXN0IGJlIGxlc3MgdGhhbiB0aGlzLlxuXHRcdHZlcnRpY2FsRGlzdGFuY2VUaHJlc2hvbGQ6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID49IDIgPyAxNSA6IDMwLFxuXG5cdFx0Z2V0TG9jYXRpb246IGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0XHR2YXIgd2luUGFnZVggPSB3aW5kb3cucGFnZVhPZmZzZXQsXG5cdFx0XHRcdHdpblBhZ2VZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxuXHRcdFx0XHR4ID0gZXZlbnQuY2xpZW50WCxcblx0XHRcdFx0eSA9IGV2ZW50LmNsaWVudFk7XG5cblx0XHRcdGlmICggZXZlbnQucGFnZVkgPT09IDAgJiYgTWF0aC5mbG9vciggeSApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVkgKSB8fFxuXHRcdFx0XHRldmVudC5wYWdlWCA9PT0gMCAmJiBNYXRoLmZsb29yKCB4ICkgPiBNYXRoLmZsb29yKCBldmVudC5wYWdlWCApICkge1xuXG5cdFx0XHRcdC8vIGlPUzQgY2xpZW50WC9jbGllbnRZIGhhdmUgdGhlIHZhbHVlIHRoYXQgc2hvdWxkIGhhdmUgYmVlblxuXHRcdFx0XHQvLyBpbiBwYWdlWC9wYWdlWS4gV2hpbGUgcGFnZVgvcGFnZS8gaGF2ZSB0aGUgdmFsdWUgMFxuXHRcdFx0XHR4ID0geCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0geSAtIHdpblBhZ2VZO1xuXHRcdFx0fSBlbHNlIGlmICggeSA8ICggZXZlbnQucGFnZVkgLSB3aW5QYWdlWSkgfHwgeCA8ICggZXZlbnQucGFnZVggLSB3aW5QYWdlWCApICkge1xuXG5cdFx0XHRcdC8vIFNvbWUgQW5kcm9pZCBicm93c2VycyBoYXZlIHRvdGFsbHkgYm9ndXMgdmFsdWVzIGZvciBjbGllbnRYL1lcblx0XHRcdFx0Ly8gd2hlbiBzY3JvbGxpbmcvem9vbWluZyBhIHBhZ2UuIERldGVjdGFibGUgc2luY2UgY2xpZW50WC9jbGllbnRZXG5cdFx0XHRcdC8vIHNob3VsZCBuZXZlciBiZSBzbWFsbGVyIHRoYW4gcGFnZVgvcGFnZVkgbWludXMgcGFnZSBzY3JvbGxcblx0XHRcdFx0eCA9IGV2ZW50LnBhZ2VYIC0gd2luUGFnZVg7XG5cdFx0XHRcdHkgPSBldmVudC5wYWdlWSAtIHdpblBhZ2VZO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4OiB4LFxuXHRcdFx0XHR5OiB5XG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRzdGFydDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXSxcblx0XHRcdFx0XHRcdG9yaWdpbjogJCggZXZlbnQudGFyZ2V0IClcblx0XHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRzdG9wOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgZGF0YSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyA/XG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcblx0XHRcdFx0bG9jYXRpb24gPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZ2V0TG9jYXRpb24oIGRhdGEgKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXG5cdFx0XHRcdFx0XHRjb29yZHM6IFsgbG9jYXRpb24ueCwgbG9jYXRpb24ueSBdXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0aGFuZGxlU3dpcGU6IGZ1bmN0aW9uKCBzdGFydCwgc3RvcCwgdGhpc09iamVjdCwgb3JpZ1RhcmdldCApIHtcblx0XHRcdGlmICggc3RvcC50aW1lIC0gc3RhcnQudGltZSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5kdXJhdGlvblRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAwIF0gLSBzdG9wLmNvb3Jkc1sgMCBdICkgPiAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaG9yaXpvbnRhbERpc3RhbmNlVGhyZXNob2xkICYmXG5cdFx0XHRcdE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDEgXSAtIHN0b3AuY29vcmRzWyAxIF0gKSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS52ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkICkge1xuXHRcdFx0XHR2YXIgZGlyZWN0aW9uID0gc3RhcnQuY29vcmRzWzBdID4gc3RvcC5jb29yZHNbIDAgXSA/IFwic3dpcGVsZWZ0XCIgOiBcInN3aXBlcmlnaHRcIjtcblxuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIFwic3dpcGVcIiwgJC5FdmVudCggXCJzd2lwZVwiLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9KSwgdHJ1ZSApO1xuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIGRpcmVjdGlvbiwkLkV2ZW50KCBkaXJlY3Rpb24sIHsgdGFyZ2V0OiBvcmlnVGFyZ2V0LCBzd2lwZXN0YXJ0OiBzdGFydCwgc3dpcGVzdG9wOiBzdG9wIH0gKSwgdHJ1ZSApO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdH0sXG5cblx0XHQvLyBUaGlzIHNlcnZlcyBhcyBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgYXQgbW9zdCBvbmUgc3dpcGUgZXZlbnQgZXZlbnQgaXNcblx0XHQvLyBpbiB3b3JrIGF0IGFueSBnaXZlbiB0aW1lXG5cdFx0ZXZlbnRJblByb2dyZXNzOiBmYWxzZSxcblxuXHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudHMsXG5cdFx0XHRcdHRoaXNPYmplY3QgPSB0aGlzLFxuXHRcdFx0XHQkdGhpcyA9ICQoIHRoaXNPYmplY3QgKSxcblx0XHRcdFx0Y29udGV4dCA9IHt9O1xuXG5cdFx0XHQvLyBSZXRyaWV2ZSB0aGUgZXZlbnRzIGRhdGEgZm9yIHRoaXMgZWxlbWVudCBhbmQgYWRkIHRoZSBzd2lwZSBjb250ZXh0XG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRpZiAoICFldmVudHMgKSB7XG5cdFx0XHRcdGV2ZW50cyA9IHsgbGVuZ3RoOiAwIH07XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIsIGV2ZW50cyApO1xuXHRcdFx0fVxuXHRcdFx0ZXZlbnRzLmxlbmd0aCsrO1xuXHRcdFx0ZXZlbnRzLnN3aXBlID0gY29udGV4dDtcblxuXHRcdFx0Y29udGV4dC5zdGFydCA9IGZ1bmN0aW9uKCBldmVudCApIHtcblxuXHRcdFx0XHQvLyBCYWlsIGlmIHdlJ3JlIGFscmVhZHkgd29ya2luZyBvbiBhIHN3aXBlIGV2ZW50XG5cdFx0XHRcdGlmICggJC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IHRydWU7XG5cblx0XHRcdFx0dmFyIHN0b3AsXG5cdFx0XHRcdFx0c3RhcnQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc3RhcnQoIGV2ZW50ICksXG5cdFx0XHRcdFx0b3JpZ1RhcmdldCA9IGV2ZW50LnRhcmdldCxcblx0XHRcdFx0XHRlbWl0dGVkID0gZmFsc2U7XG5cblx0XHRcdFx0Y29udGV4dC5tb3ZlID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGlmICggIXN0YXJ0IHx8IGV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHN0b3AgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc3RvcCggZXZlbnQgKTtcblx0XHRcdFx0XHRpZiAoICFlbWl0dGVkICkge1xuXHRcdFx0XHRcdFx0ZW1pdHRlZCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5oYW5kbGVTd2lwZSggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKTtcblx0XHRcdFx0XHRcdGlmICggZW1pdHRlZCApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY29udGV4dCB0byBtYWtlIHdheSBmb3IgdGhlIG5leHQgc3dpcGUgZXZlbnRcblx0XHRcdFx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBwcmV2ZW50IHNjcm9sbGluZ1xuXHRcdFx0XHRcdGlmICggTWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQgKSB7XG5cdFx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjb250ZXh0LnN0b3AgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY29udGV4dCB0byBtYWtlIHdheSBmb3IgdGhlIG5leHQgc3dpcGUgZXZlbnRcblx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKTtcblx0XHRcdFx0XHRcdGNvbnRleHQubW92ZSA9IG51bGw7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JGRvY3VtZW50Lm9uKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlIClcblx0XHRcdFx0XHQub25lKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XG5cdFx0XHR9O1xuXHRcdFx0JHRoaXMub24oIHRvdWNoU3RhcnRFdmVudCwgY29udGV4dC5zdGFydCApO1xuXHRcdH0sXG5cblx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLCBjb250ZXh0O1xuXG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRpZiAoIGV2ZW50cyApIHtcblx0XHRcdFx0Y29udGV4dCA9IGV2ZW50cy5zd2lwZTtcblx0XHRcdFx0ZGVsZXRlIGV2ZW50cy5zd2lwZTtcblx0XHRcdFx0ZXZlbnRzLmxlbmd0aC0tO1xuXHRcdFx0XHRpZiAoIGV2ZW50cy5sZW5ndGggPT09IDAgKSB7XG5cdFx0XHRcdFx0JC5yZW1vdmVEYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggY29udGV4dCApIHtcblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0YXJ0ICkge1xuXHRcdFx0XHRcdCQoIHRoaXMgKS5vZmYoIHRvdWNoU3RhcnRFdmVudCwgY29udGV4dC5zdGFydCApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggY29udGV4dC5tb3ZlICkge1xuXHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQuc3RvcCApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdCQuZWFjaCh7XG5cdFx0c3dpcGVsZWZ0OiBcInN3aXBlLmxlZnRcIixcblx0XHRzd2lwZXJpZ2h0OiBcInN3aXBlLnJpZ2h0XCJcblx0fSwgZnVuY3Rpb24oIGV2ZW50LCBzb3VyY2VFdmVudCApIHtcblxuXHRcdCQuZXZlbnQuc3BlY2lhbFsgZXZlbnQgXSA9IHtcblx0XHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLmJpbmQoIHNvdXJjZUV2ZW50LCAkLm5vb3AgKTtcblx0XHRcdH0sXG5cdFx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS51bmJpbmQoIHNvdXJjZUV2ZW50ICk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG59KSggalF1ZXJ5LCB0aGlzICk7XG4qL1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBNdXRhdGlvbk9ic2VydmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4gIGZvciAodmFyIGk9MDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGAke3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgIGluIHdpbmRvdykge1xuICAgICAgcmV0dXJuIHdpbmRvd1tgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYF07XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn0oKSk7XG5cbmNvbnN0IHRyaWdnZXJzID0gKGVsLCB0eXBlKSA9PiB7XG4gIGVsLmRhdGEodHlwZSkuc3BsaXQoJyAnKS5mb3JFYWNoKGlkID0+IHtcbiAgICAkKGAjJHtpZH1gKVsgdHlwZSA9PT0gJ2Nsb3NlJyA/ICd0cmlnZ2VyJyA6ICd0cmlnZ2VySGFuZGxlciddKGAke3R5cGV9LnpmLnRyaWdnZXJgLCBbZWxdKTtcbiAgfSk7XG59O1xuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1vcGVuXSB3aWxsIHJldmVhbCBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLW9wZW5dJywgZnVuY3Rpb24oKSB7XG4gIHRyaWdnZXJzKCQodGhpcyksICdvcGVuJyk7XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1jbG9zZV0gd2lsbCBjbG9zZSBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbi8vIElmIHVzZWQgd2l0aG91dCBhIHZhbHVlIG9uIFtkYXRhLWNsb3NlXSwgdGhlIGV2ZW50IHdpbGwgYnViYmxlLCBhbGxvd2luZyBpdCB0byBjbG9zZSBhIHBhcmVudCBjb21wb25lbnQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1jbG9zZV0nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCdjbG9zZScpO1xuICBpZiAoaWQpIHtcbiAgICB0cmlnZ2VycygkKHRoaXMpLCAnY2xvc2UnKTtcbiAgfVxuICBlbHNlIHtcbiAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlLnpmLnRyaWdnZXInKTtcbiAgfVxufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtdG9nZ2xlXSB3aWxsIHRvZ2dsZSBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZV0nLCBmdW5jdGlvbigpIHtcbiAgdHJpZ2dlcnMoJCh0aGlzKSwgJ3RvZ2dsZScpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2FibGVdIHdpbGwgcmVzcG9uZCB0byBjbG9zZS56Zi50cmlnZ2VyIGV2ZW50cy5cbiQoZG9jdW1lbnQpLm9uKCdjbG9zZS56Zi50cmlnZ2VyJywgJ1tkYXRhLWNsb3NhYmxlXScsIGZ1bmN0aW9uKGUpe1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBsZXQgYW5pbWF0aW9uID0gJCh0aGlzKS5kYXRhKCdjbG9zYWJsZScpO1xuXG4gIGlmKGFuaW1hdGlvbiAhPT0gJycpe1xuICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQoJCh0aGlzKSwgYW5pbWF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgICQodGhpcykudHJpZ2dlcignY2xvc2VkLnpmJyk7XG4gICAgfSk7XG4gIH1lbHNle1xuICAgICQodGhpcykuZmFkZU91dCgpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICB9XG59KTtcblxuJChkb2N1bWVudCkub24oJ2ZvY3VzLnpmLnRyaWdnZXIgYmx1ci56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZS1mb2N1c10nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCd0b2dnbGUtZm9jdXMnKTtcbiAgJChgIyR7aWR9YCkudHJpZ2dlckhhbmRsZXIoJ3RvZ2dsZS56Zi50cmlnZ2VyJywgWyQodGhpcyldKTtcbn0pO1xuXG4vKipcbiogRmlyZXMgb25jZSBhZnRlciBhbGwgb3RoZXIgc2NyaXB0cyBoYXZlIGxvYWRlZFxuKiBAZnVuY3Rpb25cbiogQHByaXZhdGVcbiovXG4kKHdpbmRvdykub24oJ2xvYWQnLCAoKSA9PiB7XG4gIGNoZWNrTGlzdGVuZXJzKCk7XG59KTtcblxuZnVuY3Rpb24gY2hlY2tMaXN0ZW5lcnMoKSB7XG4gIGV2ZW50c0xpc3RlbmVyKCk7XG4gIHJlc2l6ZUxpc3RlbmVyKCk7XG4gIHNjcm9sbExpc3RlbmVyKCk7XG4gIGNsb3NlbWVMaXN0ZW5lcigpO1xufVxuXG4vLyoqKioqKioqIG9ubHkgZmlyZXMgdGhpcyBmdW5jdGlvbiBvbmNlIG9uIGxvYWQsIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIHRvIHdhdGNoICoqKioqKioqXG5mdW5jdGlvbiBjbG9zZW1lTGlzdGVuZXIocGx1Z2luTmFtZSkge1xuICB2YXIgeWV0aUJveGVzID0gJCgnW2RhdGEteWV0aS1ib3hdJyksXG4gICAgICBwbHVnTmFtZXMgPSBbJ2Ryb3Bkb3duJywgJ3Rvb2x0aXAnLCAncmV2ZWFsJ107XG5cbiAgaWYocGx1Z2luTmFtZSl7XG4gICAgaWYodHlwZW9mIHBsdWdpbk5hbWUgPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5wdXNoKHBsdWdpbk5hbWUpO1xuICAgIH1lbHNlIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgcGx1Z2luTmFtZVswXSA9PT0gJ3N0cmluZycpe1xuICAgICAgcGx1Z05hbWVzLmNvbmNhdChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsdWdpbiBuYW1lcyBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gIH1cbiAgaWYoeWV0aUJveGVzLmxlbmd0aCl7XG4gICAgbGV0IGxpc3RlbmVycyA9IHBsdWdOYW1lcy5tYXAoKG5hbWUpID0+IHtcbiAgICAgIHJldHVybiBgY2xvc2VtZS56Zi4ke25hbWV9YDtcbiAgICB9KS5qb2luKCcgJyk7XG5cbiAgICAkKHdpbmRvdykub2ZmKGxpc3RlbmVycykub24obGlzdGVuZXJzLCBmdW5jdGlvbihlLCBwbHVnaW5JZCl7XG4gICAgICBsZXQgcGx1Z2luID0gZS5uYW1lc3BhY2Uuc3BsaXQoJy4nKVswXTtcbiAgICAgIGxldCBwbHVnaW5zID0gJChgW2RhdGEtJHtwbHVnaW59XWApLm5vdChgW2RhdGEteWV0aS1ib3g9XCIke3BsdWdpbklkfVwiXWApO1xuXG4gICAgICBwbHVnaW5zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgbGV0IF90aGlzID0gJCh0aGlzKTtcblxuICAgICAgICBfdGhpcy50cmlnZ2VySGFuZGxlcignY2xvc2UuemYudHJpZ2dlcicsIFtfdGhpc10pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzaXplTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1yZXNpemVdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Jlc2l6ZS56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Jlc2l6ZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSkge1xuICAgICAgaWYgKHRpbWVyKSB7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSByZXNpemUgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJyZXNpemVcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCByZXNpemUgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzY3JvbGxMaXN0ZW5lcihkZWJvdW5jZSl7XG4gIGxldCB0aW1lcixcbiAgICAgICRub2RlcyA9ICQoJ1tkYXRhLXNjcm9sbF0nKTtcbiAgaWYoJG5vZGVzLmxlbmd0aCl7XG4gICAgJCh3aW5kb3cpLm9mZignc2Nyb2xsLnpmLnRyaWdnZXInKVxuICAgIC5vbignc2Nyb2xsLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlKXtcbiAgICAgIGlmKHRpbWVyKXsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgICBpZighTXV0YXRpb25PYnNlcnZlcil7Ly9mYWxsYmFjayBmb3IgSUUgOVxuICAgICAgICAgICRub2Rlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIHNjcm9sbCBldmVudFxuICAgICAgICAkbm9kZXMuYXR0cignZGF0YS1ldmVudHMnLCBcInNjcm9sbFwiKTtcbiAgICAgIH0sIGRlYm91bmNlIHx8IDEwKTsvL2RlZmF1bHQgdGltZSB0byBlbWl0IHNjcm9sbCBldmVudFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV2ZW50c0xpc3RlbmVyKCkge1xuICBpZighTXV0YXRpb25PYnNlcnZlcil7IHJldHVybiBmYWxzZTsgfVxuICBsZXQgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1yZXNpemVdLCBbZGF0YS1zY3JvbGxdLCBbZGF0YS1tdXRhdGVdJyk7XG5cbiAgLy9lbGVtZW50IGNhbGxiYWNrXG4gIHZhciBsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uID0gZnVuY3Rpb24obXV0YXRpb25SZWNvcmRzTGlzdCkge1xuICAgIHZhciAkdGFyZ2V0ID0gJChtdXRhdGlvblJlY29yZHNMaXN0WzBdLnRhcmdldCk7XG4gICAgLy90cmlnZ2VyIHRoZSBldmVudCBoYW5kbGVyIGZvciB0aGUgZWxlbWVudCBkZXBlbmRpbmcgb24gdHlwZVxuICAgIHN3aXRjaCAoJHRhcmdldC5hdHRyKFwiZGF0YS1ldmVudHNcIikpIHtcblxuICAgICAgY2FzZSBcInJlc2l6ZVwiIDpcbiAgICAgICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBbJHRhcmdldF0pO1xuICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJzY3JvbGxcIiA6XG4gICAgICAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQsIHdpbmRvdy5wYWdlWU9mZnNldF0pO1xuICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgXCJtdXRhdGVcIiA6XG4gICAgICAvLyBjb25zb2xlLmxvZygnbXV0YXRlJywgJHRhcmdldCk7XG4gICAgICAvLyAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdtdXRhdGUuemYudHJpZ2dlcicpO1xuICAgICAgLy9cbiAgICAgIC8vIC8vbWFrZSBzdXJlIHdlIGRvbid0IGdldCBzdHVjayBpbiBhbiBpbmZpbml0ZSBsb29wIGZyb20gc2xvcHB5IGNvZGVpbmdcbiAgICAgIC8vIGlmICgkdGFyZ2V0LmluZGV4KCdbZGF0YS1tdXRhdGVdJykgPT0gJChcIltkYXRhLW11dGF0ZV1cIikubGVuZ3RoLTEpIHtcbiAgICAgIC8vICAgZG9tTXV0YXRpb25PYnNlcnZlcigpO1xuICAgICAgLy8gfVxuICAgICAgLy8gYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQgOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy9ub3RoaW5nXG4gICAgfVxuICB9XG5cbiAgaWYobm9kZXMubGVuZ3RoKXtcbiAgICAvL2ZvciBlYWNoIGVsZW1lbnQgdGhhdCBuZWVkcyB0byBsaXN0ZW4gZm9yIHJlc2l6aW5nLCBzY3JvbGxpbmcsIChvciBjb21pbmcgc29vbiBtdXRhdGlvbikgYWRkIGEgc2luZ2xlIG9ic2VydmVyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gbm9kZXMubGVuZ3RoLTE7IGkrKykge1xuICAgICAgbGV0IGVsZW1lbnRPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24pO1xuICAgICAgZWxlbWVudE9ic2VydmVyLm9ic2VydmUobm9kZXNbaV0sIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiBmYWxzZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6ZmFsc2UsIGF0dHJpYnV0ZUZpbHRlcjpbXCJkYXRhLWV2ZW50c1wiXX0pO1xuICAgIH1cbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gW1BIXVxuLy8gRm91bmRhdGlvbi5DaGVja1dhdGNoZXJzID0gY2hlY2tXYXRjaGVycztcbkZvdW5kYXRpb24uSUhlYXJZb3UgPSBjaGVja0xpc3RlbmVycztcbi8vIEZvdW5kYXRpb24uSVNlZVlvdSA9IHNjcm9sbExpc3RlbmVyO1xuLy8gRm91bmRhdGlvbi5JRmVlbFlvdSA9IGNsb3NlbWVMaXN0ZW5lcjtcblxufShqUXVlcnkpO1xuXG4vLyBmdW5jdGlvbiBkb21NdXRhdGlvbk9ic2VydmVyKGRlYm91bmNlKSB7XG4vLyAgIC8vICEhISBUaGlzIGlzIGNvbWluZyBzb29uIGFuZCBuZWVkcyBtb3JlIHdvcms7IG5vdCBhY3RpdmUgICEhISAvL1xuLy8gICB2YXIgdGltZXIsXG4vLyAgIG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtbXV0YXRlXScpO1xuLy8gICAvL1xuLy8gICBpZiAobm9kZXMubGVuZ3RoKSB7XG4vLyAgICAgLy8gdmFyIE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuLy8gICAgIC8vICAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4vLyAgICAgLy8gICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuLy8gICAgIC8vICAgICBpZiAocHJlZml4ZXNbaV0gKyAnTXV0YXRpb25PYnNlcnZlcicgaW4gd2luZG93KSB7XG4vLyAgICAgLy8gICAgICAgcmV0dXJuIHdpbmRvd1twcmVmaXhlc1tpXSArICdNdXRhdGlvbk9ic2VydmVyJ107XG4vLyAgICAgLy8gICAgIH1cbi8vICAgICAvLyAgIH1cbi8vICAgICAvLyAgIHJldHVybiBmYWxzZTtcbi8vICAgICAvLyB9KCkpO1xuLy9cbi8vXG4vLyAgICAgLy9mb3IgdGhlIGJvZHksIHdlIG5lZWQgdG8gbGlzdGVuIGZvciBhbGwgY2hhbmdlcyBlZmZlY3RpbmcgdGhlIHN0eWxlIGFuZCBjbGFzcyBhdHRyaWJ1dGVzXG4vLyAgICAgdmFyIGJvZHlPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGJvZHlNdXRhdGlvbik7XG4vLyAgICAgYm9keU9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOnRydWUsIGF0dHJpYnV0ZUZpbHRlcjpbXCJzdHlsZVwiLCBcImNsYXNzXCJdfSk7XG4vL1xuLy9cbi8vICAgICAvL2JvZHkgY2FsbGJhY2tcbi8vICAgICBmdW5jdGlvbiBib2R5TXV0YXRpb24obXV0YXRlKSB7XG4vLyAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgbXV0YXRpb24gZXZlbnRcbi8vICAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG4vL1xuLy8gICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICBib2R5T2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuLy8gICAgICAgICAkKCdbZGF0YS1tdXRhdGVdJykuYXR0cignZGF0YS1ldmVudHMnLFwibXV0YXRlXCIpO1xuLy8gICAgICAgfSwgZGVib3VuY2UgfHwgMTUwKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93bk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duLW1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcm9wZG93bk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBEcm9wZG93bk1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bk1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4sIGFuZCBjYWxscyBfcHJlcGFyZU1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc3VicyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcygnZmlyc3Qtc3ViJyk7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMuZmluZCgndWwuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbENsYXNzKTtcblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5yaWdodENsYXNzKSB8fCB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAncmlnaHQnIHx8IEZvdW5kYXRpb24ucnRsKCkgfHwgdGhpcy4kZWxlbWVudC5wYXJlbnRzKCcudG9wLWJhci1yaWdodCcpLmlzKCcqJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPSAncmlnaHQnO1xuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtbGVmdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1yaWdodCcpO1xuICAgIH1cbiAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfTtcblxuICBfaXNWZXJ0aWNhbCgpIHtcbiAgICByZXR1cm4gdGhpcy4kdGFicy5jc3MoJ2Rpc3BsYXknKSA9PT0gJ2Jsb2NrJztcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBlbGVtZW50cyB3aXRoaW4gdGhlIG1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8ICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpLFxuICAgICAgICBwYXJDbGFzcyA9ICdpcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCc7XG5cbiAgICAvLyB1c2VkIGZvciBvbkNsaWNrIGFuZCBpbiB0aGUga2V5Ym9hcmQgaGFuZGxlcnNcbiAgICB2YXIgaGFuZGxlQ2xpY2tGbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCBgLiR7cGFyQ2xhc3N9YCksXG4gICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpLFxuICAgICAgICAgIGhhc0NsaWNrZWQgPSAkZWxlbS5hdHRyKCdkYXRhLWlzLWNsaWNrJykgPT09ICd0cnVlJyxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG5cbiAgICAgIGlmIChoYXNTdWIpIHtcbiAgICAgICAgaWYgKGhhc0NsaWNrZWQpIHtcbiAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrIHx8ICghX3RoaXMub3B0aW9ucy5jbGlja09wZW4gJiYgIWhhc1RvdWNoKSB8fCAoX3RoaXMub3B0aW9ucy5mb3JjZUZvbGxvdyAmJiBoYXNUb3VjaCkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbS5hZGQoJGVsZW0ucGFyZW50c1VudGlsKF90aGlzLiRlbGVtZW50LCBgLiR7cGFyQ2xhc3N9YCkpLmF0dHIoJ2RhdGEtaXMtY2xpY2snLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2tJbnNpZGUpe1xuICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuIHx8IGhhc1RvdWNoKSB7XG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ2NsaWNrLnpmLmRyb3Bkb3dubWVudSB0b3VjaHN0YXJ0LnpmLmRyb3Bkb3dubWVudScsIGhhbmRsZUNsaWNrRm4pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKTtcblxuICAgICAgICBpZiAoaGFzU3ViKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZiAoaGFzU3ViICYmIF90aGlzLm9wdGlvbnMuYXV0b2Nsb3NlKSB7XG4gICAgICAgICAgaWYgKCRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnICYmIF90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5jbG9zaW5nVGltZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLiRtZW51SXRlbXMub24oJ2tleWRvd24uemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICRlbGVtZW50ID0gJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsICdbcm9sZT1cIm1lbnVpdGVtXCJdJyksXG4gICAgICAgICAgaXNUYWIgPSBfdGhpcy4kdGFicy5pbmRleCgkZWxlbWVudCkgPiAtMSxcbiAgICAgICAgICAkZWxlbWVudHMgPSBpc1RhYiA/IF90aGlzLiR0YWJzIDogJGVsZW1lbnQuc2libGluZ3MoJ2xpJykuYWRkKCRlbGVtZW50KSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShpLTEpO1xuICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBuZXh0U2libGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoISRlbGVtZW50LmlzKCc6bGFzdC1jaGlsZCcpKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0sIHByZXZTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRwcmV2RWxlbWVudC5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sIG9wZW5TdWIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRzdWIgPSAkZWxlbWVudC5jaGlsZHJlbigndWwuaXMtZHJvcGRvd24tc3VibWVudScpO1xuICAgICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdsaSA+IGE6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgICB9LCBjbG9zZVN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvL2lmICgkZWxlbWVudC5pcygnOmZpcnN0LWNoaWxkJykpIHtcbiAgICAgICAgdmFyIGNsb3NlID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKTtcbiAgICAgICAgY2xvc2UuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICBfdGhpcy5faGlkZShjbG9zZSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgLy99XG4gICAgICB9O1xuICAgICAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICAgICAgb3Blbjogb3BlblN1YixcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9oaWRlKF90aGlzLiRlbGVtZW50KTtcbiAgICAgICAgICBfdGhpcy4kbWVudUl0ZW1zLmZpbmQoJ2E6Zmlyc3QnKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpZiAoaXNUYWIpIHtcbiAgICAgICAgaWYgKF90aGlzLl9pc1ZlcnRpY2FsKCkpIHsgLy8gdmVydGljYWwgbWVudVxuICAgICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgICBuZXh0OiBjbG9zZVN1YixcbiAgICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBjbG9zZVN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBob3Jpem9udGFsIG1lbnVcbiAgICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgeyAvLyByaWdodCBhbGlnbmVkXG4gICAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgICAgbmV4dDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgZG93bjogb3BlblN1YixcbiAgICAgICAgICAgICAgdXA6IGNsb3NlU3ViXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgeyAvLyBsZWZ0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBuZXh0OiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgcHJldmlvdXM6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgICBkb3duOiBvcGVuU3ViLFxuICAgICAgICAgICAgICB1cDogY2xvc2VTdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgLy8gbm90IHRhYnMgLT4gb25lIHN1YlxuICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgeyAvLyByaWdodCBhbGlnbmVkXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBjbG9zZVN1YixcbiAgICAgICAgICAgIHByZXZpb3VzOiBvcGVuU3ViLFxuICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB1cDogcHJldlNpYmxpbmdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHsgLy8gbGVmdCBhbGlnbmVkXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBvcGVuU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViLFxuICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB1cDogcHJldlNpYmxpbmdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0Ryb3Bkb3duTWVudScsIGZ1bmN0aW9ucyk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICB2YXIgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKVxuICAgICAgICAgLm9uKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgIHZhciAkbGluayA9IF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpO1xuICAgICAgICAgICBpZiAoJGxpbmsubGVuZ3RoKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgIF90aGlzLl9oaWRlKCk7XG4gICAgICAgICAgICRib2R5Lm9mZignbW91c2V1cC56Zi5kcm9wZG93bm1lbnUgdG91Y2hlbmQuemYuZHJvcGRvd25tZW51Jyk7XG4gICAgICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIGRyb3Bkb3duIHBhbmUsIGFuZCBjaGVja3MgZm9yIGNvbGxpc2lvbnMgZmlyc3QuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkc3ViIC0gdWwgZWxlbWVudCB0aGF0IGlzIGEgc3VibWVudSB0byBzaG93XG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I3Nob3dcbiAgICovXG4gIF9zaG93KCRzdWIpIHtcbiAgICB2YXIgaWR4ID0gdGhpcy4kdGFicy5pbmRleCh0aGlzLiR0YWJzLmZpbHRlcihmdW5jdGlvbihpLCBlbCkge1xuICAgICAgcmV0dXJuICQoZWwpLmZpbmQoJHN1YikubGVuZ3RoID4gMDtcbiAgICB9KSk7XG4gICAgdmFyICRzaWJzID0gJHN1Yi5wYXJlbnQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jykuc2libGluZ3MoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgdGhpcy5faGlkZSgkc2licywgaWR4KTtcbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKS5hZGRDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJykuYXR0cih7J2FyaWEtaGlkZGVuJzogZmFsc2V9KVxuICAgICAgICAucGFyZW50KCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZENsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgdmFyIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcbiAgICBpZiAoIWNsZWFyKSB7XG4gICAgICB2YXIgb2xkQ2xhc3MgPSB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcgPyAnLXJpZ2h0JyA6ICctbGVmdCcsXG4gICAgICAgICAgJHBhcmVudExpID0gJHN1Yi5wYXJlbnQoJy5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpO1xuICAgICAgJHBhcmVudExpLnJlbW92ZUNsYXNzKGBvcGVucyR7b2xkQ2xhc3N9YCkuYWRkQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKTtcbiAgICAgIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcbiAgICAgIGlmICghY2xlYXIpIHtcbiAgICAgICAgJHBhcmVudExpLnJlbW92ZUNsYXNzKGBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YCkuYWRkQ2xhc3MoJ29wZW5zLWlubmVyJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICcnKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykgeyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgbmV3IGRyb3Bkb3duIHBhbmUgaXMgdmlzaWJsZS5cbiAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYuZHJvcGRvd25tZW51JywgWyRzdWJdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlcyBhIHNpbmdsZSwgY3VycmVudGx5IG9wZW4gZHJvcGRvd24gcGFuZSwgaWYgcGFzc2VkIGEgcGFyYW1ldGVyLCBvdGhlcndpc2UsIGhpZGVzIGV2ZXJ5dGhpbmcuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSBlbGVtZW50IHdpdGggYSBzdWJtZW51IHRvIGhpZGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIGluZGV4IG9mIHRoZSAkdGFicyBjb2xsZWN0aW9uIHRvIGhpZGVcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oaWRlKCRlbGVtLCBpZHgpIHtcbiAgICB2YXIgJHRvQ2xvc2U7XG4gICAgaWYgKCRlbGVtICYmICRlbGVtLmxlbmd0aCkge1xuICAgICAgJHRvQ2xvc2UgPSAkZWxlbTtcbiAgICB9IGVsc2UgaWYgKGlkeCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAkdG9DbG9zZSA9IHRoaXMuJHRhYnMubm90KGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICAgIHJldHVybiBpID09PSBpZHg7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkdG9DbG9zZSA9IHRoaXMuJGVsZW1lbnQ7XG4gICAgfVxuICAgIHZhciBzb21ldGhpbmdUb0Nsb3NlID0gJHRvQ2xvc2UuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpIHx8ICR0b0Nsb3NlLmZpbmQoJy5pcy1hY3RpdmUnKS5sZW5ndGggPiAwO1xuXG4gICAgaWYgKHNvbWV0aGluZ1RvQ2xvc2UpIHtcbiAgICAgICR0b0Nsb3NlLmZpbmQoJ2xpLmlzLWFjdGl2ZScpLmFkZCgkdG9DbG9zZSkuYXR0cih7XG4gICAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICAgICdkYXRhLWlzLWNsaWNrJzogZmFsc2VcbiAgICAgIH0pLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICAgJHRvQ2xvc2UuZmluZCgndWwuanMtZHJvcGRvd24tYWN0aXZlJykuYXR0cih7XG4gICAgICAgICdhcmlhLWhpZGRlbic6IHRydWVcbiAgICAgIH0pLnJlbW92ZUNsYXNzKCdqcy1kcm9wZG93bi1hY3RpdmUnKTtcblxuICAgICAgaWYgKHRoaXMuY2hhbmdlZCB8fCAkdG9DbG9zZS5maW5kKCdvcGVucy1pbm5lcicpLmxlbmd0aCkge1xuICAgICAgICB2YXIgb2xkQ2xhc3MgPSB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcgPyAncmlnaHQnIDogJ2xlZnQnO1xuICAgICAgICAkdG9DbG9zZS5maW5kKCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZCgkdG9DbG9zZSlcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYG9wZW5zLWlubmVyIG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgb3BlbnMtJHtvbGRDbGFzc31gKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG9wZW4gbWVudXMgYXJlIGNsb3NlZC5cbiAgICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjaGlkZVxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd25tZW51JywgWyR0b0Nsb3NlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBwbHVnaW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRtZW51SXRlbXMub2ZmKCcuemYuZHJvcGRvd25tZW51JykucmVtb3ZlQXR0cignZGF0YS1pcy1jbGljaycpXG4gICAgICAgIC5yZW1vdmVDbGFzcygnaXMtcmlnaHQtYXJyb3cgaXMtbGVmdC1hcnJvdyBpcy1kb3duLWFycm93IG9wZW5zLXJpZ2h0IG9wZW5zLWxlZnQgb3BlbnMtaW5uZXInKTtcbiAgICAkKGRvY3VtZW50LmJvZHkpLm9mZignLnpmLmRyb3Bkb3dubWVudScpO1xuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdkcm9wZG93bicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5Ecm9wZG93bk1lbnUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBEaXNhbGxvd3MgaG92ZXIgZXZlbnRzIGZyb20gb3BlbmluZyBzdWJtZW51c1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkaXNhYmxlSG92ZXI6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgYSBzdWJtZW51IHRvIGF1dG9tYXRpY2FsbHkgY2xvc2Ugb24gYSBtb3VzZWxlYXZlIGV2ZW50LCBpZiBub3QgY2xpY2tlZCBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGF1dG9jbG9zZTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICBob3ZlckRlbGF5OiA1MCxcbiAgLyoqXG4gICAqIEFsbG93IGEgc3VibWVudSB0byBvcGVuL3JlbWFpbiBvcGVuIG9uIHBhcmVudCBjbGljayBldmVudC4gQWxsb3dzIGN1cnNvciB0byBtb3ZlIGF3YXkgZnJvbSBtZW51LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsaWNrT3BlbjogZmFsc2UsXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBjbG9zaW5nIGEgc3VibWVudSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuXG4gIGNsb3NpbmdUaW1lOiA1MDAsXG4gIC8qKlxuICAgKiBQb3NpdGlvbiBvZiB0aGUgbWVudSByZWxhdGl2ZSB0byB3aGF0IGRpcmVjdGlvbiB0aGUgc3VibWVudXMgc2hvdWxkIG9wZW4uIEhhbmRsZWQgYnkgSlMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2xlZnQnXG4gICAqL1xuICBhbGlnbm1lbnQ6ICdsZWZ0JyxcbiAgLyoqXG4gICAqIEFsbG93IGNsaWNrcyBvbiB0aGUgYm9keSB0byBjbG9zZSBhbnkgb3BlbiBzdWJtZW51cy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvdyBjbGlja3Mgb24gbGVhZiBhbmNob3IgbGlua3MgdG8gY2xvc2UgYW55IG9wZW4gc3VibWVudXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrSW5zaWRlOiB0cnVlLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB2ZXJ0aWNhbCBvcmllbnRlZCBtZW51cywgRm91bmRhdGlvbiBkZWZhdWx0IGlzIGB2ZXJ0aWNhbGAuIFVwZGF0ZSB0aGlzIGlmIHVzaW5nIHlvdXIgb3duIGNsYXNzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd2ZXJ0aWNhbCdcbiAgICovXG4gIHZlcnRpY2FsQ2xhc3M6ICd2ZXJ0aWNhbCcsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHJpZ2h0LXNpZGUgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgYWxpZ24tcmlnaHRgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnYWxpZ24tcmlnaHQnXG4gICAqL1xuICByaWdodENsYXNzOiAnYWxpZ24tcmlnaHQnLFxuICAvKipcbiAgICogQm9vbGVhbiB0byBmb3JjZSBvdmVyaWRlIHRoZSBjbGlja2luZyBvZiBsaW5rcyB0byBwZXJmb3JtIGRlZmF1bHQgYWN0aW9uLCBvbiBzZWNvbmQgdG91Y2ggZXZlbnQgZm9yIG1vYmlsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZm9yY2VGb2xsb3c6IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93bk1lbnUsICdEcm9wZG93bk1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE9mZkNhbnZhcyBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ub2ZmY2FudmFzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKi9cblxuY2xhc3MgT2ZmQ2FudmFzIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gb2ZmLWNhbnZhcyB3cmFwcGVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIE9mZkNhbnZhcyNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBpbml0aWFsaXplLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIE9mZkNhbnZhcy5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuJGxhc3RUcmlnZ2VyID0gJCgpO1xuICAgIHRoaXMuJHRyaWdnZXJzID0gJCgpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnT2ZmQ2FudmFzJylcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdPZmZDYW52YXMnLCB7XG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG9mZi1jYW52YXMgd3JhcHBlciBieSBhZGRpbmcgdGhlIGV4aXQgb3ZlcmxheSAoaWYgbmVlZGVkKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcblxuICAgIC8vIEZpbmQgdHJpZ2dlcnMgdGhhdCBhZmZlY3QgdGhpcyBlbGVtZW50IGFuZCBhZGQgYXJpYS1leHBhbmRlZCB0byB0aGVtXG4gICAgdGhpcy4kdHJpZ2dlcnMgPSAkKGRvY3VtZW50KVxuICAgICAgLmZpbmQoJ1tkYXRhLW9wZW49XCInK2lkKydcIl0sIFtkYXRhLWNsb3NlPVwiJytpZCsnXCJdLCBbZGF0YS10b2dnbGU9XCInK2lkKydcIl0nKVxuICAgICAgLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKVxuICAgICAgLmF0dHIoJ2FyaWEtY29udHJvbHMnLCBpZCk7XG5cbiAgICAvLyBBZGQgYSBjbG9zZSB0cmlnZ2VyIG92ZXIgdGhlIGJvZHkgaWYgbmVjZXNzYXJ5XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcbiAgICAgIGlmICgkKCcuanMtb2ZmLWNhbnZhcy1leGl0JykubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuJGV4aXRlciA9ICQoJy5qcy1vZmYtY2FudmFzLWV4aXQnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBleGl0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZXhpdGVyLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnanMtb2ZmLWNhbnZhcy1leGl0Jyk7XG4gICAgICAgICQoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5hcHBlbmQoZXhpdGVyKTtcblxuICAgICAgICB0aGlzLiRleGl0ZXIgPSAkKGV4aXRlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLmlzUmV2ZWFsZWQgPSB0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCB8fCBuZXcgUmVnRXhwKHRoaXMub3B0aW9ucy5yZXZlYWxDbGFzcywgJ2cnKS50ZXN0KHRoaXMuJGVsZW1lbnRbMF0uY2xhc3NOYW1lKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnJldmVhbE9uID0gdGhpcy5vcHRpb25zLnJldmVhbE9uIHx8IHRoaXMuJGVsZW1lbnRbMF0uY2xhc3NOYW1lLm1hdGNoKC8ocmV2ZWFsLWZvci1tZWRpdW18cmV2ZWFsLWZvci1sYXJnZSkvZylbMF0uc3BsaXQoJy0nKVsyXTtcbiAgICAgIHRoaXMuX3NldE1RQ2hlY2tlcigpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSkge1xuICAgICAgdGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lID0gcGFyc2VGbG9hdCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSgkKCdbZGF0YS1vZmYtY2FudmFzLXdyYXBwZXJdJylbMF0pLnRyYW5zaXRpb25EdXJhdGlvbikgKiAxMDAwO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIHRoZSBvZmYtY2FudmFzIHdyYXBwZXIgYW5kIHRoZSBleGl0IG92ZXJsYXkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXIgLnpmLm9mZmNhbnZhcycpLm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdrZXlkb3duLnpmLm9mZmNhbnZhcyc6IHRoaXMuX2hhbmRsZUtleWJvYXJkLmJpbmQodGhpcylcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrICYmIHRoaXMuJGV4aXRlci5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJGV4aXRlci5vbih7J2NsaWNrLnpmLm9mZmNhbnZhcyc6IHRoaXMuY2xvc2UuYmluZCh0aGlzKX0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBsaWVzIGV2ZW50IGxpc3RlbmVyIGZvciBlbGVtZW50cyB0aGF0IHdpbGwgcmV2ZWFsIGF0IGNlcnRhaW4gYnJlYWtwb2ludHMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0TVFDaGVja2VyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KF90aGlzLm9wdGlvbnMucmV2ZWFsT24pKSB7XG4gICAgICAgIF90aGlzLnJldmVhbCh0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF90aGlzLnJldmVhbChmYWxzZSk7XG4gICAgICB9XG4gICAgfSkub25lKCdsb2FkLnpmLm9mZmNhbnZhcycsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KF90aGlzLm9wdGlvbnMucmV2ZWFsT24pKSB7XG4gICAgICAgIF90aGlzLnJldmVhbCh0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSByZXZlYWxpbmcvaGlkaW5nIHRoZSBvZmYtY2FudmFzIGF0IGJyZWFrcG9pbnRzLCBub3QgdGhlIHNhbWUgYXMgb3Blbi5cbiAgICogQHBhcmFtIHtCb29sZWFufSBpc1JldmVhbGVkIC0gdHJ1ZSBpZiBlbGVtZW50IHNob3VsZCBiZSByZXZlYWxlZC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICByZXZlYWwoaXNSZXZlYWxlZCkge1xuICAgIHZhciAkY2xvc2VyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1jbG9zZV0nKTtcbiAgICBpZiAoaXNSZXZlYWxlZCkge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgdGhpcy5pc1JldmVhbGVkID0gdHJ1ZTtcbiAgICAgIC8vIGlmICghdGhpcy5vcHRpb25zLmZvcmNlVG9wKSB7XG4gICAgICAvLyAgIHZhciBzY3JvbGxQb3MgPSBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQpO1xuICAgICAgLy8gICB0aGlzLiRlbGVtZW50WzBdLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMCwnICsgc2Nyb2xsUG9zICsgJ3B4KSc7XG4gICAgICAvLyB9XG4gICAgICAvLyBpZiAodGhpcy5vcHRpb25zLmlzU3RpY2t5KSB7IHRoaXMuX3N0aWNrKCk7IH1cbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdvcGVuLnpmLnRyaWdnZXIgdG9nZ2xlLnpmLnRyaWdnZXInKTtcbiAgICAgIGlmICgkY2xvc2VyLmxlbmd0aCkgeyAkY2xvc2VyLmhpZGUoKTsgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmlzUmV2ZWFsZWQgPSBmYWxzZTtcbiAgICAgIC8vIGlmICh0aGlzLm9wdGlvbnMuaXNTdGlja3kgfHwgIXRoaXMub3B0aW9ucy5mb3JjZVRvcCkge1xuICAgICAgLy8gICB0aGlzLiRlbGVtZW50WzBdLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuICAgICAgLy8gICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYub2ZmY2FudmFzJyk7XG4gICAgICAvLyB9XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpXG4gICAgICB9KTtcbiAgICAgIGlmICgkY2xvc2VyLmxlbmd0aCkge1xuICAgICAgICAkY2xvc2VyLnNob3coKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIG9mZi1jYW52YXMgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCAtIEV2ZW50IG9iamVjdCBwYXNzZWQgZnJvbSBsaXN0ZW5lci5cbiAgICogQHBhcmFtIHtqUXVlcnl9IHRyaWdnZXIgLSBlbGVtZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBvZmYtY2FudmFzIHRvIG9wZW4uXG4gICAqIEBmaXJlcyBPZmZDYW52YXMjb3BlbmVkXG4gICAqL1xuICBvcGVuKGV2ZW50LCB0cmlnZ2VyKSB7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSB8fCB0aGlzLmlzUmV2ZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mb3JjZVRvcCkge1xuICAgICAgJCgnYm9keScpLnNjcm9sbFRvcCgwKTtcbiAgICB9XG4gICAgLy8gd2luZG93LnBhZ2VZT2Zmc2V0ID0gMDtcblxuICAgIC8vIGlmICghdGhpcy5vcHRpb25zLmZvcmNlVG9wKSB7XG4gICAgLy8gICB2YXIgc2Nyb2xsUG9zID0gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAvLyAgIHRoaXMuJGVsZW1lbnRbMF0uc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZSgwLCcgKyBzY3JvbGxQb3MgKyAncHgpJztcbiAgICAvLyAgIGlmICh0aGlzLiRleGl0ZXIubGVuZ3RoKSB7XG4gICAgLy8gICAgIHRoaXMuJGV4aXRlclswXS5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHNjcm9sbFBvcyArICdweCknO1xuICAgIC8vICAgfVxuICAgIC8vIH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBvZmYtY2FudmFzIG1lbnUgb3BlbnMuXG4gICAgICogQGV2ZW50IE9mZkNhbnZhcyNvcGVuZWRcbiAgICAgKi9cblxuICAgIHZhciAkd3JhcHBlciA9ICQoJ1tkYXRhLW9mZi1jYW52YXMtd3JhcHBlcl0nKTtcbiAgICAkd3JhcHBlci5hZGRDbGFzcygnaXMtb2ZmLWNhbnZhcy1vcGVuIGlzLW9wZW4tJysgX3RoaXMub3B0aW9ucy5wb3NpdGlvbik7XG5cbiAgICBfdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtb3BlbicpXG5cbiAgICAgIC8vIGlmIChfdGhpcy5vcHRpb25zLmlzU3RpY2t5KSB7XG4gICAgICAvLyAgIF90aGlzLl9zdGljaygpO1xuICAgICAgLy8gfVxuXG4gICAgdGhpcy4kdHJpZ2dlcnMuYXR0cignYXJpYS1leHBhbmRlZCcsICd0cnVlJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICdmYWxzZScpXG4gICAgICAgIC50cmlnZ2VyKCdvcGVuZWQuemYub2ZmY2FudmFzJyk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgdGhpcy4kZXhpdGVyLmFkZENsYXNzKCdpcy12aXNpYmxlJyk7XG4gICAgfVxuXG4gICAgaWYgKHRyaWdnZXIpIHtcbiAgICAgIHRoaXMuJGxhc3RUcmlnZ2VyID0gdHJpZ2dlcjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9Gb2N1cykge1xuICAgICAgJHdyYXBwZXIub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkd3JhcHBlciksIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZihfdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKSB7IC8vIGhhbmRsZSBkb3VibGUgY2xpY2tzXG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAnLTEnKTtcbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cykge1xuICAgICAgJHdyYXBwZXIub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkd3JhcHBlciksIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZihfdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKSB7IC8vIGhhbmRsZSBkb3VibGUgY2xpY2tzXG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAnLTEnKTtcbiAgICAgICAgICBfdGhpcy50cmFwRm9jdXMoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRyYXBzIGZvY3VzIHdpdGhpbiB0aGUgb2ZmY2FudmFzIG9uIG9wZW4uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdHJhcEZvY3VzKCkge1xuICAgIHZhciBmb2N1c2FibGUgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCksXG4gICAgICAgIGZpcnN0ID0gZm9jdXNhYmxlLmVxKDApLFxuICAgICAgICBsYXN0ID0gZm9jdXNhYmxlLmVxKC0xKTtcblxuICAgIGZvY3VzYWJsZS5vZmYoJy56Zi5vZmZjYW52YXMnKS5vbigna2V5ZG93bi56Zi5vZmZjYW52YXMnLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIga2V5ID0gRm91bmRhdGlvbi5LZXlib2FyZC5wYXJzZUtleShlKTtcbiAgICAgIGlmIChrZXkgPT09ICdUQUInICYmIGUudGFyZ2V0ID09PSBsYXN0WzBdKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZmlyc3QuZm9jdXMoKTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgPT09ICdTSElGVF9UQUInICYmIGUudGFyZ2V0ID09PSBmaXJzdFswXSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGxhc3QuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG9mZmNhbnZhcyB0byBhcHBlYXIgc3RpY2t5IHV0aWxpemluZyB0cmFuc2xhdGUgcHJvcGVydGllcy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIC8vIE9mZkNhbnZhcy5wcm90b3R5cGUuX3N0aWNrID0gZnVuY3Rpb24oKSB7XG4gIC8vICAgdmFyIGVsU3R5bGUgPSB0aGlzLiRlbGVtZW50WzBdLnN0eWxlO1xuICAvL1xuICAvLyAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XG4gIC8vICAgICB2YXIgZXhpdFN0eWxlID0gdGhpcy4kZXhpdGVyWzBdLnN0eWxlO1xuICAvLyAgIH1cbiAgLy9cbiAgLy8gICAkKHdpbmRvdykub24oJ3Njcm9sbC56Zi5vZmZjYW52YXMnLCBmdW5jdGlvbihlKSB7XG4gIC8vICAgICBjb25zb2xlLmxvZyhlKTtcbiAgLy8gICAgIHZhciBwYWdlWSA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgLy8gICAgIGVsU3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZSgwLCcgKyBwYWdlWSArICdweCknO1xuICAvLyAgICAgaWYgKGV4aXRTdHlsZSAhPT0gdW5kZWZpbmVkKSB7IGV4aXRTdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHBhZ2VZICsgJ3B4KSc7IH1cbiAgLy8gICB9KTtcbiAgLy8gICAvLyB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3N0dWNrLnpmLm9mZmNhbnZhcycpO1xuICAvLyB9O1xuICAvKipcbiAgICogQ2xvc2VzIHRoZSBvZmYtY2FudmFzIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNiIHRvIGZpcmUgYWZ0ZXIgY2xvc3VyZS5cbiAgICogQGZpcmVzIE9mZkNhbnZhcyNjbG9zZWRcbiAgICovXG4gIGNsb3NlKGNiKSB7XG4gICAgaWYgKCF0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykgfHwgdGhpcy5pc1JldmVhbGVkKSB7IHJldHVybjsgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vICBGb3VuZGF0aW9uLk1vdmUodGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lLCB0aGlzLiRlbGVtZW50LCBmdW5jdGlvbigpIHtcbiAgICAkKCdbZGF0YS1vZmYtY2FudmFzLXdyYXBwZXJdJykucmVtb3ZlQ2xhc3MoYGlzLW9mZi1jYW52YXMtb3BlbiBpcy1vcGVuLSR7X3RoaXMub3B0aW9ucy5wb3NpdGlvbn1gKTtcbiAgICBfdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygnaXMtb3BlbicpO1xuICAgICAgLy8gRm91bmRhdGlvbi5fcmVmbG93KCk7XG4gICAgLy8gfSk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICd0cnVlJylcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW5zLlxuICAgICAgICogQGV2ZW50IE9mZkNhbnZhcyNjbG9zZWRcbiAgICAgICAqL1xuICAgICAgICAudHJpZ2dlcignY2xvc2VkLnpmLm9mZmNhbnZhcycpO1xuICAgIC8vIGlmIChfdGhpcy5vcHRpb25zLmlzU3RpY2t5IHx8ICFfdGhpcy5vcHRpb25zLmZvcmNlVG9wKSB7XG4gICAgLy8gICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgIC8vICAgICBfdGhpcy4kZWxlbWVudFswXS5zdHlsZS50cmFuc2Zvcm0gPSAnJztcbiAgICAvLyAgICAgJCh3aW5kb3cpLm9mZignc2Nyb2xsLnpmLm9mZmNhbnZhcycpO1xuICAgIC8vICAgfSwgdGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lKTtcbiAgICAvLyB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcbiAgICAgIHRoaXMuJGV4aXRlci5yZW1vdmVDbGFzcygnaXMtdmlzaWJsZScpO1xuICAgIH1cblxuICAgIHRoaXMuJHRyaWdnZXJzLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cykge1xuICAgICAgJCgnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpLnJlbW92ZUF0dHIoJ3RhYmluZGV4Jyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9mZi1jYW52YXMgbWVudSBvcGVuIG9yIGNsb3NlZC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCAtIEV2ZW50IG9iamVjdCBwYXNzZWQgZnJvbSBsaXN0ZW5lci5cbiAgICogQHBhcmFtIHtqUXVlcnl9IHRyaWdnZXIgLSBlbGVtZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBvZmYtY2FudmFzIHRvIG9wZW4uXG4gICAqL1xuICB0b2dnbGUoZXZlbnQsIHRyaWdnZXIpIHtcbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKSB7XG4gICAgICB0aGlzLmNsb3NlKGV2ZW50LCB0cmlnZ2VyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLm9wZW4oZXZlbnQsIHRyaWdnZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGtleWJvYXJkIGlucHV0IHdoZW4gZGV0ZWN0ZWQuIFdoZW4gdGhlIGVzY2FwZSBrZXkgaXMgcHJlc3NlZCwgdGhlIG9mZi1jYW52YXMgbWVudSBjbG9zZXMsIGFuZCBmb2N1cyBpcyByZXN0b3JlZCB0byB0aGUgZWxlbWVudCB0aGF0IG9wZW5lZCB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGFuZGxlS2V5Ym9hcmQoZSkge1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdPZmZDYW52YXMnLCB7XG4gICAgICBjbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIHRoaXMuJGxhc3RUcmlnZ2VyLmZvY3VzKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIGhhbmRsZWQ6ICgpID0+IHtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBvZmZjYW52YXMgcGx1Z2luLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYub2ZmY2FudmFzJyk7XG4gICAgdGhpcy4kZXhpdGVyLm9mZignLnpmLm9mZmNhbnZhcycpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbk9mZkNhbnZhcy5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFsbG93IHRoZSB1c2VyIHRvIGNsaWNrIG91dHNpZGUgb2YgdGhlIG1lbnUgdG8gY2xvc2UgaXQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSBpbiBtcyB0aGUgb3BlbiBhbmQgY2xvc2UgdHJhbnNpdGlvbiByZXF1aXJlcy4gSWYgbm9uZSBzZWxlY3RlZCwgcHVsbHMgZnJvbSBib2R5IHN0eWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwMFxuICAgKi9cbiAgdHJhbnNpdGlvblRpbWU6IDAsXG5cbiAgLyoqXG4gICAqIERpcmVjdGlvbiB0aGUgb2ZmY2FudmFzIG9wZW5zIGZyb20uIERldGVybWluZXMgY2xhc3MgYXBwbGllZCB0byBib2R5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGxlZnRcbiAgICovXG4gIHBvc2l0aW9uOiAnbGVmdCcsXG5cbiAgLyoqXG4gICAqIEZvcmNlIHRoZSBwYWdlIHRvIHNjcm9sbCB0byB0b3Agb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBmb3JjZVRvcDogdHJ1ZSxcblxuICAvKipcbiAgICogQWxsb3cgdGhlIG9mZmNhbnZhcyB0byByZW1haW4gb3BlbiBmb3IgY2VydGFpbiBicmVha3BvaW50cy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgaXNSZXZlYWxlZDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEJyZWFrcG9pbnQgYXQgd2hpY2ggdG8gcmV2ZWFsLiBKUyB3aWxsIHVzZSBhIFJlZ0V4cCB0byB0YXJnZXQgc3RhbmRhcmQgY2xhc3NlcywgaWYgY2hhbmdpbmcgY2xhc3NuYW1lcywgcGFzcyB5b3VyIGNsYXNzIHdpdGggdGhlIGByZXZlYWxDbGFzc2Agb3B0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHJldmVhbC1mb3ItbGFyZ2VcbiAgICovXG4gIHJldmVhbE9uOiBudWxsLFxuXG4gIC8qKlxuICAgKiBGb3JjZSBmb2N1cyB0byB0aGUgb2ZmY2FudmFzIG9uIG9wZW4uIElmIHRydWUsIHdpbGwgZm9jdXMgdGhlIG9wZW5pbmcgdHJpZ2dlciBvbiBjbG9zZS4gU2V0cyB0YWJpbmRleCBvZiBbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdIHRvIC0xIGZvciBhY2Nlc3NpYmlsaXR5IHB1cnBvc2VzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGF1dG9Gb2N1czogdHJ1ZSxcblxuICAvKipcbiAgICogQ2xhc3MgdXNlZCB0byBmb3JjZSBhbiBvZmZjYW52YXMgdG8gcmVtYWluIG9wZW4uIEZvdW5kYXRpb24gZGVmYXVsdHMgZm9yIHRoaXMgYXJlIGByZXZlYWwtZm9yLWxhcmdlYCAmIGByZXZlYWwtZm9yLW1lZGl1bWAuXG4gICAqIEBvcHRpb25cbiAgICogVE9ETyBpbXByb3ZlIHRoZSByZWdleCB0ZXN0aW5nIGZvciB0aGlzLlxuICAgKiBAZXhhbXBsZSByZXZlYWwtZm9yLWxhcmdlXG4gICAqL1xuICByZXZlYWxDbGFzczogJ3JldmVhbC1mb3ItJyxcblxuICAvKipcbiAgICogVHJpZ2dlcnMgb3B0aW9uYWwgZm9jdXMgdHJhcHBpbmcgd2hlbiBvcGVuaW5nIGFuIG9mZmNhbnZhcy4gU2V0cyB0YWJpbmRleCBvZiBbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdIHRvIC0xIGZvciBhY2Nlc3NpYmlsaXR5IHB1cnBvc2VzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIHRyYXBGb2N1czogZmFsc2Vcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKE9mZkNhbnZhcywgJ09mZkNhbnZhcycpO1xuXG59KGpRdWVyeSk7XG4iLCIvKlxuICAgICBfIF8gICAgICBfICAgICAgIF9cbiBfX198IChfKSBfX198IHwgX18gIChfKV9fX1xuLyBfX3wgfCB8LyBfX3wgfC8gLyAgfCAvIF9ffFxuXFxfXyBcXCB8IHwgKF9ffCAgIDwgXyB8IFxcX18gXFxcbnxfX18vX3xffFxcX19ffF98XFxfKF8pLyB8X19fL1xuICAgICAgICAgICAgICAgICAgIHxfXy9cblxuIFZlcnNpb246IDEuNi4wXG4gIEF1dGhvcjogS2VuIFdoZWVsZXJcbiBXZWJzaXRlOiBodHRwOi8va2Vud2hlZWxlci5naXRodWIuaW9cbiAgICBEb2NzOiBodHRwOi8va2Vud2hlZWxlci5naXRodWIuaW8vc2xpY2tcbiAgICBSZXBvOiBodHRwOi8vZ2l0aHViLmNvbS9rZW53aGVlbGVyL3NsaWNrXG4gIElzc3VlczogaHR0cDovL2dpdGh1Yi5jb20va2Vud2hlZWxlci9zbGljay9pc3N1ZXNcblxuICovXG4hZnVuY3Rpb24oYSl7XCJ1c2Ugc3RyaWN0XCI7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShbXCJqcXVlcnlcIl0sYSk6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9YShyZXF1aXJlKFwianF1ZXJ5XCIpKTphKGpRdWVyeSl9KGZ1bmN0aW9uKGEpe1widXNlIHN0cmljdFwiO3ZhciBiPXdpbmRvdy5TbGlja3x8e307Yj1mdW5jdGlvbigpe2Z1bmN0aW9uIGMoYyxkKXt2YXIgZixlPXRoaXM7ZS5kZWZhdWx0cz17YWNjZXNzaWJpbGl0eTohMCxhZGFwdGl2ZUhlaWdodDohMSxhcHBlbmRBcnJvd3M6YShjKSxhcHBlbmREb3RzOmEoYyksYXJyb3dzOiEwLGFzTmF2Rm9yOm51bGwscHJldkFycm93Oic8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLXJvbGU9XCJub25lXCIgY2xhc3M9XCJzbGljay1wcmV2XCIgYXJpYS1sYWJlbD1cIlByZXZpb3VzXCIgdGFiaW5kZXg9XCIwXCIgcm9sZT1cImJ1dHRvblwiPlByZXZpb3VzPC9idXR0b24+JyxuZXh0QXJyb3c6JzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtcm9sZT1cIm5vbmVcIiBjbGFzcz1cInNsaWNrLW5leHRcIiBhcmlhLWxhYmVsPVwiTmV4dFwiIHRhYmluZGV4PVwiMFwiIHJvbGU9XCJidXR0b25cIj5OZXh0PC9idXR0b24+JyxhdXRvcGxheTohMSxhdXRvcGxheVNwZWVkOjNlMyxjZW50ZXJNb2RlOiExLGNlbnRlclBhZGRpbmc6XCI1MHB4XCIsY3NzRWFzZTpcImVhc2VcIixjdXN0b21QYWdpbmc6ZnVuY3Rpb24oYixjKXtyZXR1cm4gYSgnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1yb2xlPVwibm9uZVwiIHJvbGU9XCJidXR0b25cIiB0YWJpbmRleD1cIjBcIiAvPicpLnRleHQoYysxKX0sZG90czohMSxkb3RzQ2xhc3M6XCJzbGljay1kb3RzXCIsZHJhZ2dhYmxlOiEwLGVhc2luZzpcImxpbmVhclwiLGVkZ2VGcmljdGlvbjouMzUsZmFkZTohMSxmb2N1c09uU2VsZWN0OiExLGluZmluaXRlOiEwLGluaXRpYWxTbGlkZTowLGxhenlMb2FkOlwib25kZW1hbmRcIixtb2JpbGVGaXJzdDohMSxwYXVzZU9uSG92ZXI6ITAscGF1c2VPbkZvY3VzOiEwLHBhdXNlT25Eb3RzSG92ZXI6ITEscmVzcG9uZFRvOlwid2luZG93XCIscmVzcG9uc2l2ZTpudWxsLHJvd3M6MSxydGw6ITEsc2xpZGU6XCJcIixzbGlkZXNQZXJSb3c6MSxzbGlkZXNUb1Nob3c6MSxzbGlkZXNUb1Njcm9sbDoxLHNwZWVkOjUwMCxzd2lwZTohMCxzd2lwZVRvU2xpZGU6ITEsdG91Y2hNb3ZlOiEwLHRvdWNoVGhyZXNob2xkOjUsdXNlQ1NTOiEwLHVzZVRyYW5zZm9ybTohMCx2YXJpYWJsZVdpZHRoOiExLHZlcnRpY2FsOiExLHZlcnRpY2FsU3dpcGluZzohMSx3YWl0Rm9yQW5pbWF0ZTohMCx6SW5kZXg6MWUzfSxlLmluaXRpYWxzPXthbmltYXRpbmc6ITEsZHJhZ2dpbmc6ITEsYXV0b1BsYXlUaW1lcjpudWxsLGN1cnJlbnREaXJlY3Rpb246MCxjdXJyZW50TGVmdDpudWxsLGN1cnJlbnRTbGlkZTowLGRpcmVjdGlvbjoxLCRkb3RzOm51bGwsbGlzdFdpZHRoOm51bGwsbGlzdEhlaWdodDpudWxsLGxvYWRJbmRleDowLCRuZXh0QXJyb3c6bnVsbCwkcHJldkFycm93Om51bGwsc2xpZGVDb3VudDpudWxsLHNsaWRlV2lkdGg6bnVsbCwkc2xpZGVUcmFjazpudWxsLCRzbGlkZXM6bnVsbCxzbGlkaW5nOiExLHNsaWRlT2Zmc2V0OjAsc3dpcGVMZWZ0Om51bGwsJGxpc3Q6bnVsbCx0b3VjaE9iamVjdDp7fSx0cmFuc2Zvcm1zRW5hYmxlZDohMSx1bnNsaWNrZWQ6ITF9LGEuZXh0ZW5kKGUsZS5pbml0aWFscyksZS5hY3RpdmVCcmVha3BvaW50PW51bGwsZS5hbmltVHlwZT1udWxsLGUuYW5pbVByb3A9bnVsbCxlLmJyZWFrcG9pbnRzPVtdLGUuYnJlYWtwb2ludFNldHRpbmdzPVtdLGUuY3NzVHJhbnNpdGlvbnM9ITEsZS5mb2N1c3NlZD0hMSxlLmludGVycnVwdGVkPSExLGUuaGlkZGVuPVwiaGlkZGVuXCIsZS5wYXVzZWQ9ITAsZS5wb3NpdGlvblByb3A9bnVsbCxlLnJlc3BvbmRUbz1udWxsLGUucm93Q291bnQ9MSxlLnNob3VsZENsaWNrPSEwLGUuJHNsaWRlcj1hKGMpLGUuJHNsaWRlc0NhY2hlPW51bGwsZS50cmFuc2Zvcm1UeXBlPW51bGwsZS50cmFuc2l0aW9uVHlwZT1udWxsLGUudmlzaWJpbGl0eUNoYW5nZT1cInZpc2liaWxpdHljaGFuZ2VcIixlLndpbmRvd1dpZHRoPTAsZS53aW5kb3dUaW1lcj1udWxsLGY9YShjKS5kYXRhKFwic2xpY2tcIil8fHt9LGUub3B0aW9ucz1hLmV4dGVuZCh7fSxlLmRlZmF1bHRzLGQsZiksZS5jdXJyZW50U2xpZGU9ZS5vcHRpb25zLmluaXRpYWxTbGlkZSxlLm9yaWdpbmFsU2V0dGluZ3M9ZS5vcHRpb25zLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4/KGUuaGlkZGVuPVwibW96SGlkZGVuXCIsZS52aXNpYmlsaXR5Q2hhbmdlPVwibW96dmlzaWJpbGl0eWNoYW5nZVwiKTpcInVuZGVmaW5lZFwiIT10eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuJiYoZS5oaWRkZW49XCJ3ZWJraXRIaWRkZW5cIixlLnZpc2liaWxpdHlDaGFuZ2U9XCJ3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlXCIpLGUuYXV0b1BsYXk9YS5wcm94eShlLmF1dG9QbGF5LGUpLGUuYXV0b1BsYXlDbGVhcj1hLnByb3h5KGUuYXV0b1BsYXlDbGVhcixlKSxlLmF1dG9QbGF5SXRlcmF0b3I9YS5wcm94eShlLmF1dG9QbGF5SXRlcmF0b3IsZSksZS5jaGFuZ2VTbGlkZT1hLnByb3h5KGUuY2hhbmdlU2xpZGUsZSksZS5jbGlja0hhbmRsZXI9YS5wcm94eShlLmNsaWNrSGFuZGxlcixlKSxlLnNlbGVjdEhhbmRsZXI9YS5wcm94eShlLnNlbGVjdEhhbmRsZXIsZSksZS5zZXRQb3NpdGlvbj1hLnByb3h5KGUuc2V0UG9zaXRpb24sZSksZS5zd2lwZUhhbmRsZXI9YS5wcm94eShlLnN3aXBlSGFuZGxlcixlKSxlLmRyYWdIYW5kbGVyPWEucHJveHkoZS5kcmFnSGFuZGxlcixlKSxlLmtleUhhbmRsZXI9YS5wcm94eShlLmtleUhhbmRsZXIsZSksZS5pbnN0YW5jZVVpZD1iKyssZS5odG1sRXhwcj0vXig/OlxccyooPFtcXHdcXFddKz4pW14+XSopJC8sZS5yZWdpc3RlckJyZWFrcG9pbnRzKCksZS5pbml0KCEwKX12YXIgYj0wO3JldHVybiBjfSgpLGIucHJvdG90eXBlLmFjdGl2YXRlQURBPWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLiRzbGlkZVRyYWNrLmZpbmQoXCIuc2xpY2stYWN0aXZlXCIpLmF0dHIoe1wiYXJpYS1oaWRkZW5cIjpcImZhbHNlXCJ9KS5maW5kKFwiYSwgaW5wdXQsIGJ1dHRvbiwgc2VsZWN0XCIpLmF0dHIoe3RhYmluZGV4OlwiMFwifSl9LGIucHJvdG90eXBlLmFkZFNsaWRlPWIucHJvdG90eXBlLnNsaWNrQWRkPWZ1bmN0aW9uKGIsYyxkKXt2YXIgZT10aGlzO2lmKFwiYm9vbGVhblwiPT10eXBlb2YgYylkPWMsYz1udWxsO2Vsc2UgaWYoMD5jfHxjPj1lLnNsaWRlQ291bnQpcmV0dXJuITE7ZS51bmxvYWQoKSxcIm51bWJlclwiPT10eXBlb2YgYz8wPT09YyYmMD09PWUuJHNsaWRlcy5sZW5ndGg/YShiKS5hcHBlbmRUbyhlLiRzbGlkZVRyYWNrKTpkP2EoYikuaW5zZXJ0QmVmb3JlKGUuJHNsaWRlcy5lcShjKSk6YShiKS5pbnNlcnRBZnRlcihlLiRzbGlkZXMuZXEoYykpOmQ9PT0hMD9hKGIpLnByZXBlbmRUbyhlLiRzbGlkZVRyYWNrKTphKGIpLmFwcGVuZFRvKGUuJHNsaWRlVHJhY2spLGUuJHNsaWRlcz1lLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSksZS4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpLmRldGFjaCgpLGUuJHNsaWRlVHJhY2suYXBwZW5kKGUuJHNsaWRlcyksZS4kc2xpZGVzLmVhY2goZnVuY3Rpb24oYixjKXthKGMpLmF0dHIoXCJkYXRhLXNsaWNrLWluZGV4XCIsYil9KSxlLiRzbGlkZXNDYWNoZT1lLiRzbGlkZXMsZS5yZWluaXQoKX0sYi5wcm90b3R5cGUuYW5pbWF0ZUhlaWdodD1mdW5jdGlvbigpe3ZhciBhPXRoaXM7aWYoMT09PWEub3B0aW9ucy5zbGlkZXNUb1Nob3cmJmEub3B0aW9ucy5hZGFwdGl2ZUhlaWdodD09PSEwJiZhLm9wdGlvbnMudmVydGljYWw9PT0hMSl7dmFyIGI9YS4kc2xpZGVzLmVxKGEuY3VycmVudFNsaWRlKS5vdXRlckhlaWdodCghMCk7YS4kbGlzdC5hbmltYXRlKHtoZWlnaHQ6Yn0sYS5vcHRpb25zLnNwZWVkKX19LGIucHJvdG90eXBlLmFuaW1hdGVTbGlkZT1mdW5jdGlvbihiLGMpe3ZhciBkPXt9LGU9dGhpcztlLmFuaW1hdGVIZWlnaHQoKSxlLm9wdGlvbnMucnRsPT09ITAmJmUub3B0aW9ucy52ZXJ0aWNhbD09PSExJiYoYj0tYiksZS50cmFuc2Zvcm1zRW5hYmxlZD09PSExP2Uub3B0aW9ucy52ZXJ0aWNhbD09PSExP2UuJHNsaWRlVHJhY2suYW5pbWF0ZSh7bGVmdDpifSxlLm9wdGlvbnMuc3BlZWQsZS5vcHRpb25zLmVhc2luZyxjKTplLiRzbGlkZVRyYWNrLmFuaW1hdGUoe3RvcDpifSxlLm9wdGlvbnMuc3BlZWQsZS5vcHRpb25zLmVhc2luZyxjKTplLmNzc1RyYW5zaXRpb25zPT09ITE/KGUub3B0aW9ucy5ydGw9PT0hMCYmKGUuY3VycmVudExlZnQ9LWUuY3VycmVudExlZnQpLGEoe2FuaW1TdGFydDplLmN1cnJlbnRMZWZ0fSkuYW5pbWF0ZSh7YW5pbVN0YXJ0OmJ9LHtkdXJhdGlvbjplLm9wdGlvbnMuc3BlZWQsZWFzaW5nOmUub3B0aW9ucy5lYXNpbmcsc3RlcDpmdW5jdGlvbihhKXthPU1hdGguY2VpbChhKSxlLm9wdGlvbnMudmVydGljYWw9PT0hMT8oZFtlLmFuaW1UeXBlXT1cInRyYW5zbGF0ZShcIithK1wicHgsIDBweClcIixlLiRzbGlkZVRyYWNrLmNzcyhkKSk6KGRbZS5hbmltVHlwZV09XCJ0cmFuc2xhdGUoMHB4LFwiK2ErXCJweClcIixlLiRzbGlkZVRyYWNrLmNzcyhkKSl9LGNvbXBsZXRlOmZ1bmN0aW9uKCl7YyYmYy5jYWxsKCl9fSkpOihlLmFwcGx5VHJhbnNpdGlvbigpLGI9TWF0aC5jZWlsKGIpLGUub3B0aW9ucy52ZXJ0aWNhbD09PSExP2RbZS5hbmltVHlwZV09XCJ0cmFuc2xhdGUzZChcIitiK1wicHgsIDBweCwgMHB4KVwiOmRbZS5hbmltVHlwZV09XCJ0cmFuc2xhdGUzZCgwcHgsXCIrYitcInB4LCAwcHgpXCIsZS4kc2xpZGVUcmFjay5jc3MoZCksYyYmc2V0VGltZW91dChmdW5jdGlvbigpe2UuZGlzYWJsZVRyYW5zaXRpb24oKSxjLmNhbGwoKX0sZS5vcHRpb25zLnNwZWVkKSl9LGIucHJvdG90eXBlLmdldE5hdlRhcmdldD1mdW5jdGlvbigpe3ZhciBiPXRoaXMsYz1iLm9wdGlvbnMuYXNOYXZGb3I7cmV0dXJuIGMmJm51bGwhPT1jJiYoYz1hKGMpLm5vdChiLiRzbGlkZXIpKSxjfSxiLnByb3RvdHlwZS5hc05hdkZvcj1mdW5jdGlvbihiKXt2YXIgYz10aGlzLGQ9Yy5nZXROYXZUYXJnZXQoKTtudWxsIT09ZCYmXCJvYmplY3RcIj09dHlwZW9mIGQmJmQuZWFjaChmdW5jdGlvbigpe3ZhciBjPWEodGhpcykuc2xpY2soXCJnZXRTbGlja1wiKTtjLnVuc2xpY2tlZHx8Yy5zbGlkZUhhbmRsZXIoYiwhMCl9KX0sYi5wcm90b3R5cGUuYXBwbHlUcmFuc2l0aW9uPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMsYz17fTtiLm9wdGlvbnMuZmFkZT09PSExP2NbYi50cmFuc2l0aW9uVHlwZV09Yi50cmFuc2Zvcm1UeXBlK1wiIFwiK2Iub3B0aW9ucy5zcGVlZCtcIm1zIFwiK2Iub3B0aW9ucy5jc3NFYXNlOmNbYi50cmFuc2l0aW9uVHlwZV09XCJvcGFjaXR5IFwiK2Iub3B0aW9ucy5zcGVlZCtcIm1zIFwiK2Iub3B0aW9ucy5jc3NFYXNlLGIub3B0aW9ucy5mYWRlPT09ITE/Yi4kc2xpZGVUcmFjay5jc3MoYyk6Yi4kc2xpZGVzLmVxKGEpLmNzcyhjKX0sYi5wcm90b3R5cGUuYXV0b1BsYXk9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2EuYXV0b1BsYXlDbGVhcigpLGEuc2xpZGVDb3VudD5hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiYoYS5hdXRvUGxheVRpbWVyPXNldEludGVydmFsKGEuYXV0b1BsYXlJdGVyYXRvcixhLm9wdGlvbnMuYXV0b3BsYXlTcGVlZCkpfSxiLnByb3RvdHlwZS5hdXRvUGxheUNsZWFyPWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLmF1dG9QbGF5VGltZXImJmNsZWFySW50ZXJ2YWwoYS5hdXRvUGxheVRpbWVyKX0sYi5wcm90b3R5cGUuYXV0b1BsYXlJdGVyYXRvcj1mdW5jdGlvbigpe3ZhciBhPXRoaXMsYj1hLmN1cnJlbnRTbGlkZSthLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw7YS5wYXVzZWR8fGEuaW50ZXJydXB0ZWR8fGEuZm9jdXNzZWR8fChhLm9wdGlvbnMuaW5maW5pdGU9PT0hMSYmKDE9PT1hLmRpcmVjdGlvbiYmYS5jdXJyZW50U2xpZGUrMT09PWEuc2xpZGVDb3VudC0xP2EuZGlyZWN0aW9uPTA6MD09PWEuZGlyZWN0aW9uJiYoYj1hLmN1cnJlbnRTbGlkZS1hLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwsYS5jdXJyZW50U2xpZGUtMT09PTAmJihhLmRpcmVjdGlvbj0xKSkpLGEuc2xpZGVIYW5kbGVyKGIpKX0sYi5wcm90b3R5cGUuYnVpbGRBcnJvd3M9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2Iub3B0aW9ucy5hcnJvd3M9PT0hMCYmKGIuJHByZXZBcnJvdz1hKGIub3B0aW9ucy5wcmV2QXJyb3cpLmFkZENsYXNzKFwic2xpY2stYXJyb3dcIiksYi4kbmV4dEFycm93PWEoYi5vcHRpb25zLm5leHRBcnJvdykuYWRkQ2xhc3MoXCJzbGljay1hcnJvd1wiKSxiLnNsaWRlQ291bnQ+Yi5vcHRpb25zLnNsaWRlc1RvU2hvdz8oYi4kcHJldkFycm93LnJlbW92ZUNsYXNzKFwic2xpY2staGlkZGVuXCIpLnJlbW92ZUF0dHIoXCJhcmlhLWhpZGRlbiB0YWJpbmRleFwiKSxiLiRuZXh0QXJyb3cucmVtb3ZlQ2xhc3MoXCJzbGljay1oaWRkZW5cIikucmVtb3ZlQXR0cihcImFyaWEtaGlkZGVuIHRhYmluZGV4XCIpLGIuaHRtbEV4cHIudGVzdChiLm9wdGlvbnMucHJldkFycm93KSYmYi4kcHJldkFycm93LnByZXBlbmRUbyhiLm9wdGlvbnMuYXBwZW5kQXJyb3dzKSxiLmh0bWxFeHByLnRlc3QoYi5vcHRpb25zLm5leHRBcnJvdykmJmIuJG5leHRBcnJvdy5hcHBlbmRUbyhiLm9wdGlvbnMuYXBwZW5kQXJyb3dzKSxiLm9wdGlvbnMuaW5maW5pdGUhPT0hMCYmYi4kcHJldkFycm93LmFkZENsYXNzKFwic2xpY2stZGlzYWJsZWRcIikuYXR0cihcImFyaWEtZGlzYWJsZWRcIixcInRydWVcIikpOmIuJHByZXZBcnJvdy5hZGQoYi4kbmV4dEFycm93KS5hZGRDbGFzcyhcInNsaWNrLWhpZGRlblwiKS5hdHRyKHtcImFyaWEtZGlzYWJsZWRcIjpcInRydWVcIix0YWJpbmRleDpcIi0xXCJ9KSl9LGIucHJvdG90eXBlLmJ1aWxkRG90cz1mdW5jdGlvbigpe3ZhciBjLGQsYj10aGlzO2lmKGIub3B0aW9ucy5kb3RzPT09ITAmJmIuc2xpZGVDb3VudD5iLm9wdGlvbnMuc2xpZGVzVG9TaG93KXtmb3IoYi4kc2xpZGVyLmFkZENsYXNzKFwic2xpY2stZG90dGVkXCIpLGQ9YShcIjx1bCAvPlwiKS5hZGRDbGFzcyhiLm9wdGlvbnMuZG90c0NsYXNzKSxjPTA7Yzw9Yi5nZXREb3RDb3VudCgpO2MrPTEpZC5hcHBlbmQoYShcIjxsaSAvPlwiKS5hcHBlbmQoYi5vcHRpb25zLmN1c3RvbVBhZ2luZy5jYWxsKHRoaXMsYixjKSkpO2IuJGRvdHM9ZC5hcHBlbmRUbyhiLm9wdGlvbnMuYXBwZW5kRG90cyksYi4kZG90cy5maW5kKFwibGlcIikuZmlyc3QoKS5hZGRDbGFzcyhcInNsaWNrLWFjdGl2ZVwiKS5hdHRyKFwiYXJpYS1oaWRkZW5cIixcImZhbHNlXCIpfX0sYi5wcm90b3R5cGUuYnVpbGRPdXQ9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2IuJHNsaWRlcz1iLiRzbGlkZXIuY2hpbGRyZW4oYi5vcHRpb25zLnNsaWRlK1wiOm5vdCguc2xpY2stY2xvbmVkKVwiKS5hZGRDbGFzcyhcInNsaWNrLXNsaWRlXCIpLGIuc2xpZGVDb3VudD1iLiRzbGlkZXMubGVuZ3RoLGIuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKGIsYyl7YShjKS5hdHRyKFwiZGF0YS1zbGljay1pbmRleFwiLGIpLmRhdGEoXCJvcmlnaW5hbFN0eWxpbmdcIixhKGMpLmF0dHIoXCJzdHlsZVwiKXx8XCJcIil9KSxiLiRzbGlkZXIuYWRkQ2xhc3MoXCJzbGljay1zbGlkZXJcIiksYi4kc2xpZGVUcmFjaz0wPT09Yi5zbGlkZUNvdW50P2EoJzxkaXYgY2xhc3M9XCJzbGljay10cmFja1wiLz4nKS5hcHBlbmRUbyhiLiRzbGlkZXIpOmIuJHNsaWRlcy53cmFwQWxsKCc8ZGl2IGNsYXNzPVwic2xpY2stdHJhY2tcIi8+JykucGFyZW50KCksYi4kbGlzdD1iLiRzbGlkZVRyYWNrLndyYXAoJzxkaXYgYXJpYS1saXZlPVwicG9saXRlXCIgY2xhc3M9XCJzbGljay1saXN0XCIvPicpLnBhcmVudCgpLGIuJHNsaWRlVHJhY2suY3NzKFwib3BhY2l0eVwiLDApLChiLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwfHxiLm9wdGlvbnMuc3dpcGVUb1NsaWRlPT09ITApJiYoYi5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsPTEpLGEoXCJpbWdbZGF0YS1sYXp5XVwiLGIuJHNsaWRlcikubm90KFwiW3NyY11cIikuYWRkQ2xhc3MoXCJzbGljay1sb2FkaW5nXCIpLGIuc2V0dXBJbmZpbml0ZSgpLGIuYnVpbGRBcnJvd3MoKSxiLmJ1aWxkRG90cygpLGIudXBkYXRlRG90cygpLGIuc2V0U2xpZGVDbGFzc2VzKFwibnVtYmVyXCI9PXR5cGVvZiBiLmN1cnJlbnRTbGlkZT9iLmN1cnJlbnRTbGlkZTowKSxiLm9wdGlvbnMuZHJhZ2dhYmxlPT09ITAmJmIuJGxpc3QuYWRkQ2xhc3MoXCJkcmFnZ2FibGVcIil9LGIucHJvdG90eXBlLmJ1aWxkUm93cz1mdW5jdGlvbigpe3ZhciBiLGMsZCxlLGYsZyxoLGE9dGhpcztpZihlPWRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxnPWEuJHNsaWRlci5jaGlsZHJlbigpLGEub3B0aW9ucy5yb3dzPjEpe2ZvcihoPWEub3B0aW9ucy5zbGlkZXNQZXJSb3cqYS5vcHRpb25zLnJvd3MsZj1NYXRoLmNlaWwoZy5sZW5ndGgvaCksYj0wO2Y+YjtiKyspe3ZhciBpPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7Zm9yKGM9MDtjPGEub3B0aW9ucy5yb3dzO2MrKyl7dmFyIGo9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtmb3IoZD0wO2Q8YS5vcHRpb25zLnNsaWRlc1BlclJvdztkKyspe3ZhciBrPWIqaCsoYyphLm9wdGlvbnMuc2xpZGVzUGVyUm93K2QpO2cuZ2V0KGspJiZqLmFwcGVuZENoaWxkKGcuZ2V0KGspKX1pLmFwcGVuZENoaWxkKGopfWUuYXBwZW5kQ2hpbGQoaSl9YS4kc2xpZGVyLmVtcHR5KCkuYXBwZW5kKGUpLGEuJHNsaWRlci5jaGlsZHJlbigpLmNoaWxkcmVuKCkuY2hpbGRyZW4oKS5jc3Moe3dpZHRoOjEwMC9hLm9wdGlvbnMuc2xpZGVzUGVyUm93K1wiJVwiLGRpc3BsYXk6XCJpbmxpbmUtYmxvY2tcIn0pfX0sYi5wcm90b3R5cGUuY2hlY2tSZXNwb25zaXZlPWZ1bmN0aW9uKGIsYyl7dmFyIGUsZixnLGQ9dGhpcyxoPSExLGk9ZC4kc2xpZGVyLndpZHRoKCksaj13aW5kb3cuaW5uZXJXaWR0aHx8YSh3aW5kb3cpLndpZHRoKCk7aWYoXCJ3aW5kb3dcIj09PWQucmVzcG9uZFRvP2c9ajpcInNsaWRlclwiPT09ZC5yZXNwb25kVG8/Zz1pOlwibWluXCI9PT1kLnJlc3BvbmRUbyYmKGc9TWF0aC5taW4oaixpKSksZC5vcHRpb25zLnJlc3BvbnNpdmUmJmQub3B0aW9ucy5yZXNwb25zaXZlLmxlbmd0aCYmbnVsbCE9PWQub3B0aW9ucy5yZXNwb25zaXZlKXtmPW51bGw7Zm9yKGUgaW4gZC5icmVha3BvaW50cylkLmJyZWFrcG9pbnRzLmhhc093blByb3BlcnR5KGUpJiYoZC5vcmlnaW5hbFNldHRpbmdzLm1vYmlsZUZpcnN0PT09ITE/ZzxkLmJyZWFrcG9pbnRzW2VdJiYoZj1kLmJyZWFrcG9pbnRzW2VdKTpnPmQuYnJlYWtwb2ludHNbZV0mJihmPWQuYnJlYWtwb2ludHNbZV0pKTtudWxsIT09Zj9udWxsIT09ZC5hY3RpdmVCcmVha3BvaW50PyhmIT09ZC5hY3RpdmVCcmVha3BvaW50fHxjKSYmKGQuYWN0aXZlQnJlYWtwb2ludD1mLFwidW5zbGlja1wiPT09ZC5icmVha3BvaW50U2V0dGluZ3NbZl0/ZC51bnNsaWNrKGYpOihkLm9wdGlvbnM9YS5leHRlbmQoe30sZC5vcmlnaW5hbFNldHRpbmdzLGQuYnJlYWtwb2ludFNldHRpbmdzW2ZdKSxiPT09ITAmJihkLmN1cnJlbnRTbGlkZT1kLm9wdGlvbnMuaW5pdGlhbFNsaWRlKSxkLnJlZnJlc2goYikpLGg9Zik6KGQuYWN0aXZlQnJlYWtwb2ludD1mLFwidW5zbGlja1wiPT09ZC5icmVha3BvaW50U2V0dGluZ3NbZl0/ZC51bnNsaWNrKGYpOihkLm9wdGlvbnM9YS5leHRlbmQoe30sZC5vcmlnaW5hbFNldHRpbmdzLGQuYnJlYWtwb2ludFNldHRpbmdzW2ZdKSxiPT09ITAmJihkLmN1cnJlbnRTbGlkZT1kLm9wdGlvbnMuaW5pdGlhbFNsaWRlKSxkLnJlZnJlc2goYikpLGg9Zik6bnVsbCE9PWQuYWN0aXZlQnJlYWtwb2ludCYmKGQuYWN0aXZlQnJlYWtwb2ludD1udWxsLGQub3B0aW9ucz1kLm9yaWdpbmFsU2V0dGluZ3MsYj09PSEwJiYoZC5jdXJyZW50U2xpZGU9ZC5vcHRpb25zLmluaXRpYWxTbGlkZSksZC5yZWZyZXNoKGIpLGg9ZiksYnx8aD09PSExfHxkLiRzbGlkZXIudHJpZ2dlcihcImJyZWFrcG9pbnRcIixbZCxoXSl9fSxiLnByb3RvdHlwZS5jaGFuZ2VTbGlkZT1mdW5jdGlvbihiLGMpe3ZhciBmLGcsaCxkPXRoaXMsZT1hKGIuY3VycmVudFRhcmdldCk7c3dpdGNoKGUuaXMoXCJhXCIpJiZiLnByZXZlbnREZWZhdWx0KCksZS5pcyhcImxpXCIpfHwoZT1lLmNsb3Nlc3QoXCJsaVwiKSksaD1kLnNsaWRlQ291bnQlZC5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIT09MCxmPWg/MDooZC5zbGlkZUNvdW50LWQuY3VycmVudFNsaWRlKSVkLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwsYi5kYXRhLm1lc3NhZ2Upe2Nhc2VcInByZXZpb3VzXCI6Zz0wPT09Zj9kLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw6ZC5vcHRpb25zLnNsaWRlc1RvU2hvdy1mLGQuc2xpZGVDb3VudD5kLm9wdGlvbnMuc2xpZGVzVG9TaG93JiZkLnNsaWRlSGFuZGxlcihkLmN1cnJlbnRTbGlkZS1nLCExLGMpO2JyZWFrO2Nhc2VcIm5leHRcIjpnPTA9PT1mP2Qub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDpmLGQuc2xpZGVDb3VudD5kLm9wdGlvbnMuc2xpZGVzVG9TaG93JiZkLnNsaWRlSGFuZGxlcihkLmN1cnJlbnRTbGlkZStnLCExLGMpO2JyZWFrO2Nhc2VcImluZGV4XCI6dmFyIGk9MD09PWIuZGF0YS5pbmRleD8wOmIuZGF0YS5pbmRleHx8ZS5pbmRleCgpKmQub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDtkLnNsaWRlSGFuZGxlcihkLmNoZWNrTmF2aWdhYmxlKGkpLCExLGMpLGUuY2hpbGRyZW4oKS50cmlnZ2VyKFwiZm9jdXNcIik7YnJlYWs7ZGVmYXVsdDpyZXR1cm59fSxiLnByb3RvdHlwZS5jaGVja05hdmlnYWJsZT1mdW5jdGlvbihhKXt2YXIgYyxkLGI9dGhpcztpZihjPWIuZ2V0TmF2aWdhYmxlSW5kZXhlcygpLGQ9MCxhPmNbYy5sZW5ndGgtMV0pYT1jW2MubGVuZ3RoLTFdO2Vsc2UgZm9yKHZhciBlIGluIGMpe2lmKGE8Y1tlXSl7YT1kO2JyZWFrfWQ9Y1tlXX1yZXR1cm4gYX0sYi5wcm90b3R5cGUuY2xlYW5VcEV2ZW50cz1mdW5jdGlvbigpe3ZhciBiPXRoaXM7Yi5vcHRpb25zLmRvdHMmJm51bGwhPT1iLiRkb3RzJiZhKFwibGlcIixiLiRkb3RzKS5vZmYoXCJjbGljay5zbGlja1wiLGIuY2hhbmdlU2xpZGUpLm9mZihcIm1vdXNlZW50ZXIuc2xpY2tcIixhLnByb3h5KGIuaW50ZXJydXB0LGIsITApKS5vZmYoXCJtb3VzZWxlYXZlLnNsaWNrXCIsYS5wcm94eShiLmludGVycnVwdCxiLCExKSksYi4kc2xpZGVyLm9mZihcImZvY3VzLnNsaWNrIGJsdXIuc2xpY2tcIiksYi5vcHRpb25zLmFycm93cz09PSEwJiZiLnNsaWRlQ291bnQ+Yi5vcHRpb25zLnNsaWRlc1RvU2hvdyYmKGIuJHByZXZBcnJvdyYmYi4kcHJldkFycm93Lm9mZihcImNsaWNrLnNsaWNrXCIsYi5jaGFuZ2VTbGlkZSksYi4kbmV4dEFycm93JiZiLiRuZXh0QXJyb3cub2ZmKFwiY2xpY2suc2xpY2tcIixiLmNoYW5nZVNsaWRlKSksYi4kbGlzdC5vZmYoXCJ0b3VjaHN0YXJ0LnNsaWNrIG1vdXNlZG93bi5zbGlja1wiLGIuc3dpcGVIYW5kbGVyKSxiLiRsaXN0Lm9mZihcInRvdWNobW92ZS5zbGljayBtb3VzZW1vdmUuc2xpY2tcIixiLnN3aXBlSGFuZGxlciksYi4kbGlzdC5vZmYoXCJ0b3VjaGVuZC5zbGljayBtb3VzZXVwLnNsaWNrXCIsYi5zd2lwZUhhbmRsZXIpLGIuJGxpc3Qub2ZmKFwidG91Y2hjYW5jZWwuc2xpY2sgbW91c2VsZWF2ZS5zbGlja1wiLGIuc3dpcGVIYW5kbGVyKSxiLiRsaXN0Lm9mZihcImNsaWNrLnNsaWNrXCIsYi5jbGlja0hhbmRsZXIpLGEoZG9jdW1lbnQpLm9mZihiLnZpc2liaWxpdHlDaGFuZ2UsYi52aXNpYmlsaXR5KSxiLmNsZWFuVXBTbGlkZUV2ZW50cygpLGIub3B0aW9ucy5hY2Nlc3NpYmlsaXR5PT09ITAmJmIuJGxpc3Qub2ZmKFwia2V5ZG93bi5zbGlja1wiLGIua2V5SGFuZGxlciksYi5vcHRpb25zLmZvY3VzT25TZWxlY3Q9PT0hMCYmYShiLiRzbGlkZVRyYWNrKS5jaGlsZHJlbigpLm9mZihcImNsaWNrLnNsaWNrXCIsYi5zZWxlY3RIYW5kbGVyKSxhKHdpbmRvdykub2ZmKFwib3JpZW50YXRpb25jaGFuZ2Uuc2xpY2suc2xpY2stXCIrYi5pbnN0YW5jZVVpZCxiLm9yaWVudGF0aW9uQ2hhbmdlKSxhKHdpbmRvdykub2ZmKFwicmVzaXplLnNsaWNrLnNsaWNrLVwiK2IuaW5zdGFuY2VVaWQsYi5yZXNpemUpLGEoXCJbZHJhZ2dhYmxlIT10cnVlXVwiLGIuJHNsaWRlVHJhY2spLm9mZihcImRyYWdzdGFydFwiLGIucHJldmVudERlZmF1bHQpLGEod2luZG93KS5vZmYoXCJsb2FkLnNsaWNrLnNsaWNrLVwiK2IuaW5zdGFuY2VVaWQsYi5zZXRQb3NpdGlvbiksYShkb2N1bWVudCkub2ZmKFwicmVhZHkuc2xpY2suc2xpY2stXCIrYi5pbnN0YW5jZVVpZCxiLnNldFBvc2l0aW9uKX0sYi5wcm90b3R5cGUuY2xlYW5VcFNsaWRlRXZlbnRzPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcztiLiRsaXN0Lm9mZihcIm1vdXNlZW50ZXIuc2xpY2tcIixhLnByb3h5KGIuaW50ZXJydXB0LGIsITApKSxiLiRsaXN0Lm9mZihcIm1vdXNlbGVhdmUuc2xpY2tcIixhLnByb3h5KGIuaW50ZXJydXB0LGIsITEpKX0sYi5wcm90b3R5cGUuY2xlYW5VcFJvd3M9ZnVuY3Rpb24oKXt2YXIgYixhPXRoaXM7YS5vcHRpb25zLnJvd3M+MSYmKGI9YS4kc2xpZGVzLmNoaWxkcmVuKCkuY2hpbGRyZW4oKSxiLnJlbW92ZUF0dHIoXCJzdHlsZVwiKSxhLiRzbGlkZXIuZW1wdHkoKS5hcHBlbmQoYikpfSxiLnByb3RvdHlwZS5jbGlja0hhbmRsZXI9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztiLnNob3VsZENsaWNrPT09ITEmJihhLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpLGEuc3RvcFByb3BhZ2F0aW9uKCksYS5wcmV2ZW50RGVmYXVsdCgpKX0sYi5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbihiKXt2YXIgYz10aGlzO2MuYXV0b1BsYXlDbGVhcigpLGMudG91Y2hPYmplY3Q9e30sYy5jbGVhblVwRXZlbnRzKCksYShcIi5zbGljay1jbG9uZWRcIixjLiRzbGlkZXIpLmRldGFjaCgpLGMuJGRvdHMmJmMuJGRvdHMucmVtb3ZlKCksYy4kcHJldkFycm93JiZjLiRwcmV2QXJyb3cubGVuZ3RoJiYoYy4kcHJldkFycm93LnJlbW92ZUNsYXNzKFwic2xpY2stZGlzYWJsZWQgc2xpY2stYXJyb3cgc2xpY2staGlkZGVuXCIpLnJlbW92ZUF0dHIoXCJhcmlhLWhpZGRlbiBhcmlhLWRpc2FibGVkIHRhYmluZGV4XCIpLmNzcyhcImRpc3BsYXlcIixcIlwiKSxjLmh0bWxFeHByLnRlc3QoYy5vcHRpb25zLnByZXZBcnJvdykmJmMuJHByZXZBcnJvdy5yZW1vdmUoKSksYy4kbmV4dEFycm93JiZjLiRuZXh0QXJyb3cubGVuZ3RoJiYoYy4kbmV4dEFycm93LnJlbW92ZUNsYXNzKFwic2xpY2stZGlzYWJsZWQgc2xpY2stYXJyb3cgc2xpY2staGlkZGVuXCIpLnJlbW92ZUF0dHIoXCJhcmlhLWhpZGRlbiBhcmlhLWRpc2FibGVkIHRhYmluZGV4XCIpLmNzcyhcImRpc3BsYXlcIixcIlwiKSxjLmh0bWxFeHByLnRlc3QoYy5vcHRpb25zLm5leHRBcnJvdykmJmMuJG5leHRBcnJvdy5yZW1vdmUoKSksYy4kc2xpZGVzJiYoYy4kc2xpZGVzLnJlbW92ZUNsYXNzKFwic2xpY2stc2xpZGUgc2xpY2stYWN0aXZlIHNsaWNrLWNlbnRlciBzbGljay12aXNpYmxlIHNsaWNrLWN1cnJlbnRcIikucmVtb3ZlQXR0cihcImFyaWEtaGlkZGVuXCIpLnJlbW92ZUF0dHIoXCJkYXRhLXNsaWNrLWluZGV4XCIpLmVhY2goZnVuY3Rpb24oKXthKHRoaXMpLmF0dHIoXCJzdHlsZVwiLGEodGhpcykuZGF0YShcIm9yaWdpbmFsU3R5bGluZ1wiKSl9KSxjLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZGV0YWNoKCksYy4kc2xpZGVUcmFjay5kZXRhY2goKSxjLiRsaXN0LmRldGFjaCgpLGMuJHNsaWRlci5hcHBlbmQoYy4kc2xpZGVzKSksYy5jbGVhblVwUm93cygpLGMuJHNsaWRlci5yZW1vdmVDbGFzcyhcInNsaWNrLXNsaWRlclwiKSxjLiRzbGlkZXIucmVtb3ZlQ2xhc3MoXCJzbGljay1pbml0aWFsaXplZFwiKSxjLiRzbGlkZXIucmVtb3ZlQ2xhc3MoXCJzbGljay1kb3R0ZWRcIiksYy51bnNsaWNrZWQ9ITAsYnx8Yy4kc2xpZGVyLnRyaWdnZXIoXCJkZXN0cm95XCIsW2NdKX0sYi5wcm90b3R5cGUuZGlzYWJsZVRyYW5zaXRpb249ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcyxjPXt9O2NbYi50cmFuc2l0aW9uVHlwZV09XCJcIixiLm9wdGlvbnMuZmFkZT09PSExP2IuJHNsaWRlVHJhY2suY3NzKGMpOmIuJHNsaWRlcy5lcShhKS5jc3MoYyl9LGIucHJvdG90eXBlLmZhZGVTbGlkZT1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXM7Yy5jc3NUcmFuc2l0aW9ucz09PSExPyhjLiRzbGlkZXMuZXEoYSkuY3NzKHt6SW5kZXg6Yy5vcHRpb25zLnpJbmRleH0pLGMuJHNsaWRlcy5lcShhKS5hbmltYXRlKHtvcGFjaXR5OjF9LGMub3B0aW9ucy5zcGVlZCxjLm9wdGlvbnMuZWFzaW5nLGIpKTooYy5hcHBseVRyYW5zaXRpb24oYSksYy4kc2xpZGVzLmVxKGEpLmNzcyh7b3BhY2l0eToxLHpJbmRleDpjLm9wdGlvbnMuekluZGV4fSksYiYmc2V0VGltZW91dChmdW5jdGlvbigpe2MuZGlzYWJsZVRyYW5zaXRpb24oYSksYi5jYWxsKCl9LGMub3B0aW9ucy5zcGVlZCkpfSxiLnByb3RvdHlwZS5mYWRlU2xpZGVPdXQ9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztiLmNzc1RyYW5zaXRpb25zPT09ITE/Yi4kc2xpZGVzLmVxKGEpLmFuaW1hdGUoe29wYWNpdHk6MCx6SW5kZXg6Yi5vcHRpb25zLnpJbmRleC0yfSxiLm9wdGlvbnMuc3BlZWQsYi5vcHRpb25zLmVhc2luZyk6KGIuYXBwbHlUcmFuc2l0aW9uKGEpLGIuJHNsaWRlcy5lcShhKS5jc3Moe29wYWNpdHk6MCx6SW5kZXg6Yi5vcHRpb25zLnpJbmRleC0yfSkpfSxiLnByb3RvdHlwZS5maWx0ZXJTbGlkZXM9Yi5wcm90b3R5cGUuc2xpY2tGaWx0ZXI9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztudWxsIT09YSYmKGIuJHNsaWRlc0NhY2hlPWIuJHNsaWRlcyxiLnVubG9hZCgpLGIuJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKS5kZXRhY2goKSxiLiRzbGlkZXNDYWNoZS5maWx0ZXIoYSkuYXBwZW5kVG8oYi4kc2xpZGVUcmFjayksYi5yZWluaXQoKSl9LGIucHJvdG90eXBlLmZvY3VzSGFuZGxlcj1mdW5jdGlvbigpe3ZhciBiPXRoaXM7Yi4kc2xpZGVyLm9mZihcImZvY3VzLnNsaWNrIGJsdXIuc2xpY2tcIikub24oXCJmb2N1cy5zbGljayBibHVyLnNsaWNrXCIsXCIqOm5vdCguc2xpY2stYXJyb3cpXCIsZnVuY3Rpb24oYyl7Yy5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTt2YXIgZD1hKHRoaXMpO3NldFRpbWVvdXQoZnVuY3Rpb24oKXtiLm9wdGlvbnMucGF1c2VPbkZvY3VzJiYoYi5mb2N1c3NlZD1kLmlzKFwiOmZvY3VzXCIpLGIuYXV0b1BsYXkoKSl9LDApfSl9LGIucHJvdG90eXBlLmdldEN1cnJlbnQ9Yi5wcm90b3R5cGUuc2xpY2tDdXJyZW50U2xpZGU9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBhLmN1cnJlbnRTbGlkZX0sYi5wcm90b3R5cGUuZ2V0RG90Q291bnQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLGI9MCxjPTAsZD0wO2lmKGEub3B0aW9ucy5pbmZpbml0ZT09PSEwKWZvcig7YjxhLnNsaWRlQ291bnQ7KSsrZCxiPWMrYS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsLGMrPWEub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDw9YS5vcHRpb25zLnNsaWRlc1RvU2hvdz9hLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw6YS5vcHRpb25zLnNsaWRlc1RvU2hvdztlbHNlIGlmKGEub3B0aW9ucy5jZW50ZXJNb2RlPT09ITApZD1hLnNsaWRlQ291bnQ7ZWxzZSBpZihhLm9wdGlvbnMuYXNOYXZGb3IpZm9yKDtiPGEuc2xpZGVDb3VudDspKytkLGI9YythLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwsYys9YS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsPD1hLm9wdGlvbnMuc2xpZGVzVG9TaG93P2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDphLm9wdGlvbnMuc2xpZGVzVG9TaG93O2Vsc2UgZD0xK01hdGguY2VpbCgoYS5zbGlkZUNvdW50LWEub3B0aW9ucy5zbGlkZXNUb1Nob3cpL2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCk7cmV0dXJuIGQtMX0sYi5wcm90b3R5cGUuZ2V0TGVmdD1mdW5jdGlvbihhKXt2YXIgYyxkLGYsYj10aGlzLGU9MDtyZXR1cm4gYi5zbGlkZU9mZnNldD0wLGQ9Yi4kc2xpZGVzLmZpcnN0KCkub3V0ZXJIZWlnaHQoITApLGIub3B0aW9ucy5pbmZpbml0ZT09PSEwPyhiLnNsaWRlQ291bnQ+Yi5vcHRpb25zLnNsaWRlc1RvU2hvdyYmKGIuc2xpZGVPZmZzZXQ9Yi5zbGlkZVdpZHRoKmIub3B0aW9ucy5zbGlkZXNUb1Nob3cqLTEsZT1kKmIub3B0aW9ucy5zbGlkZXNUb1Nob3cqLTEpLGIuc2xpZGVDb3VudCViLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwhPT0wJiZhK2Iub3B0aW9ucy5zbGlkZXNUb1Njcm9sbD5iLnNsaWRlQ291bnQmJmIuc2xpZGVDb3VudD5iLm9wdGlvbnMuc2xpZGVzVG9TaG93JiYoYT5iLnNsaWRlQ291bnQ/KGIuc2xpZGVPZmZzZXQ9KGIub3B0aW9ucy5zbGlkZXNUb1Nob3ctKGEtYi5zbGlkZUNvdW50KSkqYi5zbGlkZVdpZHRoKi0xLGU9KGIub3B0aW9ucy5zbGlkZXNUb1Nob3ctKGEtYi5zbGlkZUNvdW50KSkqZCotMSk6KGIuc2xpZGVPZmZzZXQ9Yi5zbGlkZUNvdW50JWIub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCpiLnNsaWRlV2lkdGgqLTEsZT1iLnNsaWRlQ291bnQlYi5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKmQqLTEpKSk6YStiLm9wdGlvbnMuc2xpZGVzVG9TaG93PmIuc2xpZGVDb3VudCYmKGIuc2xpZGVPZmZzZXQ9KGErYi5vcHRpb25zLnNsaWRlc1RvU2hvdy1iLnNsaWRlQ291bnQpKmIuc2xpZGVXaWR0aCxlPShhK2Iub3B0aW9ucy5zbGlkZXNUb1Nob3ctYi5zbGlkZUNvdW50KSpkKSxiLnNsaWRlQ291bnQ8PWIub3B0aW9ucy5zbGlkZXNUb1Nob3cmJihiLnNsaWRlT2Zmc2V0PTAsZT0wKSxiLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwJiZiLm9wdGlvbnMuaW5maW5pdGU9PT0hMD9iLnNsaWRlT2Zmc2V0Kz1iLnNsaWRlV2lkdGgqTWF0aC5mbG9vcihiLm9wdGlvbnMuc2xpZGVzVG9TaG93LzIpLWIuc2xpZGVXaWR0aDpiLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwJiYoYi5zbGlkZU9mZnNldD0wLGIuc2xpZGVPZmZzZXQrPWIuc2xpZGVXaWR0aCpNYXRoLmZsb29yKGIub3B0aW9ucy5zbGlkZXNUb1Nob3cvMikpLGM9Yi5vcHRpb25zLnZlcnRpY2FsPT09ITE/YSpiLnNsaWRlV2lkdGgqLTErYi5zbGlkZU9mZnNldDphKmQqLTErZSxiLm9wdGlvbnMudmFyaWFibGVXaWR0aD09PSEwJiYoZj1iLnNsaWRlQ291bnQ8PWIub3B0aW9ucy5zbGlkZXNUb1Nob3d8fGIub3B0aW9ucy5pbmZpbml0ZT09PSExP2IuJHNsaWRlVHJhY2suY2hpbGRyZW4oXCIuc2xpY2stc2xpZGVcIikuZXEoYSk6Yi4kc2xpZGVUcmFjay5jaGlsZHJlbihcIi5zbGljay1zbGlkZVwiKS5lcShhK2Iub3B0aW9ucy5zbGlkZXNUb1Nob3cpLGM9Yi5vcHRpb25zLnJ0bD09PSEwP2ZbMF0/LTEqKGIuJHNsaWRlVHJhY2sud2lkdGgoKS1mWzBdLm9mZnNldExlZnQtZi53aWR0aCgpKTowOmZbMF0/LTEqZlswXS5vZmZzZXRMZWZ0OjAsYi5vcHRpb25zLmNlbnRlck1vZGU9PT0hMCYmKGY9Yi5zbGlkZUNvdW50PD1iLm9wdGlvbnMuc2xpZGVzVG9TaG93fHxiLm9wdGlvbnMuaW5maW5pdGU9PT0hMT9iLiRzbGlkZVRyYWNrLmNoaWxkcmVuKFwiLnNsaWNrLXNsaWRlXCIpLmVxKGEpOmIuJHNsaWRlVHJhY2suY2hpbGRyZW4oXCIuc2xpY2stc2xpZGVcIikuZXEoYStiLm9wdGlvbnMuc2xpZGVzVG9TaG93KzEpLGM9Yi5vcHRpb25zLnJ0bD09PSEwP2ZbMF0/LTEqKGIuJHNsaWRlVHJhY2sud2lkdGgoKS1mWzBdLm9mZnNldExlZnQtZi53aWR0aCgpKTowOmZbMF0/LTEqZlswXS5vZmZzZXRMZWZ0OjAsYys9KGIuJGxpc3Qud2lkdGgoKS1mLm91dGVyV2lkdGgoKSkvMikpLGN9LGIucHJvdG90eXBlLmdldE9wdGlvbj1iLnByb3RvdHlwZS5zbGlja0dldE9wdGlvbj1mdW5jdGlvbihhKXt2YXIgYj10aGlzO3JldHVybiBiLm9wdGlvbnNbYV19LGIucHJvdG90eXBlLmdldE5hdmlnYWJsZUluZGV4ZXM9ZnVuY3Rpb24oKXt2YXIgZSxhPXRoaXMsYj0wLGM9MCxkPVtdO2ZvcihhLm9wdGlvbnMuaW5maW5pdGU9PT0hMT9lPWEuc2xpZGVDb3VudDooYj0tMSphLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwsYz0tMSphLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwsZT0yKmEuc2xpZGVDb3VudCk7ZT5iOylkLnB1c2goYiksYj1jK2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCxjKz1hLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw8PWEub3B0aW9ucy5zbGlkZXNUb1Nob3c/YS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsOmEub3B0aW9ucy5zbGlkZXNUb1Nob3c7cmV0dXJuIGR9LGIucHJvdG90eXBlLmdldFNsaWNrPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LGIucHJvdG90eXBlLmdldFNsaWRlQ291bnQ9ZnVuY3Rpb24oKXt2YXIgYyxkLGUsYj10aGlzO3JldHVybiBlPWIub3B0aW9ucy5jZW50ZXJNb2RlPT09ITA/Yi5zbGlkZVdpZHRoKk1hdGguZmxvb3IoYi5vcHRpb25zLnNsaWRlc1RvU2hvdy8yKTowLGIub3B0aW9ucy5zd2lwZVRvU2xpZGU9PT0hMD8oYi4kc2xpZGVUcmFjay5maW5kKFwiLnNsaWNrLXNsaWRlXCIpLmVhY2goZnVuY3Rpb24oYyxmKXtyZXR1cm4gZi5vZmZzZXRMZWZ0LWUrYShmKS5vdXRlcldpZHRoKCkvMj4tMSpiLnN3aXBlTGVmdD8oZD1mLCExKTp2b2lkIDB9KSxjPU1hdGguYWJzKGEoZCkuYXR0cihcImRhdGEtc2xpY2staW5kZXhcIiktYi5jdXJyZW50U2xpZGUpfHwxKTpiLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGx9LGIucHJvdG90eXBlLmdvVG89Yi5wcm90b3R5cGUuc2xpY2tHb1RvPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcztjLmNoYW5nZVNsaWRlKHtkYXRhOnttZXNzYWdlOlwiaW5kZXhcIixpbmRleDpwYXJzZUludChhKX19LGIpfSxiLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKGIpe3ZhciBjPXRoaXM7YShjLiRzbGlkZXIpLmhhc0NsYXNzKFwic2xpY2staW5pdGlhbGl6ZWRcIil8fChhKGMuJHNsaWRlcikuYWRkQ2xhc3MoXCJzbGljay1pbml0aWFsaXplZFwiKSxjLmJ1aWxkUm93cygpLGMuYnVpbGRPdXQoKSxjLnNldFByb3BzKCksYy5zdGFydExvYWQoKSxjLmxvYWRTbGlkZXIoKSxjLmluaXRpYWxpemVFdmVudHMoKSxjLnVwZGF0ZUFycm93cygpLGMudXBkYXRlRG90cygpLGMuY2hlY2tSZXNwb25zaXZlKCEwKSxjLmZvY3VzSGFuZGxlcigpKSxiJiZjLiRzbGlkZXIudHJpZ2dlcihcImluaXRcIixbY10pLGMub3B0aW9ucy5hY2Nlc3NpYmlsaXR5PT09ITAmJmMuaW5pdEFEQSgpLGMub3B0aW9ucy5hdXRvcGxheSYmKGMucGF1c2VkPSExLGMuYXV0b1BsYXkoKSl9LGIucHJvdG90eXBlLmluaXRBREE9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2IuJHNsaWRlcy5hZGQoYi4kc2xpZGVUcmFjay5maW5kKFwiLnNsaWNrLWNsb25lZFwiKSkuYXR0cih7XCJhcmlhLWhpZGRlblwiOlwidHJ1ZVwiLHRhYmluZGV4OlwiLTFcIn0pLmZpbmQoXCJhLCBpbnB1dCwgYnV0dG9uLCBzZWxlY3RcIikuYXR0cih7dGFiaW5kZXg6XCItMVwifSksYi4kc2xpZGVUcmFjay5hdHRyKFwicm9sZVwiLFwibGlzdGJveFwiKSxiLiRzbGlkZXMubm90KGIuJHNsaWRlVHJhY2suZmluZChcIi5zbGljay1jbG9uZWRcIikpLmVhY2goZnVuY3Rpb24oYyl7YSh0aGlzKS5hdHRyKHtyb2xlOlwib3B0aW9uXCIsXCJhcmlhLWRlc2NyaWJlZGJ5XCI6XCJzbGljay1zbGlkZVwiK2IuaW5zdGFuY2VVaWQrY30pfSksbnVsbCE9PWIuJGRvdHMmJmIuJGRvdHMuYXR0cihcInJvbGVcIixcInRhYmxpc3RcIikuZmluZChcImxpXCIpLmVhY2goZnVuY3Rpb24oYyl7YSh0aGlzKS5hdHRyKHtyb2xlOlwicHJlc2VudGF0aW9uXCIsXCJhcmlhLXNlbGVjdGVkXCI6XCJmYWxzZVwiLFwiYXJpYS1jb250cm9sc1wiOlwibmF2aWdhdGlvblwiK2IuaW5zdGFuY2VVaWQrYyxpZDpcInNsaWNrLXNsaWRlXCIrYi5pbnN0YW5jZVVpZCtjfSl9KS5maXJzdCgpLmF0dHIoXCJhcmlhLXNlbGVjdGVkXCIsXCJ0cnVlXCIpLmVuZCgpLmZpbmQoXCJidXR0b25cIikuYXR0cihcInJvbGVcIixcImJ1dHRvblwiKS5lbmQoKS5jbG9zZXN0KFwiZGl2XCIpLmF0dHIoXCJyb2xlXCIsXCJ0b29sYmFyXCIpLGIuYWN0aXZhdGVBREEoKX0sYi5wcm90b3R5cGUuaW5pdEFycm93RXZlbnRzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLm9wdGlvbnMuYXJyb3dzPT09ITAmJmEuc2xpZGVDb3VudD5hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiYoYS4kcHJldkFycm93Lm9mZihcImNsaWNrLnNsaWNrXCIpLm9uKFwiY2xpY2suc2xpY2tcIix7bWVzc2FnZTpcInByZXZpb3VzXCJ9LGEuY2hhbmdlU2xpZGUpLGEuJG5leHRBcnJvdy5vZmYoXCJjbGljay5zbGlja1wiKS5vbihcImNsaWNrLnNsaWNrXCIse21lc3NhZ2U6XCJuZXh0XCJ9LGEuY2hhbmdlU2xpZGUpKX0sYi5wcm90b3R5cGUuaW5pdERvdEV2ZW50cz1mdW5jdGlvbigpe3ZhciBiPXRoaXM7Yi5vcHRpb25zLmRvdHM9PT0hMCYmYi5zbGlkZUNvdW50PmIub3B0aW9ucy5zbGlkZXNUb1Nob3cmJmEoXCJsaVwiLGIuJGRvdHMpLm9uKFwiY2xpY2suc2xpY2tcIix7bWVzc2FnZTpcImluZGV4XCJ9LGIuY2hhbmdlU2xpZGUpLGIub3B0aW9ucy5kb3RzPT09ITAmJmIub3B0aW9ucy5wYXVzZU9uRG90c0hvdmVyPT09ITAmJmEoXCJsaVwiLGIuJGRvdHMpLm9uKFwibW91c2VlbnRlci5zbGlja1wiLGEucHJveHkoYi5pbnRlcnJ1cHQsYiwhMCkpLm9uKFwibW91c2VsZWF2ZS5zbGlja1wiLGEucHJveHkoYi5pbnRlcnJ1cHQsYiwhMSkpfSxiLnByb3RvdHlwZS5pbml0U2xpZGVFdmVudHM9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2Iub3B0aW9ucy5wYXVzZU9uSG92ZXImJihiLiRsaXN0Lm9uKFwibW91c2VlbnRlci5zbGlja1wiLGEucHJveHkoYi5pbnRlcnJ1cHQsYiwhMCkpLGIuJGxpc3Qub24oXCJtb3VzZWxlYXZlLnNsaWNrXCIsYS5wcm94eShiLmludGVycnVwdCxiLCExKSkpfSxiLnByb3RvdHlwZS5pbml0aWFsaXplRXZlbnRzPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcztiLmluaXRBcnJvd0V2ZW50cygpLGIuaW5pdERvdEV2ZW50cygpLGIuaW5pdFNsaWRlRXZlbnRzKCksYi4kbGlzdC5vbihcInRvdWNoc3RhcnQuc2xpY2sgbW91c2Vkb3duLnNsaWNrXCIse2FjdGlvbjpcInN0YXJ0XCJ9LGIuc3dpcGVIYW5kbGVyKSxiLiRsaXN0Lm9uKFwidG91Y2htb3ZlLnNsaWNrIG1vdXNlbW92ZS5zbGlja1wiLHthY3Rpb246XCJtb3ZlXCJ9LGIuc3dpcGVIYW5kbGVyKSxiLiRsaXN0Lm9uKFwidG91Y2hlbmQuc2xpY2sgbW91c2V1cC5zbGlja1wiLHthY3Rpb246XCJlbmRcIn0sYi5zd2lwZUhhbmRsZXIpLGIuJGxpc3Qub24oXCJ0b3VjaGNhbmNlbC5zbGljayBtb3VzZWxlYXZlLnNsaWNrXCIse2FjdGlvbjpcImVuZFwifSxiLnN3aXBlSGFuZGxlciksYi4kbGlzdC5vbihcImNsaWNrLnNsaWNrXCIsYi5jbGlja0hhbmRsZXIpLGEoZG9jdW1lbnQpLm9uKGIudmlzaWJpbGl0eUNoYW5nZSxhLnByb3h5KGIudmlzaWJpbGl0eSxiKSksYi5vcHRpb25zLmFjY2Vzc2liaWxpdHk9PT0hMCYmYi4kbGlzdC5vbihcImtleWRvd24uc2xpY2tcIixiLmtleUhhbmRsZXIpLGIub3B0aW9ucy5mb2N1c09uU2VsZWN0PT09ITAmJmEoYi4kc2xpZGVUcmFjaykuY2hpbGRyZW4oKS5vbihcImNsaWNrLnNsaWNrXCIsYi5zZWxlY3RIYW5kbGVyKSxhKHdpbmRvdykub24oXCJvcmllbnRhdGlvbmNoYW5nZS5zbGljay5zbGljay1cIitiLmluc3RhbmNlVWlkLGEucHJveHkoYi5vcmllbnRhdGlvbkNoYW5nZSxiKSksYSh3aW5kb3cpLm9uKFwicmVzaXplLnNsaWNrLnNsaWNrLVwiK2IuaW5zdGFuY2VVaWQsYS5wcm94eShiLnJlc2l6ZSxiKSksYShcIltkcmFnZ2FibGUhPXRydWVdXCIsYi4kc2xpZGVUcmFjaykub24oXCJkcmFnc3RhcnRcIixiLnByZXZlbnREZWZhdWx0KSxhKHdpbmRvdykub24oXCJsb2FkLnNsaWNrLnNsaWNrLVwiK2IuaW5zdGFuY2VVaWQsYi5zZXRQb3NpdGlvbiksYShkb2N1bWVudCkub24oXCJyZWFkeS5zbGljay5zbGljay1cIitiLmluc3RhbmNlVWlkLGIuc2V0UG9zaXRpb24pfSxiLnByb3RvdHlwZS5pbml0VUk9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Eub3B0aW9ucy5hcnJvd3M9PT0hMCYmYS5zbGlkZUNvdW50PmEub3B0aW9ucy5zbGlkZXNUb1Nob3cmJihhLiRwcmV2QXJyb3cuc2hvdygpLGEuJG5leHRBcnJvdy5zaG93KCkpLGEub3B0aW9ucy5kb3RzPT09ITAmJmEuc2xpZGVDb3VudD5hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiZhLiRkb3RzLnNob3coKX0sYi5wcm90b3R5cGUua2V5SGFuZGxlcj1mdW5jdGlvbihhKXt2YXIgYj10aGlzO2EudGFyZ2V0LnRhZ05hbWUubWF0Y2goXCJURVhUQVJFQXxJTlBVVHxTRUxFQ1RcIil8fCgzNz09PWEua2V5Q29kZSYmYi5vcHRpb25zLmFjY2Vzc2liaWxpdHk9PT0hMD9iLmNoYW5nZVNsaWRlKHtkYXRhOnttZXNzYWdlOmIub3B0aW9ucy5ydGw9PT0hMD9cIm5leHRcIjpcInByZXZpb3VzXCJ9fSk6Mzk9PT1hLmtleUNvZGUmJmIub3B0aW9ucy5hY2Nlc3NpYmlsaXR5PT09ITAmJmIuY2hhbmdlU2xpZGUoe2RhdGE6e21lc3NhZ2U6Yi5vcHRpb25zLnJ0bD09PSEwP1wicHJldmlvdXNcIjpcIm5leHRcIn19KSl9LGIucHJvdG90eXBlLmxhenlMb2FkPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gZyhjKXthKFwiaW1nW2RhdGEtbGF6eV1cIixjKS5lYWNoKGZ1bmN0aW9uKCl7dmFyIGM9YSh0aGlzKSxkPWEodGhpcykuYXR0cihcImRhdGEtbGF6eVwiKSxlPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7ZS5vbmxvYWQ9ZnVuY3Rpb24oKXtjLmFuaW1hdGUoe29wYWNpdHk6MH0sMTAwLGZ1bmN0aW9uKCl7Yy5hdHRyKFwic3JjXCIsZCkuYW5pbWF0ZSh7b3BhY2l0eToxfSwyMDAsZnVuY3Rpb24oKXtjLnJlbW92ZUF0dHIoXCJkYXRhLWxhenlcIikucmVtb3ZlQ2xhc3MoXCJzbGljay1sb2FkaW5nXCIpfSksYi4kc2xpZGVyLnRyaWdnZXIoXCJsYXp5TG9hZGVkXCIsW2IsYyxkXSl9KX0sZS5vbmVycm9yPWZ1bmN0aW9uKCl7Yy5yZW1vdmVBdHRyKFwiZGF0YS1sYXp5XCIpLnJlbW92ZUNsYXNzKFwic2xpY2stbG9hZGluZ1wiKS5hZGRDbGFzcyhcInNsaWNrLWxhenlsb2FkLWVycm9yXCIpLGIuJHNsaWRlci50cmlnZ2VyKFwibGF6eUxvYWRFcnJvclwiLFtiLGMsZF0pfSxlLnNyYz1kfSl9dmFyIGMsZCxlLGYsYj10aGlzO2Iub3B0aW9ucy5jZW50ZXJNb2RlPT09ITA/Yi5vcHRpb25zLmluZmluaXRlPT09ITA/KGU9Yi5jdXJyZW50U2xpZGUrKGIub3B0aW9ucy5zbGlkZXNUb1Nob3cvMisxKSxmPWUrYi5vcHRpb25zLnNsaWRlc1RvU2hvdysyKTooZT1NYXRoLm1heCgwLGIuY3VycmVudFNsaWRlLShiLm9wdGlvbnMuc2xpZGVzVG9TaG93LzIrMSkpLGY9MisoYi5vcHRpb25zLnNsaWRlc1RvU2hvdy8yKzEpK2IuY3VycmVudFNsaWRlKTooZT1iLm9wdGlvbnMuaW5maW5pdGU/Yi5vcHRpb25zLnNsaWRlc1RvU2hvdytiLmN1cnJlbnRTbGlkZTpiLmN1cnJlbnRTbGlkZSxmPU1hdGguY2VpbChlK2Iub3B0aW9ucy5zbGlkZXNUb1Nob3cpLGIub3B0aW9ucy5mYWRlPT09ITAmJihlPjAmJmUtLSxmPD1iLnNsaWRlQ291bnQmJmYrKykpLGM9Yi4kc2xpZGVyLmZpbmQoXCIuc2xpY2stc2xpZGVcIikuc2xpY2UoZSxmKSxnKGMpLGIuc2xpZGVDb3VudDw9Yi5vcHRpb25zLnNsaWRlc1RvU2hvdz8oZD1iLiRzbGlkZXIuZmluZChcIi5zbGljay1zbGlkZVwiKSxnKGQpKTpiLmN1cnJlbnRTbGlkZT49Yi5zbGlkZUNvdW50LWIub3B0aW9ucy5zbGlkZXNUb1Nob3c/KGQ9Yi4kc2xpZGVyLmZpbmQoXCIuc2xpY2stY2xvbmVkXCIpLnNsaWNlKDAsYi5vcHRpb25zLnNsaWRlc1RvU2hvdyksZyhkKSk6MD09PWIuY3VycmVudFNsaWRlJiYoZD1iLiRzbGlkZXIuZmluZChcIi5zbGljay1jbG9uZWRcIikuc2xpY2UoLTEqYi5vcHRpb25zLnNsaWRlc1RvU2hvdyksZyhkKSl9LGIucHJvdG90eXBlLmxvYWRTbGlkZXI9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Euc2V0UG9zaXRpb24oKSxhLiRzbGlkZVRyYWNrLmNzcyh7b3BhY2l0eToxfSksYS4kc2xpZGVyLnJlbW92ZUNsYXNzKFwic2xpY2stbG9hZGluZ1wiKSxhLmluaXRVSSgpLFwicHJvZ3Jlc3NpdmVcIj09PWEub3B0aW9ucy5sYXp5TG9hZCYmYS5wcm9ncmVzc2l2ZUxhenlMb2FkKCl9LGIucHJvdG90eXBlLm5leHQ9Yi5wcm90b3R5cGUuc2xpY2tOZXh0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLmNoYW5nZVNsaWRlKHtkYXRhOnttZXNzYWdlOlwibmV4dFwifX0pfSxiLnByb3RvdHlwZS5vcmllbnRhdGlvbkNoYW5nZT1mdW5jdGlvbigpe3ZhciBhPXRoaXM7YS5jaGVja1Jlc3BvbnNpdmUoKSxhLnNldFBvc2l0aW9uKCl9LGIucHJvdG90eXBlLnBhdXNlPWIucHJvdG90eXBlLnNsaWNrUGF1c2U9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2EuYXV0b1BsYXlDbGVhcigpLGEucGF1c2VkPSEwfSxiLnByb3RvdHlwZS5wbGF5PWIucHJvdG90eXBlLnNsaWNrUGxheT1mdW5jdGlvbigpe3ZhciBhPXRoaXM7YS5hdXRvUGxheSgpLGEub3B0aW9ucy5hdXRvcGxheT0hMCxhLnBhdXNlZD0hMSxhLmZvY3Vzc2VkPSExLGEuaW50ZXJydXB0ZWQ9ITF9LGIucHJvdG90eXBlLnBvc3RTbGlkZT1mdW5jdGlvbihhKXt2YXIgYj10aGlzO2IudW5zbGlja2VkfHwoYi4kc2xpZGVyLnRyaWdnZXIoXCJhZnRlckNoYW5nZVwiLFtiLGFdKSxiLmFuaW1hdGluZz0hMSxiLnNldFBvc2l0aW9uKCksYi5zd2lwZUxlZnQ9bnVsbCxiLm9wdGlvbnMuYXV0b3BsYXkmJmIuYXV0b1BsYXkoKSxiLm9wdGlvbnMuYWNjZXNzaWJpbGl0eT09PSEwJiZiLmluaXRBREEoKSl9LGIucHJvdG90eXBlLnByZXY9Yi5wcm90b3R5cGUuc2xpY2tQcmV2PWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLmNoYW5nZVNsaWRlKHtkYXRhOnttZXNzYWdlOlwicHJldmlvdXNcIn19KX0sYi5wcm90b3R5cGUucHJldmVudERlZmF1bHQ9ZnVuY3Rpb24oYSl7YS5wcmV2ZW50RGVmYXVsdCgpfSxiLnByb3RvdHlwZS5wcm9ncmVzc2l2ZUxhenlMb2FkPWZ1bmN0aW9uKGIpe2I9Ynx8MTt2YXIgZSxmLGcsYz10aGlzLGQ9YShcImltZ1tkYXRhLWxhenldXCIsYy4kc2xpZGVyKTtkLmxlbmd0aD8oZT1kLmZpcnN0KCksZj1lLmF0dHIoXCJkYXRhLWxhenlcIiksZz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpLGcub25sb2FkPWZ1bmN0aW9uKCl7ZS5hdHRyKFwic3JjXCIsZikucmVtb3ZlQXR0cihcImRhdGEtbGF6eVwiKS5yZW1vdmVDbGFzcyhcInNsaWNrLWxvYWRpbmdcIiksYy5vcHRpb25zLmFkYXB0aXZlSGVpZ2h0PT09ITAmJmMuc2V0UG9zaXRpb24oKSxjLiRzbGlkZXIudHJpZ2dlcihcImxhenlMb2FkZWRcIixbYyxlLGZdKSxjLnByb2dyZXNzaXZlTGF6eUxvYWQoKX0sZy5vbmVycm9yPWZ1bmN0aW9uKCl7Mz5iP3NldFRpbWVvdXQoZnVuY3Rpb24oKXtjLnByb2dyZXNzaXZlTGF6eUxvYWQoYisxKX0sNTAwKTooZS5yZW1vdmVBdHRyKFwiZGF0YS1sYXp5XCIpLnJlbW92ZUNsYXNzKFwic2xpY2stbG9hZGluZ1wiKS5hZGRDbGFzcyhcInNsaWNrLWxhenlsb2FkLWVycm9yXCIpLGMuJHNsaWRlci50cmlnZ2VyKFwibGF6eUxvYWRFcnJvclwiLFtjLGUsZl0pLGMucHJvZ3Jlc3NpdmVMYXp5TG9hZCgpKX0sZy5zcmM9Zik6Yy4kc2xpZGVyLnRyaWdnZXIoXCJhbGxJbWFnZXNMb2FkZWRcIixbY10pfSxiLnByb3RvdHlwZS5yZWZyZXNoPWZ1bmN0aW9uKGIpe3ZhciBkLGUsYz10aGlzO2U9Yy5zbGlkZUNvdW50LWMub3B0aW9ucy5zbGlkZXNUb1Nob3csIWMub3B0aW9ucy5pbmZpbml0ZSYmYy5jdXJyZW50U2xpZGU+ZSYmKGMuY3VycmVudFNsaWRlPWUpLGMuc2xpZGVDb3VudDw9Yy5vcHRpb25zLnNsaWRlc1RvU2hvdyYmKGMuY3VycmVudFNsaWRlPTApLGQ9Yy5jdXJyZW50U2xpZGUsYy5kZXN0cm95KCEwKSxhLmV4dGVuZChjLGMuaW5pdGlhbHMse2N1cnJlbnRTbGlkZTpkfSksYy5pbml0KCksYnx8Yy5jaGFuZ2VTbGlkZSh7ZGF0YTp7bWVzc2FnZTpcImluZGV4XCIsaW5kZXg6ZH19LCExKX0sYi5wcm90b3R5cGUucmVnaXN0ZXJCcmVha3BvaW50cz1mdW5jdGlvbigpe3ZhciBjLGQsZSxiPXRoaXMsZj1iLm9wdGlvbnMucmVzcG9uc2l2ZXx8bnVsbDtpZihcImFycmF5XCI9PT1hLnR5cGUoZikmJmYubGVuZ3RoKXtiLnJlc3BvbmRUbz1iLm9wdGlvbnMucmVzcG9uZFRvfHxcIndpbmRvd1wiO2ZvcihjIGluIGYpaWYoZT1iLmJyZWFrcG9pbnRzLmxlbmd0aC0xLGQ9ZltjXS5icmVha3BvaW50LGYuaGFzT3duUHJvcGVydHkoYykpe2Zvcig7ZT49MDspYi5icmVha3BvaW50c1tlXSYmYi5icmVha3BvaW50c1tlXT09PWQmJmIuYnJlYWtwb2ludHMuc3BsaWNlKGUsMSksZS0tO2IuYnJlYWtwb2ludHMucHVzaChkKSxiLmJyZWFrcG9pbnRTZXR0aW5nc1tkXT1mW2NdLnNldHRpbmdzfWIuYnJlYWtwb2ludHMuc29ydChmdW5jdGlvbihhLGMpe3JldHVybiBiLm9wdGlvbnMubW9iaWxlRmlyc3Q/YS1jOmMtYX0pfX0sYi5wcm90b3R5cGUucmVpbml0PWZ1bmN0aW9uKCl7dmFyIGI9dGhpcztiLiRzbGlkZXM9Yi4kc2xpZGVUcmFjay5jaGlsZHJlbihiLm9wdGlvbnMuc2xpZGUpLmFkZENsYXNzKFwic2xpY2stc2xpZGVcIiksYi5zbGlkZUNvdW50PWIuJHNsaWRlcy5sZW5ndGgsYi5jdXJyZW50U2xpZGU+PWIuc2xpZGVDb3VudCYmMCE9PWIuY3VycmVudFNsaWRlJiYoYi5jdXJyZW50U2xpZGU9Yi5jdXJyZW50U2xpZGUtYi5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKSxiLnNsaWRlQ291bnQ8PWIub3B0aW9ucy5zbGlkZXNUb1Nob3cmJihiLmN1cnJlbnRTbGlkZT0wKSxiLnJlZ2lzdGVyQnJlYWtwb2ludHMoKSxiLnNldFByb3BzKCksYi5zZXR1cEluZmluaXRlKCksYi5idWlsZEFycm93cygpLGIudXBkYXRlQXJyb3dzKCksYi5pbml0QXJyb3dFdmVudHMoKSxiLmJ1aWxkRG90cygpLGIudXBkYXRlRG90cygpLGIuaW5pdERvdEV2ZW50cygpLGIuY2xlYW5VcFNsaWRlRXZlbnRzKCksYi5pbml0U2xpZGVFdmVudHMoKSxiLmNoZWNrUmVzcG9uc2l2ZSghMSwhMCksYi5vcHRpb25zLmZvY3VzT25TZWxlY3Q9PT0hMCYmYShiLiRzbGlkZVRyYWNrKS5jaGlsZHJlbigpLm9uKFwiY2xpY2suc2xpY2tcIixiLnNlbGVjdEhhbmRsZXIpLGIuc2V0U2xpZGVDbGFzc2VzKFwibnVtYmVyXCI9PXR5cGVvZiBiLmN1cnJlbnRTbGlkZT9iLmN1cnJlbnRTbGlkZTowKSxiLnNldFBvc2l0aW9uKCksYi5mb2N1c0hhbmRsZXIoKSxiLnBhdXNlZD0hYi5vcHRpb25zLmF1dG9wbGF5LGIuYXV0b1BsYXkoKSxiLiRzbGlkZXIudHJpZ2dlcihcInJlSW5pdFwiLFtiXSl9LGIucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbigpe3ZhciBiPXRoaXM7YSh3aW5kb3cpLndpZHRoKCkhPT1iLndpbmRvd1dpZHRoJiYoY2xlYXJUaW1lb3V0KGIud2luZG93RGVsYXkpLGIud2luZG93RGVsYXk9d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKXtiLndpbmRvd1dpZHRoPWEod2luZG93KS53aWR0aCgpLGIuY2hlY2tSZXNwb25zaXZlKCksYi51bnNsaWNrZWR8fGIuc2V0UG9zaXRpb24oKX0sNTApKX0sYi5wcm90b3R5cGUucmVtb3ZlU2xpZGU9Yi5wcm90b3R5cGUuc2xpY2tSZW1vdmU9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXM7cmV0dXJuXCJib29sZWFuXCI9PXR5cGVvZiBhPyhiPWEsYT1iPT09ITA/MDpkLnNsaWRlQ291bnQtMSk6YT1iPT09ITA/LS1hOmEsZC5zbGlkZUNvdW50PDF8fDA+YXx8YT5kLnNsaWRlQ291bnQtMT8hMTooZC51bmxvYWQoKSxjPT09ITA/ZC4kc2xpZGVUcmFjay5jaGlsZHJlbigpLnJlbW92ZSgpOmQuJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKS5lcShhKS5yZW1vdmUoKSxkLiRzbGlkZXM9ZC4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpLGQuJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKS5kZXRhY2goKSxkLiRzbGlkZVRyYWNrLmFwcGVuZChkLiRzbGlkZXMpLGQuJHNsaWRlc0NhY2hlPWQuJHNsaWRlcyx2b2lkIGQucmVpbml0KCkpfSxiLnByb3RvdHlwZS5zZXRDU1M9ZnVuY3Rpb24oYSl7dmFyIGQsZSxiPXRoaXMsYz17fTtiLm9wdGlvbnMucnRsPT09ITAmJihhPS1hKSxkPVwibGVmdFwiPT1iLnBvc2l0aW9uUHJvcD9NYXRoLmNlaWwoYSkrXCJweFwiOlwiMHB4XCIsZT1cInRvcFwiPT1iLnBvc2l0aW9uUHJvcD9NYXRoLmNlaWwoYSkrXCJweFwiOlwiMHB4XCIsY1tiLnBvc2l0aW9uUHJvcF09YSxiLnRyYW5zZm9ybXNFbmFibGVkPT09ITE/Yi4kc2xpZGVUcmFjay5jc3MoYyk6KGM9e30sYi5jc3NUcmFuc2l0aW9ucz09PSExPyhjW2IuYW5pbVR5cGVdPVwidHJhbnNsYXRlKFwiK2QrXCIsIFwiK2UrXCIpXCIsYi4kc2xpZGVUcmFjay5jc3MoYykpOihjW2IuYW5pbVR5cGVdPVwidHJhbnNsYXRlM2QoXCIrZCtcIiwgXCIrZStcIiwgMHB4KVwiLGIuJHNsaWRlVHJhY2suY3NzKGMpKSl9LGIucHJvdG90eXBlLnNldERpbWVuc2lvbnM9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Eub3B0aW9ucy52ZXJ0aWNhbD09PSExP2Eub3B0aW9ucy5jZW50ZXJNb2RlPT09ITAmJmEuJGxpc3QuY3NzKHtwYWRkaW5nOlwiMHB4IFwiK2Eub3B0aW9ucy5jZW50ZXJQYWRkaW5nfSk6KGEuJGxpc3QuaGVpZ2h0KGEuJHNsaWRlcy5maXJzdCgpLm91dGVySGVpZ2h0KCEwKSphLm9wdGlvbnMuc2xpZGVzVG9TaG93KSxhLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwJiZhLiRsaXN0LmNzcyh7cGFkZGluZzphLm9wdGlvbnMuY2VudGVyUGFkZGluZytcIiAwcHhcIn0pKSxhLmxpc3RXaWR0aD1hLiRsaXN0LndpZHRoKCksYS5saXN0SGVpZ2h0PWEuJGxpc3QuaGVpZ2h0KCksYS5vcHRpb25zLnZlcnRpY2FsPT09ITEmJmEub3B0aW9ucy52YXJpYWJsZVdpZHRoPT09ITE/KGEuc2xpZGVXaWR0aD1NYXRoLmNlaWwoYS5saXN0V2lkdGgvYS5vcHRpb25zLnNsaWRlc1RvU2hvdyksYS4kc2xpZGVUcmFjay53aWR0aChNYXRoLmNlaWwoYS5zbGlkZVdpZHRoKmEuJHNsaWRlVHJhY2suY2hpbGRyZW4oXCIuc2xpY2stc2xpZGVcIikubGVuZ3RoKSkpOmEub3B0aW9ucy52YXJpYWJsZVdpZHRoPT09ITA/YS4kc2xpZGVUcmFjay53aWR0aCg1ZTMqYS5zbGlkZUNvdW50KTooYS5zbGlkZVdpZHRoPU1hdGguY2VpbChhLmxpc3RXaWR0aCksYS4kc2xpZGVUcmFjay5oZWlnaHQoTWF0aC5jZWlsKGEuJHNsaWRlcy5maXJzdCgpLm91dGVySGVpZ2h0KCEwKSphLiRzbGlkZVRyYWNrLmNoaWxkcmVuKFwiLnNsaWNrLXNsaWRlXCIpLmxlbmd0aCkpKTt2YXIgYj1hLiRzbGlkZXMuZmlyc3QoKS5vdXRlcldpZHRoKCEwKS1hLiRzbGlkZXMuZmlyc3QoKS53aWR0aCgpO2Eub3B0aW9ucy52YXJpYWJsZVdpZHRoPT09ITEmJmEuJHNsaWRlVHJhY2suY2hpbGRyZW4oXCIuc2xpY2stc2xpZGVcIikud2lkdGgoYS5zbGlkZVdpZHRoLWIpfSxiLnByb3RvdHlwZS5zZXRGYWRlPWZ1bmN0aW9uKCl7dmFyIGMsYj10aGlzO2IuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKGQsZSl7Yz1iLnNsaWRlV2lkdGgqZCotMSxiLm9wdGlvbnMucnRsPT09ITA/YShlKS5jc3Moe3Bvc2l0aW9uOlwicmVsYXRpdmVcIixyaWdodDpjLHRvcDowLHpJbmRleDpiLm9wdGlvbnMuekluZGV4LTIsb3BhY2l0eTowfSk6YShlKS5jc3Moe3Bvc2l0aW9uOlwicmVsYXRpdmVcIixsZWZ0OmMsdG9wOjAsekluZGV4OmIub3B0aW9ucy56SW5kZXgtMixvcGFjaXR5OjB9KX0pLGIuJHNsaWRlcy5lcShiLmN1cnJlbnRTbGlkZSkuY3NzKHt6SW5kZXg6Yi5vcHRpb25zLnpJbmRleC0xLG9wYWNpdHk6MX0pfSxiLnByb3RvdHlwZS5zZXRIZWlnaHQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2lmKDE9PT1hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiZhLm9wdGlvbnMuYWRhcHRpdmVIZWlnaHQ9PT0hMCYmYS5vcHRpb25zLnZlcnRpY2FsPT09ITEpe3ZhciBiPWEuJHNsaWRlcy5lcShhLmN1cnJlbnRTbGlkZSkub3V0ZXJIZWlnaHQoITApO2EuJGxpc3QuY3NzKFwiaGVpZ2h0XCIsYil9fSxiLnByb3RvdHlwZS5zZXRPcHRpb249Yi5wcm90b3R5cGUuc2xpY2tTZXRPcHRpb249ZnVuY3Rpb24oKXt2YXIgYyxkLGUsZixoLGI9dGhpcyxnPSExO2lmKFwib2JqZWN0XCI9PT1hLnR5cGUoYXJndW1lbnRzWzBdKT8oZT1hcmd1bWVudHNbMF0sZz1hcmd1bWVudHNbMV0saD1cIm11bHRpcGxlXCIpOlwic3RyaW5nXCI9PT1hLnR5cGUoYXJndW1lbnRzWzBdKSYmKGU9YXJndW1lbnRzWzBdLGY9YXJndW1lbnRzWzFdLGc9YXJndW1lbnRzWzJdLFwicmVzcG9uc2l2ZVwiPT09YXJndW1lbnRzWzBdJiZcImFycmF5XCI9PT1hLnR5cGUoYXJndW1lbnRzWzFdKT9oPVwicmVzcG9uc2l2ZVwiOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBhcmd1bWVudHNbMV0mJihoPVwic2luZ2xlXCIpKSxcInNpbmdsZVwiPT09aCliLm9wdGlvbnNbZV09ZjtlbHNlIGlmKFwibXVsdGlwbGVcIj09PWgpYS5lYWNoKGUsZnVuY3Rpb24oYSxjKXtiLm9wdGlvbnNbYV09Y30pO2Vsc2UgaWYoXCJyZXNwb25zaXZlXCI9PT1oKWZvcihkIGluIGYpaWYoXCJhcnJheVwiIT09YS50eXBlKGIub3B0aW9ucy5yZXNwb25zaXZlKSliLm9wdGlvbnMucmVzcG9uc2l2ZT1bZltkXV07ZWxzZXtmb3IoYz1iLm9wdGlvbnMucmVzcG9uc2l2ZS5sZW5ndGgtMTtjPj0wOyliLm9wdGlvbnMucmVzcG9uc2l2ZVtjXS5icmVha3BvaW50PT09ZltkXS5icmVha3BvaW50JiZiLm9wdGlvbnMucmVzcG9uc2l2ZS5zcGxpY2UoYywxKSxjLS07Yi5vcHRpb25zLnJlc3BvbnNpdmUucHVzaChmW2RdKX1nJiYoYi51bmxvYWQoKSxiLnJlaW5pdCgpKX0sYi5wcm90b3R5cGUuc2V0UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Euc2V0RGltZW5zaW9ucygpLGEuc2V0SGVpZ2h0KCksYS5vcHRpb25zLmZhZGU9PT0hMT9hLnNldENTUyhhLmdldExlZnQoYS5jdXJyZW50U2xpZGUpKTphLnNldEZhZGUoKSxhLiRzbGlkZXIudHJpZ2dlcihcInNldFBvc2l0aW9uXCIsW2FdKX0sYi5wcm90b3R5cGUuc2V0UHJvcHM9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLGI9ZG9jdW1lbnQuYm9keS5zdHlsZTthLnBvc2l0aW9uUHJvcD1hLm9wdGlvbnMudmVydGljYWw9PT0hMD9cInRvcFwiOlwibGVmdFwiLFwidG9wXCI9PT1hLnBvc2l0aW9uUHJvcD9hLiRzbGlkZXIuYWRkQ2xhc3MoXCJzbGljay12ZXJ0aWNhbFwiKTphLiRzbGlkZXIucmVtb3ZlQ2xhc3MoXCJzbGljay12ZXJ0aWNhbFwiKSwodm9pZCAwIT09Yi5XZWJraXRUcmFuc2l0aW9ufHx2b2lkIDAhPT1iLk1velRyYW5zaXRpb258fHZvaWQgMCE9PWIubXNUcmFuc2l0aW9uKSYmYS5vcHRpb25zLnVzZUNTUz09PSEwJiYoYS5jc3NUcmFuc2l0aW9ucz0hMCksYS5vcHRpb25zLmZhZGUmJihcIm51bWJlclwiPT10eXBlb2YgYS5vcHRpb25zLnpJbmRleD9hLm9wdGlvbnMuekluZGV4PDMmJihhLm9wdGlvbnMuekluZGV4PTMpOmEub3B0aW9ucy56SW5kZXg9YS5kZWZhdWx0cy56SW5kZXgpLHZvaWQgMCE9PWIuT1RyYW5zZm9ybSYmKGEuYW5pbVR5cGU9XCJPVHJhbnNmb3JtXCIsYS50cmFuc2Zvcm1UeXBlPVwiLW8tdHJhbnNmb3JtXCIsYS50cmFuc2l0aW9uVHlwZT1cIk9UcmFuc2l0aW9uXCIsdm9pZCAwPT09Yi5wZXJzcGVjdGl2ZVByb3BlcnR5JiZ2b2lkIDA9PT1iLndlYmtpdFBlcnNwZWN0aXZlJiYoYS5hbmltVHlwZT0hMSkpLHZvaWQgMCE9PWIuTW96VHJhbnNmb3JtJiYoYS5hbmltVHlwZT1cIk1velRyYW5zZm9ybVwiLGEudHJhbnNmb3JtVHlwZT1cIi1tb3otdHJhbnNmb3JtXCIsYS50cmFuc2l0aW9uVHlwZT1cIk1velRyYW5zaXRpb25cIix2b2lkIDA9PT1iLnBlcnNwZWN0aXZlUHJvcGVydHkmJnZvaWQgMD09PWIuTW96UGVyc3BlY3RpdmUmJihhLmFuaW1UeXBlPSExKSksdm9pZCAwIT09Yi53ZWJraXRUcmFuc2Zvcm0mJihhLmFuaW1UeXBlPVwid2Via2l0VHJhbnNmb3JtXCIsYS50cmFuc2Zvcm1UeXBlPVwiLXdlYmtpdC10cmFuc2Zvcm1cIixhLnRyYW5zaXRpb25UeXBlPVwid2Via2l0VHJhbnNpdGlvblwiLHZvaWQgMD09PWIucGVyc3BlY3RpdmVQcm9wZXJ0eSYmdm9pZCAwPT09Yi53ZWJraXRQZXJzcGVjdGl2ZSYmKGEuYW5pbVR5cGU9ITEpKSx2b2lkIDAhPT1iLm1zVHJhbnNmb3JtJiYoYS5hbmltVHlwZT1cIm1zVHJhbnNmb3JtXCIsYS50cmFuc2Zvcm1UeXBlPVwiLW1zLXRyYW5zZm9ybVwiLGEudHJhbnNpdGlvblR5cGU9XCJtc1RyYW5zaXRpb25cIix2b2lkIDA9PT1iLm1zVHJhbnNmb3JtJiYoYS5hbmltVHlwZT0hMSkpLHZvaWQgMCE9PWIudHJhbnNmb3JtJiZhLmFuaW1UeXBlIT09ITEmJihhLmFuaW1UeXBlPVwidHJhbnNmb3JtXCIsYS50cmFuc2Zvcm1UeXBlPVwidHJhbnNmb3JtXCIsYS50cmFuc2l0aW9uVHlwZT1cInRyYW5zaXRpb25cIiksYS50cmFuc2Zvcm1zRW5hYmxlZD1hLm9wdGlvbnMudXNlVHJhbnNmb3JtJiZudWxsIT09YS5hbmltVHlwZSYmYS5hbmltVHlwZSE9PSExfSxiLnByb3RvdHlwZS5zZXRTbGlkZUNsYXNzZXM9ZnVuY3Rpb24oYSl7dmFyIGMsZCxlLGYsYj10aGlzO2Q9Yi4kc2xpZGVyLmZpbmQoXCIuc2xpY2stc2xpZGVcIikucmVtb3ZlQ2xhc3MoXCJzbGljay1hY3RpdmUgc2xpY2stY2VudGVyIHNsaWNrLWN1cnJlbnRcIikuYXR0cihcImFyaWEtaGlkZGVuXCIsXCJ0cnVlXCIpLGIuJHNsaWRlcy5lcShhKS5hZGRDbGFzcyhcInNsaWNrLWN1cnJlbnRcIiksYi5vcHRpb25zLmNlbnRlck1vZGU9PT0hMD8oYz1NYXRoLmZsb29yKGIub3B0aW9ucy5zbGlkZXNUb1Nob3cvMiksYi5vcHRpb25zLmluZmluaXRlPT09ITAmJihhPj1jJiZhPD1iLnNsaWRlQ291bnQtMS1jP2IuJHNsaWRlcy5zbGljZShhLWMsYStjKzEpLmFkZENsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwiZmFsc2VcIik6KGU9Yi5vcHRpb25zLnNsaWRlc1RvU2hvdythLFxuZC5zbGljZShlLWMrMSxlK2MrMikuYWRkQ2xhc3MoXCJzbGljay1hY3RpdmVcIikuYXR0cihcImFyaWEtaGlkZGVuXCIsXCJmYWxzZVwiKSksMD09PWE/ZC5lcShkLmxlbmd0aC0xLWIub3B0aW9ucy5zbGlkZXNUb1Nob3cpLmFkZENsYXNzKFwic2xpY2stY2VudGVyXCIpOmE9PT1iLnNsaWRlQ291bnQtMSYmZC5lcShiLm9wdGlvbnMuc2xpZGVzVG9TaG93KS5hZGRDbGFzcyhcInNsaWNrLWNlbnRlclwiKSksYi4kc2xpZGVzLmVxKGEpLmFkZENsYXNzKFwic2xpY2stY2VudGVyXCIpKTphPj0wJiZhPD1iLnNsaWRlQ291bnQtYi5vcHRpb25zLnNsaWRlc1RvU2hvdz9iLiRzbGlkZXMuc2xpY2UoYSxhK2Iub3B0aW9ucy5zbGlkZXNUb1Nob3cpLmFkZENsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwiZmFsc2VcIik6ZC5sZW5ndGg8PWIub3B0aW9ucy5zbGlkZXNUb1Nob3c/ZC5hZGRDbGFzcyhcInNsaWNrLWFjdGl2ZVwiKS5hdHRyKFwiYXJpYS1oaWRkZW5cIixcImZhbHNlXCIpOihmPWIuc2xpZGVDb3VudCViLm9wdGlvbnMuc2xpZGVzVG9TaG93LGU9Yi5vcHRpb25zLmluZmluaXRlPT09ITA/Yi5vcHRpb25zLnNsaWRlc1RvU2hvdythOmEsYi5vcHRpb25zLnNsaWRlc1RvU2hvdz09Yi5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsJiZiLnNsaWRlQ291bnQtYTxiLm9wdGlvbnMuc2xpZGVzVG9TaG93P2Quc2xpY2UoZS0oYi5vcHRpb25zLnNsaWRlc1RvU2hvdy1mKSxlK2YpLmFkZENsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwiZmFsc2VcIik6ZC5zbGljZShlLGUrYi5vcHRpb25zLnNsaWRlc1RvU2hvdykuYWRkQ2xhc3MoXCJzbGljay1hY3RpdmVcIikuYXR0cihcImFyaWEtaGlkZGVuXCIsXCJmYWxzZVwiKSksXCJvbmRlbWFuZFwiPT09Yi5vcHRpb25zLmxhenlMb2FkJiZiLmxhenlMb2FkKCl9LGIucHJvdG90eXBlLnNldHVwSW5maW5pdGU9ZnVuY3Rpb24oKXt2YXIgYyxkLGUsYj10aGlzO2lmKGIub3B0aW9ucy5mYWRlPT09ITAmJihiLm9wdGlvbnMuY2VudGVyTW9kZT0hMSksYi5vcHRpb25zLmluZmluaXRlPT09ITAmJmIub3B0aW9ucy5mYWRlPT09ITEmJihkPW51bGwsYi5zbGlkZUNvdW50PmIub3B0aW9ucy5zbGlkZXNUb1Nob3cpKXtmb3IoZT1iLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwP2Iub3B0aW9ucy5zbGlkZXNUb1Nob3crMTpiLm9wdGlvbnMuc2xpZGVzVG9TaG93LGM9Yi5zbGlkZUNvdW50O2M+Yi5zbGlkZUNvdW50LWU7Yy09MSlkPWMtMSxhKGIuJHNsaWRlc1tkXSkuY2xvbmUoITApLmF0dHIoXCJpZFwiLFwiXCIpLmF0dHIoXCJkYXRhLXNsaWNrLWluZGV4XCIsZC1iLnNsaWRlQ291bnQpLnByZXBlbmRUbyhiLiRzbGlkZVRyYWNrKS5hZGRDbGFzcyhcInNsaWNrLWNsb25lZFwiKTtmb3IoYz0wO2U+YztjKz0xKWQ9YyxhKGIuJHNsaWRlc1tkXSkuY2xvbmUoITApLmF0dHIoXCJpZFwiLFwiXCIpLmF0dHIoXCJkYXRhLXNsaWNrLWluZGV4XCIsZCtiLnNsaWRlQ291bnQpLmFwcGVuZFRvKGIuJHNsaWRlVHJhY2spLmFkZENsYXNzKFwic2xpY2stY2xvbmVkXCIpO2IuJHNsaWRlVHJhY2suZmluZChcIi5zbGljay1jbG9uZWRcIikuZmluZChcIltpZF1cIikuZWFjaChmdW5jdGlvbigpe2EodGhpcykuYXR0cihcImlkXCIsXCJcIil9KX19LGIucHJvdG90eXBlLmludGVycnVwdD1mdW5jdGlvbihhKXt2YXIgYj10aGlzO2F8fGIuYXV0b1BsYXkoKSxiLmludGVycnVwdGVkPWF9LGIucHJvdG90eXBlLnNlbGVjdEhhbmRsZXI9ZnVuY3Rpb24oYil7dmFyIGM9dGhpcyxkPWEoYi50YXJnZXQpLmlzKFwiLnNsaWNrLXNsaWRlXCIpP2EoYi50YXJnZXQpOmEoYi50YXJnZXQpLnBhcmVudHMoXCIuc2xpY2stc2xpZGVcIiksZT1wYXJzZUludChkLmF0dHIoXCJkYXRhLXNsaWNrLWluZGV4XCIpKTtyZXR1cm4gZXx8KGU9MCksYy5zbGlkZUNvdW50PD1jLm9wdGlvbnMuc2xpZGVzVG9TaG93PyhjLnNldFNsaWRlQ2xhc3NlcyhlKSx2b2lkIGMuYXNOYXZGb3IoZSkpOnZvaWQgYy5zbGlkZUhhbmRsZXIoZSl9LGIucHJvdG90eXBlLnNsaWRlSGFuZGxlcj1mdW5jdGlvbihhLGIsYyl7dmFyIGQsZSxmLGcsaixoPW51bGwsaT10aGlzO3JldHVybiBiPWJ8fCExLGkuYW5pbWF0aW5nPT09ITAmJmkub3B0aW9ucy53YWl0Rm9yQW5pbWF0ZT09PSEwfHxpLm9wdGlvbnMuZmFkZT09PSEwJiZpLmN1cnJlbnRTbGlkZT09PWF8fGkuc2xpZGVDb3VudDw9aS5vcHRpb25zLnNsaWRlc1RvU2hvdz92b2lkIDA6KGI9PT0hMSYmaS5hc05hdkZvcihhKSxkPWEsaD1pLmdldExlZnQoZCksZz1pLmdldExlZnQoaS5jdXJyZW50U2xpZGUpLGkuY3VycmVudExlZnQ9bnVsbD09PWkuc3dpcGVMZWZ0P2c6aS5zd2lwZUxlZnQsaS5vcHRpb25zLmluZmluaXRlPT09ITEmJmkub3B0aW9ucy5jZW50ZXJNb2RlPT09ITEmJigwPmF8fGE+aS5nZXREb3RDb3VudCgpKmkub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCk/dm9pZChpLm9wdGlvbnMuZmFkZT09PSExJiYoZD1pLmN1cnJlbnRTbGlkZSxjIT09ITA/aS5hbmltYXRlU2xpZGUoZyxmdW5jdGlvbigpe2kucG9zdFNsaWRlKGQpfSk6aS5wb3N0U2xpZGUoZCkpKTppLm9wdGlvbnMuaW5maW5pdGU9PT0hMSYmaS5vcHRpb25zLmNlbnRlck1vZGU9PT0hMCYmKDA+YXx8YT5pLnNsaWRlQ291bnQtaS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKT92b2lkKGkub3B0aW9ucy5mYWRlPT09ITEmJihkPWkuY3VycmVudFNsaWRlLGMhPT0hMD9pLmFuaW1hdGVTbGlkZShnLGZ1bmN0aW9uKCl7aS5wb3N0U2xpZGUoZCl9KTppLnBvc3RTbGlkZShkKSkpOihpLm9wdGlvbnMuYXV0b3BsYXkmJmNsZWFySW50ZXJ2YWwoaS5hdXRvUGxheVRpbWVyKSxlPTA+ZD9pLnNsaWRlQ291bnQlaS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIT09MD9pLnNsaWRlQ291bnQtaS5zbGlkZUNvdW50JWkub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDppLnNsaWRlQ291bnQrZDpkPj1pLnNsaWRlQ291bnQ/aS5zbGlkZUNvdW50JWkub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCE9PTA/MDpkLWkuc2xpZGVDb3VudDpkLGkuYW5pbWF0aW5nPSEwLGkuJHNsaWRlci50cmlnZ2VyKFwiYmVmb3JlQ2hhbmdlXCIsW2ksaS5jdXJyZW50U2xpZGUsZV0pLGY9aS5jdXJyZW50U2xpZGUsaS5jdXJyZW50U2xpZGU9ZSxpLnNldFNsaWRlQ2xhc3NlcyhpLmN1cnJlbnRTbGlkZSksaS5vcHRpb25zLmFzTmF2Rm9yJiYoaj1pLmdldE5hdlRhcmdldCgpLGo9ai5zbGljayhcImdldFNsaWNrXCIpLGouc2xpZGVDb3VudDw9ai5vcHRpb25zLnNsaWRlc1RvU2hvdyYmai5zZXRTbGlkZUNsYXNzZXMoaS5jdXJyZW50U2xpZGUpKSxpLnVwZGF0ZURvdHMoKSxpLnVwZGF0ZUFycm93cygpLGkub3B0aW9ucy5mYWRlPT09ITA/KGMhPT0hMD8oaS5mYWRlU2xpZGVPdXQoZiksaS5mYWRlU2xpZGUoZSxmdW5jdGlvbigpe2kucG9zdFNsaWRlKGUpfSkpOmkucG9zdFNsaWRlKGUpLHZvaWQgaS5hbmltYXRlSGVpZ2h0KCkpOnZvaWQoYyE9PSEwP2kuYW5pbWF0ZVNsaWRlKGgsZnVuY3Rpb24oKXtpLnBvc3RTbGlkZShlKX0pOmkucG9zdFNsaWRlKGUpKSkpfSxiLnByb3RvdHlwZS5zdGFydExvYWQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Eub3B0aW9ucy5hcnJvd3M9PT0hMCYmYS5zbGlkZUNvdW50PmEub3B0aW9ucy5zbGlkZXNUb1Nob3cmJihhLiRwcmV2QXJyb3cuaGlkZSgpLGEuJG5leHRBcnJvdy5oaWRlKCkpLGEub3B0aW9ucy5kb3RzPT09ITAmJmEuc2xpZGVDb3VudD5hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiZhLiRkb3RzLmhpZGUoKSxhLiRzbGlkZXIuYWRkQ2xhc3MoXCJzbGljay1sb2FkaW5nXCIpfSxiLnByb3RvdHlwZS5zd2lwZURpcmVjdGlvbj1mdW5jdGlvbigpe3ZhciBhLGIsYyxkLGU9dGhpcztyZXR1cm4gYT1lLnRvdWNoT2JqZWN0LnN0YXJ0WC1lLnRvdWNoT2JqZWN0LmN1clgsYj1lLnRvdWNoT2JqZWN0LnN0YXJ0WS1lLnRvdWNoT2JqZWN0LmN1clksYz1NYXRoLmF0YW4yKGIsYSksZD1NYXRoLnJvdW5kKDE4MCpjL01hdGguUEkpLDA+ZCYmKGQ9MzYwLU1hdGguYWJzKGQpKSw0NT49ZCYmZD49MD9lLm9wdGlvbnMucnRsPT09ITE/XCJsZWZ0XCI6XCJyaWdodFwiOjM2MD49ZCYmZD49MzE1P2Uub3B0aW9ucy5ydGw9PT0hMT9cImxlZnRcIjpcInJpZ2h0XCI6ZD49MTM1JiYyMjU+PWQ/ZS5vcHRpb25zLnJ0bD09PSExP1wicmlnaHRcIjpcImxlZnRcIjplLm9wdGlvbnMudmVydGljYWxTd2lwaW5nPT09ITA/ZD49MzUmJjEzNT49ZD9cImRvd25cIjpcInVwXCI6XCJ2ZXJ0aWNhbFwifSxiLnByb3RvdHlwZS5zd2lwZUVuZD1mdW5jdGlvbihhKXt2YXIgYyxkLGI9dGhpcztpZihiLmRyYWdnaW5nPSExLGIuaW50ZXJydXB0ZWQ9ITEsYi5zaG91bGRDbGljaz1iLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoPjEwPyExOiEwLHZvaWQgMD09PWIudG91Y2hPYmplY3QuY3VyWClyZXR1cm4hMTtpZihiLnRvdWNoT2JqZWN0LmVkZ2VIaXQ9PT0hMCYmYi4kc2xpZGVyLnRyaWdnZXIoXCJlZGdlXCIsW2IsYi5zd2lwZURpcmVjdGlvbigpXSksYi50b3VjaE9iamVjdC5zd2lwZUxlbmd0aD49Yi50b3VjaE9iamVjdC5taW5Td2lwZSl7c3dpdGNoKGQ9Yi5zd2lwZURpcmVjdGlvbigpKXtjYXNlXCJsZWZ0XCI6Y2FzZVwiZG93blwiOmM9Yi5vcHRpb25zLnN3aXBlVG9TbGlkZT9iLmNoZWNrTmF2aWdhYmxlKGIuY3VycmVudFNsaWRlK2IuZ2V0U2xpZGVDb3VudCgpKTpiLmN1cnJlbnRTbGlkZStiLmdldFNsaWRlQ291bnQoKSxiLmN1cnJlbnREaXJlY3Rpb249MDticmVhaztjYXNlXCJyaWdodFwiOmNhc2VcInVwXCI6Yz1iLm9wdGlvbnMuc3dpcGVUb1NsaWRlP2IuY2hlY2tOYXZpZ2FibGUoYi5jdXJyZW50U2xpZGUtYi5nZXRTbGlkZUNvdW50KCkpOmIuY3VycmVudFNsaWRlLWIuZ2V0U2xpZGVDb3VudCgpLGIuY3VycmVudERpcmVjdGlvbj0xfVwidmVydGljYWxcIiE9ZCYmKGIuc2xpZGVIYW5kbGVyKGMpLGIudG91Y2hPYmplY3Q9e30sYi4kc2xpZGVyLnRyaWdnZXIoXCJzd2lwZVwiLFtiLGRdKSl9ZWxzZSBiLnRvdWNoT2JqZWN0LnN0YXJ0WCE9PWIudG91Y2hPYmplY3QuY3VyWCYmKGIuc2xpZGVIYW5kbGVyKGIuY3VycmVudFNsaWRlKSxiLnRvdWNoT2JqZWN0PXt9KX0sYi5wcm90b3R5cGUuc3dpcGVIYW5kbGVyPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXM7aWYoIShiLm9wdGlvbnMuc3dpcGU9PT0hMXx8XCJvbnRvdWNoZW5kXCJpbiBkb2N1bWVudCYmYi5vcHRpb25zLnN3aXBlPT09ITF8fGIub3B0aW9ucy5kcmFnZ2FibGU9PT0hMSYmLTEhPT1hLnR5cGUuaW5kZXhPZihcIm1vdXNlXCIpKSlzd2l0Y2goYi50b3VjaE9iamVjdC5maW5nZXJDb3VudD1hLm9yaWdpbmFsRXZlbnQmJnZvaWQgMCE9PWEub3JpZ2luYWxFdmVudC50b3VjaGVzP2Eub3JpZ2luYWxFdmVudC50b3VjaGVzLmxlbmd0aDoxLGIudG91Y2hPYmplY3QubWluU3dpcGU9Yi5saXN0V2lkdGgvYi5vcHRpb25zLnRvdWNoVGhyZXNob2xkLGIub3B0aW9ucy52ZXJ0aWNhbFN3aXBpbmc9PT0hMCYmKGIudG91Y2hPYmplY3QubWluU3dpcGU9Yi5saXN0SGVpZ2h0L2Iub3B0aW9ucy50b3VjaFRocmVzaG9sZCksYS5kYXRhLmFjdGlvbil7Y2FzZVwic3RhcnRcIjpiLnN3aXBlU3RhcnQoYSk7YnJlYWs7Y2FzZVwibW92ZVwiOmIuc3dpcGVNb3ZlKGEpO2JyZWFrO2Nhc2VcImVuZFwiOmIuc3dpcGVFbmQoYSl9fSxiLnByb3RvdHlwZS5zd2lwZU1vdmU9ZnVuY3Rpb24oYSl7dmFyIGQsZSxmLGcsaCxiPXRoaXM7cmV0dXJuIGg9dm9pZCAwIT09YS5vcmlnaW5hbEV2ZW50P2Eub3JpZ2luYWxFdmVudC50b3VjaGVzOm51bGwsIWIuZHJhZ2dpbmd8fGgmJjEhPT1oLmxlbmd0aD8hMTooZD1iLmdldExlZnQoYi5jdXJyZW50U2xpZGUpLGIudG91Y2hPYmplY3QuY3VyWD12b2lkIDAhPT1oP2hbMF0ucGFnZVg6YS5jbGllbnRYLGIudG91Y2hPYmplY3QuY3VyWT12b2lkIDAhPT1oP2hbMF0ucGFnZVk6YS5jbGllbnRZLGIudG91Y2hPYmplY3Quc3dpcGVMZW5ndGg9TWF0aC5yb3VuZChNYXRoLnNxcnQoTWF0aC5wb3coYi50b3VjaE9iamVjdC5jdXJYLWIudG91Y2hPYmplY3Quc3RhcnRYLDIpKSksYi5vcHRpb25zLnZlcnRpY2FsU3dpcGluZz09PSEwJiYoYi50b3VjaE9iamVjdC5zd2lwZUxlbmd0aD1NYXRoLnJvdW5kKE1hdGguc3FydChNYXRoLnBvdyhiLnRvdWNoT2JqZWN0LmN1clktYi50b3VjaE9iamVjdC5zdGFydFksMikpKSksZT1iLnN3aXBlRGlyZWN0aW9uKCksXCJ2ZXJ0aWNhbFwiIT09ZT8odm9pZCAwIT09YS5vcmlnaW5hbEV2ZW50JiZiLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoPjQmJmEucHJldmVudERlZmF1bHQoKSxnPShiLm9wdGlvbnMucnRsPT09ITE/MTotMSkqKGIudG91Y2hPYmplY3QuY3VyWD5iLnRvdWNoT2JqZWN0LnN0YXJ0WD8xOi0xKSxiLm9wdGlvbnMudmVydGljYWxTd2lwaW5nPT09ITAmJihnPWIudG91Y2hPYmplY3QuY3VyWT5iLnRvdWNoT2JqZWN0LnN0YXJ0WT8xOi0xKSxmPWIudG91Y2hPYmplY3Quc3dpcGVMZW5ndGgsYi50b3VjaE9iamVjdC5lZGdlSGl0PSExLGIub3B0aW9ucy5pbmZpbml0ZT09PSExJiYoMD09PWIuY3VycmVudFNsaWRlJiZcInJpZ2h0XCI9PT1lfHxiLmN1cnJlbnRTbGlkZT49Yi5nZXREb3RDb3VudCgpJiZcImxlZnRcIj09PWUpJiYoZj1iLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoKmIub3B0aW9ucy5lZGdlRnJpY3Rpb24sYi50b3VjaE9iamVjdC5lZGdlSGl0PSEwKSxiLm9wdGlvbnMudmVydGljYWw9PT0hMT9iLnN3aXBlTGVmdD1kK2YqZzpiLnN3aXBlTGVmdD1kK2YqKGIuJGxpc3QuaGVpZ2h0KCkvYi5saXN0V2lkdGgpKmcsYi5vcHRpb25zLnZlcnRpY2FsU3dpcGluZz09PSEwJiYoYi5zd2lwZUxlZnQ9ZCtmKmcpLGIub3B0aW9ucy5mYWRlPT09ITB8fGIub3B0aW9ucy50b3VjaE1vdmU9PT0hMT8hMTpiLmFuaW1hdGluZz09PSEwPyhiLnN3aXBlTGVmdD1udWxsLCExKTp2b2lkIGIuc2V0Q1NTKGIuc3dpcGVMZWZ0KSk6dm9pZCAwKX0sYi5wcm90b3R5cGUuc3dpcGVTdGFydD1mdW5jdGlvbihhKXt2YXIgYyxiPXRoaXM7cmV0dXJuIGIuaW50ZXJydXB0ZWQ9ITAsMSE9PWIudG91Y2hPYmplY3QuZmluZ2VyQ291bnR8fGIuc2xpZGVDb3VudDw9Yi5vcHRpb25zLnNsaWRlc1RvU2hvdz8oYi50b3VjaE9iamVjdD17fSwhMSk6KHZvaWQgMCE9PWEub3JpZ2luYWxFdmVudCYmdm9pZCAwIT09YS5vcmlnaW5hbEV2ZW50LnRvdWNoZXMmJihjPWEub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdKSxiLnRvdWNoT2JqZWN0LnN0YXJ0WD1iLnRvdWNoT2JqZWN0LmN1clg9dm9pZCAwIT09Yz9jLnBhZ2VYOmEuY2xpZW50WCxiLnRvdWNoT2JqZWN0LnN0YXJ0WT1iLnRvdWNoT2JqZWN0LmN1clk9dm9pZCAwIT09Yz9jLnBhZ2VZOmEuY2xpZW50WSx2b2lkKGIuZHJhZ2dpbmc9ITApKX0sYi5wcm90b3R5cGUudW5maWx0ZXJTbGlkZXM9Yi5wcm90b3R5cGUuc2xpY2tVbmZpbHRlcj1mdW5jdGlvbigpe3ZhciBhPXRoaXM7bnVsbCE9PWEuJHNsaWRlc0NhY2hlJiYoYS51bmxvYWQoKSxhLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZGV0YWNoKCksYS4kc2xpZGVzQ2FjaGUuYXBwZW5kVG8oYS4kc2xpZGVUcmFjayksYS5yZWluaXQoKSl9LGIucHJvdG90eXBlLnVubG9hZD1mdW5jdGlvbigpe3ZhciBiPXRoaXM7YShcIi5zbGljay1jbG9uZWRcIixiLiRzbGlkZXIpLnJlbW92ZSgpLGIuJGRvdHMmJmIuJGRvdHMucmVtb3ZlKCksYi4kcHJldkFycm93JiZiLmh0bWxFeHByLnRlc3QoYi5vcHRpb25zLnByZXZBcnJvdykmJmIuJHByZXZBcnJvdy5yZW1vdmUoKSxiLiRuZXh0QXJyb3cmJmIuaHRtbEV4cHIudGVzdChiLm9wdGlvbnMubmV4dEFycm93KSYmYi4kbmV4dEFycm93LnJlbW92ZSgpLGIuJHNsaWRlcy5yZW1vdmVDbGFzcyhcInNsaWNrLXNsaWRlIHNsaWNrLWFjdGl2ZSBzbGljay12aXNpYmxlIHNsaWNrLWN1cnJlbnRcIikuYXR0cihcImFyaWEtaGlkZGVuXCIsXCJ0cnVlXCIpLmNzcyhcIndpZHRoXCIsXCJcIil9LGIucHJvdG90eXBlLnVuc2xpY2s9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztiLiRzbGlkZXIudHJpZ2dlcihcInVuc2xpY2tcIixbYixhXSksYi5kZXN0cm95KCl9LGIucHJvdG90eXBlLnVwZGF0ZUFycm93cz1mdW5jdGlvbigpe3ZhciBiLGE9dGhpcztiPU1hdGguZmxvb3IoYS5vcHRpb25zLnNsaWRlc1RvU2hvdy8yKSxhLm9wdGlvbnMuYXJyb3dzPT09ITAmJmEuc2xpZGVDb3VudD5hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiYhYS5vcHRpb25zLmluZmluaXRlJiYoYS4kcHJldkFycm93LnJlbW92ZUNsYXNzKFwic2xpY2stZGlzYWJsZWRcIikuYXR0cihcImFyaWEtZGlzYWJsZWRcIixcImZhbHNlXCIpLGEuJG5leHRBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJmYWxzZVwiKSwwPT09YS5jdXJyZW50U2xpZGU/KGEuJHByZXZBcnJvdy5hZGRDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJ0cnVlXCIpLGEuJG5leHRBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJmYWxzZVwiKSk6YS5jdXJyZW50U2xpZGU+PWEuc2xpZGVDb3VudC1hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiZhLm9wdGlvbnMuY2VudGVyTW9kZT09PSExPyhhLiRuZXh0QXJyb3cuYWRkQ2xhc3MoXCJzbGljay1kaXNhYmxlZFwiKS5hdHRyKFwiYXJpYS1kaXNhYmxlZFwiLFwidHJ1ZVwiKSxhLiRwcmV2QXJyb3cucmVtb3ZlQ2xhc3MoXCJzbGljay1kaXNhYmxlZFwiKS5hdHRyKFwiYXJpYS1kaXNhYmxlZFwiLFwiZmFsc2VcIikpOmEuY3VycmVudFNsaWRlPj1hLnNsaWRlQ291bnQtMSYmYS5vcHRpb25zLmNlbnRlck1vZGU9PT0hMCYmKGEuJG5leHRBcnJvdy5hZGRDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJ0cnVlXCIpLGEuJHByZXZBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJmYWxzZVwiKSkpfSxiLnByb3RvdHlwZS51cGRhdGVEb3RzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcztudWxsIT09YS4kZG90cyYmKGEuJGRvdHMuZmluZChcImxpXCIpLnJlbW92ZUNsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwidHJ1ZVwiKSxhLiRkb3RzLmZpbmQoXCJsaVwiKS5lcShNYXRoLmZsb29yKGEuY3VycmVudFNsaWRlL2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCkpLmFkZENsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwiZmFsc2VcIikpfSxiLnByb3RvdHlwZS52aXNpYmlsaXR5PWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLm9wdGlvbnMuYXV0b3BsYXkmJihkb2N1bWVudFthLmhpZGRlbl0/YS5pbnRlcnJ1cHRlZD0hMDphLmludGVycnVwdGVkPSExKX0sYS5mbi5zbGljaz1mdW5jdGlvbigpe3ZhciBmLGcsYT10aGlzLGM9YXJndW1lbnRzWzBdLGQ9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpLGU9YS5sZW5ndGg7Zm9yKGY9MDtlPmY7ZisrKWlmKFwib2JqZWN0XCI9PXR5cGVvZiBjfHxcInVuZGVmaW5lZFwiPT10eXBlb2YgYz9hW2ZdLnNsaWNrPW5ldyBiKGFbZl0sYyk6Zz1hW2ZdLnNsaWNrW2NdLmFwcGx5KGFbZl0uc2xpY2ssZCksXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGcpcmV0dXJuIGc7cmV0dXJuIGF9fSk7IiwiLyohIGxhenlzaXplcyAtIHYyLjAuNyAqL1xuIWZ1bmN0aW9uKGEsYil7dmFyIGM9YihhLGEuZG9jdW1lbnQpO2EubGF6eVNpemVzPWMsXCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMmJihtb2R1bGUuZXhwb3J0cz1jKX0od2luZG93LGZ1bmN0aW9uKGEsYil7XCJ1c2Ugc3RyaWN0XCI7aWYoYi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKXt2YXIgYyxkPWIuZG9jdW1lbnRFbGVtZW50LGU9YS5EYXRlLGY9YS5IVE1MUGljdHVyZUVsZW1lbnQsZz1cImFkZEV2ZW50TGlzdGVuZXJcIixoPVwiZ2V0QXR0cmlidXRlXCIsaT1hW2ddLGo9YS5zZXRUaW1lb3V0LGs9YS5yZXF1ZXN0QW5pbWF0aW9uRnJhbWV8fGosbD1hLnJlcXVlc3RJZGxlQ2FsbGJhY2ssbT0vXnBpY3R1cmUkL2ksbj1bXCJsb2FkXCIsXCJlcnJvclwiLFwibGF6eWluY2x1ZGVkXCIsXCJfbGF6eWxvYWRlZFwiXSxvPXt9LHA9QXJyYXkucHJvdG90eXBlLmZvckVhY2gscT1mdW5jdGlvbihhLGIpe3JldHVybiBvW2JdfHwob1tiXT1uZXcgUmVnRXhwKFwiKFxcXFxzfF4pXCIrYitcIihcXFxcc3wkKVwiKSksb1tiXS50ZXN0KGFbaF0oXCJjbGFzc1wiKXx8XCJcIikmJm9bYl19LHI9ZnVuY3Rpb24oYSxiKXtxKGEsYil8fGEuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwoYVtoXShcImNsYXNzXCIpfHxcIlwiKS50cmltKCkrXCIgXCIrYil9LHM9ZnVuY3Rpb24oYSxiKXt2YXIgYzsoYz1xKGEsYikpJiZhLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsKGFbaF0oXCJjbGFzc1wiKXx8XCJcIikucmVwbGFjZShjLFwiIFwiKSl9LHQ9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPWM/ZzpcInJlbW92ZUV2ZW50TGlzdGVuZXJcIjtjJiZ0KGEsYiksbi5mb3JFYWNoKGZ1bmN0aW9uKGMpe2FbZF0oYyxiKX0pfSx1PWZ1bmN0aW9uKGEsYyxkLGUsZil7dmFyIGc9Yi5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO3JldHVybiBnLmluaXRDdXN0b21FdmVudChjLCFlLCFmLGR8fHt9KSxhLmRpc3BhdGNoRXZlbnQoZyksZ30sdj1mdW5jdGlvbihiLGQpe3ZhciBlOyFmJiYoZT1hLnBpY3R1cmVmaWxsfHxjLnBmKT9lKHtyZWV2YWx1YXRlOiEwLGVsZW1lbnRzOltiXX0pOmQmJmQuc3JjJiYoYi5zcmM9ZC5zcmMpfSx3PWZ1bmN0aW9uKGEsYil7cmV0dXJuKGdldENvbXB1dGVkU3R5bGUoYSxudWxsKXx8e30pW2JdfSx4PWZ1bmN0aW9uKGEsYixkKXtmb3IoZD1kfHxhLm9mZnNldFdpZHRoO2Q8Yy5taW5TaXplJiZiJiYhYS5fbGF6eXNpemVzV2lkdGg7KWQ9Yi5vZmZzZXRXaWR0aCxiPWIucGFyZW50Tm9kZTtyZXR1cm4gZH0seT1mdW5jdGlvbigpe3ZhciBhLGMsZD1bXSxlPWZ1bmN0aW9uKCl7dmFyIGI7Zm9yKGE9ITAsYz0hMTtkLmxlbmd0aDspYj1kLnNoaWZ0KCksYlswXS5hcHBseShiWzFdLGJbMl0pO2E9ITF9LGY9ZnVuY3Rpb24oZil7YT9mLmFwcGx5KHRoaXMsYXJndW1lbnRzKTooZC5wdXNoKFtmLHRoaXMsYXJndW1lbnRzXSksY3x8KGM9ITAsKGIuaGlkZGVuP2o6aykoZSkpKX07cmV0dXJuIGYuX2xzRmx1c2g9ZSxmfSgpLHo9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYj9mdW5jdGlvbigpe3koYSl9OmZ1bmN0aW9uKCl7dmFyIGI9dGhpcyxjPWFyZ3VtZW50czt5KGZ1bmN0aW9uKCl7YS5hcHBseShiLGMpfSl9fSxBPWZ1bmN0aW9uKGEpe3ZhciBiLGM9MCxkPTEyNSxmPTY2NixnPWYsaD1mdW5jdGlvbigpe2I9ITEsYz1lLm5vdygpLGEoKX0saT1sP2Z1bmN0aW9uKCl7bChoLHt0aW1lb3V0Omd9KSxnIT09ZiYmKGc9Zil9OnooZnVuY3Rpb24oKXtqKGgpfSwhMCk7cmV0dXJuIGZ1bmN0aW9uKGEpe3ZhciBmOyhhPWE9PT0hMCkmJihnPTQ0KSxifHwoYj0hMCxmPWQtKGUubm93KCktYyksMD5mJiYoZj0wKSxhfHw5PmYmJmw/aSgpOmooaSxmKSl9fSxCPWZ1bmN0aW9uKGEpe3ZhciBiLGMsZD05OSxmPWZ1bmN0aW9uKCl7Yj1udWxsLGEoKX0sZz1mdW5jdGlvbigpe3ZhciBhPWUubm93KCktYztkPmE/aihnLGQtYSk6KGx8fGYpKGYpfTtyZXR1cm4gZnVuY3Rpb24oKXtjPWUubm93KCksYnx8KGI9aihnLGQpKX19LEM9ZnVuY3Rpb24oKXt2YXIgZixrLGwsbixvLHgsQyxFLEYsRyxILEksSixLLEwsTT0vXmltZyQvaSxOPS9eaWZyYW1lJC9pLE89XCJvbnNjcm9sbFwiaW4gYSYmIS9nbGVib3QvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCksUD0wLFE9MCxSPTAsUz0tMSxUPWZ1bmN0aW9uKGEpe1ItLSxhJiZhLnRhcmdldCYmdChhLnRhcmdldCxUKSwoIWF8fDA+Unx8IWEudGFyZ2V0KSYmKFI9MCl9LFU9ZnVuY3Rpb24oYSxjKXt2YXIgZSxmPWEsZz1cImhpZGRlblwiPT13KGIuYm9keSxcInZpc2liaWxpdHlcIil8fFwiaGlkZGVuXCIhPXcoYSxcInZpc2liaWxpdHlcIik7Zm9yKEYtPWMsSSs9YyxHLT1jLEgrPWM7ZyYmKGY9Zi5vZmZzZXRQYXJlbnQpJiZmIT1iLmJvZHkmJmYhPWQ7KWc9KHcoZixcIm9wYWNpdHlcIil8fDEpPjAsZyYmXCJ2aXNpYmxlXCIhPXcoZixcIm92ZXJmbG93XCIpJiYoZT1mLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGc9SD5lLmxlZnQmJkc8ZS5yaWdodCYmST5lLnRvcC0xJiZGPGUuYm90dG9tKzEpO3JldHVybiBnfSxWPWZ1bmN0aW9uKCl7dmFyIGEsZSxnLGksaixtLG4scCxxO2lmKChvPWMubG9hZE1vZGUpJiY4PlImJihhPWYubGVuZ3RoKSl7ZT0wLFMrKyxudWxsPT1LJiYoXCJleHBhbmRcImluIGN8fChjLmV4cGFuZD1kLmNsaWVudEhlaWdodD41MDAmJmQuY2xpZW50V2lkdGg+NTAwPzUwMDozNzApLEo9Yy5leHBhbmQsSz1KKmMuZXhwRmFjdG9yKSxLPlEmJjE+UiYmUz4yJiZvPjImJiFiLmhpZGRlbj8oUT1LLFM9MCk6UT1vPjEmJlM+MSYmNj5SP0o6UDtmb3IoO2E+ZTtlKyspaWYoZltlXSYmIWZbZV0uX2xhenlSYWNlKWlmKE8paWYoKHA9ZltlXVtoXShcImRhdGEtZXhwYW5kXCIpKSYmKG09MSpwKXx8KG09USkscSE9PW0mJihDPWlubmVyV2lkdGgrbSpMLEU9aW5uZXJIZWlnaHQrbSxuPS0xKm0scT1tKSxnPWZbZV0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksKEk9Zy5ib3R0b20pPj1uJiYoRj1nLnRvcCk8PUUmJihIPWcucmlnaHQpPj1uKkwmJihHPWcubGVmdCk8PUMmJihJfHxIfHxHfHxGKSYmKGwmJjM+UiYmIXAmJigzPm98fDQ+Uyl8fFUoZltlXSxtKSkpe2lmKGJhKGZbZV0pLGo9ITAsUj45KWJyZWFrfWVsc2UhaiYmbCYmIWkmJjQ+UiYmND5TJiZvPjImJihrWzBdfHxjLnByZWxvYWRBZnRlckxvYWQpJiYoa1swXXx8IXAmJihJfHxIfHxHfHxGfHxcImF1dG9cIiE9ZltlXVtoXShjLnNpemVzQXR0cikpKSYmKGk9a1swXXx8ZltlXSk7ZWxzZSBiYShmW2VdKTtpJiYhaiYmYmEoaSl9fSxXPUEoViksWD1mdW5jdGlvbihhKXtyKGEudGFyZ2V0LGMubG9hZGVkQ2xhc3MpLHMoYS50YXJnZXQsYy5sb2FkaW5nQ2xhc3MpLHQoYS50YXJnZXQsWil9LFk9eihYKSxaPWZ1bmN0aW9uKGEpe1koe3RhcmdldDphLnRhcmdldH0pfSwkPWZ1bmN0aW9uKGEsYil7dHJ5e2EuY29udGVudFdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKGIpfWNhdGNoKGMpe2Euc3JjPWJ9fSxfPWZ1bmN0aW9uKGEpe3ZhciBiLGQsZT1hW2hdKGMuc3Jjc2V0QXR0cik7KGI9Yy5jdXN0b21NZWRpYVthW2hdKFwiZGF0YS1tZWRpYVwiKXx8YVtoXShcIm1lZGlhXCIpXSkmJmEuc2V0QXR0cmlidXRlKFwibWVkaWFcIixiKSxlJiZhLnNldEF0dHJpYnV0ZShcInNyY3NldFwiLGUpLGImJihkPWEucGFyZW50Tm9kZSxkLmluc2VydEJlZm9yZShhLmNsb25lTm9kZSgpLGEpLGQucmVtb3ZlQ2hpbGQoYSkpfSxhYT16KGZ1bmN0aW9uKGEsYixkLGUsZil7dmFyIGcsaSxrLGwsbyxxOyhvPXUoYSxcImxhenliZWZvcmV1bnZlaWxcIixiKSkuZGVmYXVsdFByZXZlbnRlZHx8KGUmJihkP3IoYSxjLmF1dG9zaXplc0NsYXNzKTphLnNldEF0dHJpYnV0ZShcInNpemVzXCIsZSkpLGk9YVtoXShjLnNyY3NldEF0dHIpLGc9YVtoXShjLnNyY0F0dHIpLGYmJihrPWEucGFyZW50Tm9kZSxsPWsmJm0udGVzdChrLm5vZGVOYW1lfHxcIlwiKSkscT1iLmZpcmVzTG9hZHx8XCJzcmNcImluIGEmJihpfHxnfHxsKSxvPXt0YXJnZXQ6YX0scSYmKHQoYSxULCEwKSxjbGVhclRpbWVvdXQobiksbj1qKFQsMjUwMCkscihhLGMubG9hZGluZ0NsYXNzKSx0KGEsWiwhMCkpLGwmJnAuY2FsbChrLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic291cmNlXCIpLF8pLGk/YS5zZXRBdHRyaWJ1dGUoXCJzcmNzZXRcIixpKTpnJiYhbCYmKE4udGVzdChhLm5vZGVOYW1lKT8kKGEsZyk6YS5zcmM9ZyksKGl8fGwpJiZ2KGEse3NyYzpnfSkpLHkoZnVuY3Rpb24oKXthLl9sYXp5UmFjZSYmZGVsZXRlIGEuX2xhenlSYWNlLHMoYSxjLmxhenlDbGFzcyksKCFxfHxhLmNvbXBsZXRlKSYmKHE/VChvKTpSLS0sWChvKSl9KX0pLGJhPWZ1bmN0aW9uKGEpe3ZhciBiLGQ9TS50ZXN0KGEubm9kZU5hbWUpLGU9ZCYmKGFbaF0oYy5zaXplc0F0dHIpfHxhW2hdKFwic2l6ZXNcIikpLGY9XCJhdXRvXCI9PWU7KCFmJiZsfHwhZHx8IWEuc3JjJiYhYS5zcmNzZXR8fGEuY29tcGxldGV8fHEoYSxjLmVycm9yQ2xhc3MpKSYmKGI9dShhLFwibGF6eXVudmVpbHJlYWRcIikuZGV0YWlsLGYmJkQudXBkYXRlRWxlbShhLCEwLGEub2Zmc2V0V2lkdGgpLGEuX2xhenlSYWNlPSEwLFIrKyxhYShhLGIsZixlLGQpKX0sY2E9ZnVuY3Rpb24oKXtpZighbCl7aWYoZS5ub3coKS14PDk5OSlyZXR1cm4gdm9pZCBqKGNhLDk5OSk7dmFyIGE9QihmdW5jdGlvbigpe2MubG9hZE1vZGU9MyxXKCl9KTtsPSEwLGMubG9hZE1vZGU9MyxXKCksaShcInNjcm9sbFwiLGZ1bmN0aW9uKCl7Mz09Yy5sb2FkTW9kZSYmKGMubG9hZE1vZGU9MiksYSgpfSwhMCl9fTtyZXR1cm57XzpmdW5jdGlvbigpe3g9ZS5ub3coKSxmPWIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShjLmxhenlDbGFzcyksaz1iLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoYy5sYXp5Q2xhc3MrXCIgXCIrYy5wcmVsb2FkQ2xhc3MpLEw9Yy5oRmFjLGkoXCJzY3JvbGxcIixXLCEwKSxpKFwicmVzaXplXCIsVywhMCksYS5NdXRhdGlvbk9ic2VydmVyP25ldyBNdXRhdGlvbk9ic2VydmVyKFcpLm9ic2VydmUoZCx7Y2hpbGRMaXN0OiEwLHN1YnRyZWU6ITAsYXR0cmlidXRlczohMH0pOihkW2ddKFwiRE9NTm9kZUluc2VydGVkXCIsVywhMCksZFtnXShcIkRPTUF0dHJNb2RpZmllZFwiLFcsITApLHNldEludGVydmFsKFcsOTk5KSksaShcImhhc2hjaGFuZ2VcIixXLCEwKSxbXCJmb2N1c1wiLFwibW91c2VvdmVyXCIsXCJjbGlja1wiLFwibG9hZFwiLFwidHJhbnNpdGlvbmVuZFwiLFwiYW5pbWF0aW9uZW5kXCIsXCJ3ZWJraXRBbmltYXRpb25FbmRcIl0uZm9yRWFjaChmdW5jdGlvbihhKXtiW2ddKGEsVywhMCl9KSwvZCR8XmMvLnRlc3QoYi5yZWFkeVN0YXRlKT9jYSgpOihpKFwibG9hZFwiLGNhKSxiW2ddKFwiRE9NQ29udGVudExvYWRlZFwiLFcpLGooY2EsMmU0KSksZi5sZW5ndGg/VigpOlcoKX0sY2hlY2tFbGVtczpXLHVudmVpbDpiYX19KCksRD1mdW5jdGlvbigpe3ZhciBhLGQ9eihmdW5jdGlvbihhLGIsYyxkKXt2YXIgZSxmLGc7aWYoYS5fbGF6eXNpemVzV2lkdGg9ZCxkKz1cInB4XCIsYS5zZXRBdHRyaWJ1dGUoXCJzaXplc1wiLGQpLG0udGVzdChiLm5vZGVOYW1lfHxcIlwiKSlmb3IoZT1iLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic291cmNlXCIpLGY9MCxnPWUubGVuZ3RoO2c+ZjtmKyspZVtmXS5zZXRBdHRyaWJ1dGUoXCJzaXplc1wiLGQpO2MuZGV0YWlsLmRhdGFBdHRyfHx2KGEsYy5kZXRhaWwpfSksZT1mdW5jdGlvbihhLGIsYyl7dmFyIGUsZj1hLnBhcmVudE5vZGU7ZiYmKGM9eChhLGYsYyksZT11KGEsXCJsYXp5YmVmb3Jlc2l6ZXNcIix7d2lkdGg6YyxkYXRhQXR0cjohIWJ9KSxlLmRlZmF1bHRQcmV2ZW50ZWR8fChjPWUuZGV0YWlsLndpZHRoLGMmJmMhPT1hLl9sYXp5c2l6ZXNXaWR0aCYmZChhLGYsZSxjKSkpfSxmPWZ1bmN0aW9uKCl7dmFyIGIsYz1hLmxlbmd0aDtpZihjKWZvcihiPTA7Yz5iO2IrKyllKGFbYl0pfSxnPUIoZik7cmV0dXJue186ZnVuY3Rpb24oKXthPWIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShjLmF1dG9zaXplc0NsYXNzKSxpKFwicmVzaXplXCIsZyl9LGNoZWNrRWxlbXM6Zyx1cGRhdGVFbGVtOmV9fSgpLEU9ZnVuY3Rpb24oKXtFLml8fChFLmk9ITAsRC5fKCksQy5fKCkpfTtyZXR1cm4gZnVuY3Rpb24oKXt2YXIgYixkPXtsYXp5Q2xhc3M6XCJsYXp5bG9hZFwiLGxvYWRlZENsYXNzOlwibGF6eWxvYWRlZFwiLGxvYWRpbmdDbGFzczpcImxhenlsb2FkaW5nXCIscHJlbG9hZENsYXNzOlwibGF6eXByZWxvYWRcIixlcnJvckNsYXNzOlwibGF6eWVycm9yXCIsYXV0b3NpemVzQ2xhc3M6XCJsYXp5YXV0b3NpemVzXCIsc3JjQXR0cjpcImRhdGEtc3JjXCIsc3Jjc2V0QXR0cjpcImRhdGEtc3Jjc2V0XCIsc2l6ZXNBdHRyOlwiZGF0YS1zaXplc1wiLG1pblNpemU6NDAsY3VzdG9tTWVkaWE6e30saW5pdDohMCxleHBGYWN0b3I6MS41LGhGYWM6LjgsbG9hZE1vZGU6Mn07Yz1hLmxhenlTaXplc0NvbmZpZ3x8YS5sYXp5c2l6ZXNDb25maWd8fHt9O2ZvcihiIGluIGQpYiBpbiBjfHwoY1tiXT1kW2JdKTthLmxhenlTaXplc0NvbmZpZz1jLGooZnVuY3Rpb24oKXtjLmluaXQmJkUoKX0pfSgpLHtjZmc6YyxhdXRvU2l6ZXI6RCxsb2FkZXI6Qyxpbml0OkUsdVA6dixhQzpyLHJDOnMsaEM6cSxmaXJlOnUsZ1c6eCxyQUY6eX19fSk7IiwiKGZ1bmN0aW9uKCQpIHtcbiAgICAkKGRvY3VtZW50KS5mb3VuZGF0aW9uKCk7XG59KShqUXVlcnkpO1xuIl19

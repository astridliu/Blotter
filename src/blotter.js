(function(previousBlotter, _, THREE, Detector, requestAnimationFrame, EventEmitter, GrowingPacker, setImmediate) {

  var root = this;

  var Blotter = root.Blotter = previousBlotter = function (material, options) {
    if (!Detector.webgl) {
    // ### - messaging
      Blotter._Messaging.throwError("Blotter", "device does not support webgl");
    }

    this.Version = "v0.1.0";

    this._texts = [];

    this._textEventBindings = {};

    this._scopes = {};

    this._renderer = new Blotter._Renderer();

    this.init.apply(this, arguments);
  };

  Blotter.prototype = (function () {

    function _rendererUpdated () {
      _.each(this._scopes, _.bind(function (scope) {
        if (scope.playing) {
          scope.update();
        }
      }, this));
    }

    function _updateScopes () {
      _.each(this._scopes, _.bind(function (scope, textId) {
        scope.mappingMaterial = this.
        scope.needsUpdate = true;
      }, this));
    }

    function _update () {
      var buildMapping,
          buildMappingMaterial,
          buildStages;

      buildMapping = function () {
        return function (next) {
          Blotter._MappingBuilder.build(this._texts, _.bind(function (mapping) {
            this._mapping = mapping;
            this._mapping.ratio = this.ratio;
            this._renderer.width = this._mapping.width;
            this._renderer.height = this._mapping.height;

            next();
          }, this));
        };
      };

      buildMappingMaterial = function () {
        return function (next) {
          Blotter._MappingMaterialBuilder.build(this._mapping, this._material, _.bind(function (mappingMaterial) {
            this.mappingMaterial = mappingMaterial;
            this._renderer.material = this.mappingMaterial.shaderMaterial;

            next();
          }, this));
        };
      };

      buildStages = [
        buildMapping(),
        buildMappingMaterial()
      ];

      _(buildStages).reduceRight(_.wrap, _.bind(function () {
        _updateScopes.call(this);

        this.trigger("build");
      }, this))();
    }

    return {

      constructor : Blotter,

      get needsUpdate () { }, // jshint

      set needsUpdate (value) {
        if (value === true) {
          _update.call(this);
        }
      },

      get material () {
        return this._material;
      },

      set material (material) {
        this.setMaterial(material);
      },

      get texts () {
        return this._texts;
      },

      set texts (texts) {
        this.removeTexts(this._texts);
        this.addTexts(texts);
      },

      get imageData () {
        return this._renderer.imageData;
      },

      init : function (material, options) {
        _.defaults(this, options, {
          ratio  : Blotter._CanvasUtils.pixelRatio,
          autobuild : true,
          autostart : true,
          autoplay : true
        });

        this.setMaterial(material);
        this.addTexts(options.texts);

        this._renderer.on("update", _.bind(_rendererUpdated, this));

        if (this.autobuild) {
          this.needsUpdate = true;
        }

        if (this.autostart) {
          this.start();
        }
      },

      start : function () {
        this._renderer.start();
      },

      stop : function () {
        this._renderer.stop();
      },

      teardown : function () {
        this._renderer.teardown();
      },

      setMaterial : function (material) {
        Blotter._Messaging.ensureInstanceOf(material, Blotter.Material, "Blotter.Material", "Blotter.Renderer");

        this._material = material;

        if (this._materialEventBinding) {
          this._materialEventBinding.unsetEventCallbacks();
        }

        this._materialEventBinding = new Blotter._ModelEventBinding(material, {
          update : _.bind(function () {
            _update.call(this);
          }, this)
        });
        material.on("update", this._materialEventBinding.eventCallbacks.update);
      },

      addText : function (text) {
        this.addTexts(text);
      },

      addTexts : function (texts) {
        var filteredTexts = Blotter._TextUtils.filterTexts(texts),
            newTexts = _.difference(filteredTexts, this._texts);

        _.each(newTexts, _.bind(function (text) {
          this._texts.push(text);

          this._textEventBindings[text.id] = new Blotter._ModelEventBinding(text, {
            update : _.bind(function () {
              _update.call(this);
            }, this)
          });
          text.on("update", this._textEventBindings[text.id].eventCallbacks.update);

          this._scopes[text.id] = new Blotter._RenderScope(text, this);
        }, this));
      },

      removeText : function (text) {
        this.removeTexts(text);
      },

      removeTexts : function (texts) {
        var filteredTexts = Blotter._TextUtils.filterTexts(texts),
            removedTexts = _.intersection(this._texts, filteredTexts)

        _.each(removedTexts, _.bind(function (text) {
          this._texts = _.without(this._texts, text);

          this._textEventBindings[text.id].unsetEventCallbacks();

          delete this._textEventBindings[text.id];
          delete this._scopes[text.id];
        }, this));
      },

      forText : function (text) {
        // ### - messaging
        Blotter._Messaging.ensureInstanceOf(text, Blotter.Text, "Blotter.Text", "Blotter.Renderer");

        if (!(this._scopes[text.id])) {
          // ### - messaging
          Blotter._Messaging.logError("Blotter.Renderer", "Blotter.Text object not found in blotter. Set needsUpdate to true.");
          return;
        }

        return this._scopes[text.id];
      },

      boundsForText : function (text) {
        // ### - messaging
        Blotter._Messaging.ensureInstanceOf(text, Blotter.Text, "Blotter.Text", "Blotter.Renderer");

        if (!(this._scopes[text.id])) {
          // ### - messaging
          Blotter._Messaging.logError("Blotter.Renderer", "Blotter.Text object not found in blotter. Set needsUpdate to true.");
          return;
        }

        return this._mapping.boundsForText(text);
      }
    };
  })();

  EventEmitter.prototype.apply(Blotter.prototype);

})(
  this.Blotter, this._, this.THREE, this.Detector, this.requestAnimationFrame, this.EventEmitter, this.GrowingPacker, this.setImmediate
);

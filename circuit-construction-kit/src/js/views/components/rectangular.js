define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');
    
    var PixiView    = require('common/v3/pixi/view');
    var PixiToImage = require('common/v3/pixi/pixi-to-image');
    var Colors      = require('common/colors/colors');
    var Vector2     = require('common/math/vector2');

    var ComponentView = require('views/component');

    var Constants = require('constants');
    var Assets    = require('assets');

    /**
     * A view for any component that can be represented with a rectangular image
     */
    var RectangularComponentView = ComponentView.extend({

        imagePath:     Assets.Images.RESISTOR,
        maskImagePath: Assets.Images.RESISTOR_MASK,

        schematicImagePath:     undefined,
        schematicMaskImagePath: undefined,

        anchorX: 0,
        anchorY: 0.5,

        /**
         * Initializes the new RectangularComponentView.
         */
        initialize: function(options) {
            if (!this.schematicImagePath)
                this.schematicImagePath = this.imagePath;
            if (!this.schematicMaskImagePath)
                this.schematicMaskImagePath = this.maskImagePath;

            // Cached objects
            this._direction = new Vector2();

            ComponentView.prototype.initialize.apply(this, [options]);

            this.listenTo(this.model, 'change:isOnFire', this.updateFlame);
            this.listenTo(this.simulation, 'change:paused', this.updateFlame);
        },

        initComponentGraphics: function() {
            this.texture          = Assets.Texture(this.imagePath);
            this.schematicTexture = Assets.Texture(this.schematicImagePath);

            this.sprite = new PIXI.Sprite(this.texture);
            this.sprite.anchor.x = this.anchorX;
            this.sprite.anchor.y = this.anchorY;

            this.displayObject.addChild(this.sprite);
            
            this.displayObject.buttonMode = true;
            this.displayObject.defaultCursor = 'move';

            this.flame = Assets.createMovieClip(Assets.Animations.FLAME);
            this.flame.anchor.x = 0.5;
            this.flame.anchor.y = 0.65;
            this.flame.x = this.sprite.width / 2;
            this.flame.animationSpeed = 0.25;
            this.flame.visible = false;

            this.effectsLayer.addChild(this.flame);
        },

        initHoverGraphics: function() {
            var mask = this.circuit.get('schematic') ?
                Assets.createSprite(this.schematicMaskImagePath) :
                Assets.createSprite(this.maskImagePath);
            mask.anchor.x = this.anchorX;
            mask.anchor.y = this.anchorY;

            var bounds = mask.getLocalBounds();
            var hoverGraphics = new PIXI.Graphics();
            hoverGraphics.beginFill(this.selectionColor, 1);
            hoverGraphics.drawRect(bounds.x - 7, bounds.y - 7, bounds.width + 14, bounds.height + 14);
            hoverGraphics.endFill();
            hoverGraphics.mask = mask;

            this.hoverLayer.addChild(mask);
            this.hoverLayer.addChild(hoverGraphics);
        },

        junctionsChanged: function() {
            this.updateGraphics();
        },

        updateComponentGraphics: function() {
            this.sprite.texture = this.circuit.get('schematic') ? this.schematicTexture : this.texture;
        },

        updateHoverGraphics: function() {
            this.hoverLayer.removeChildren();
            this.initHoverGraphics();
        },

        /**
         * Updates the model-view-transform and anything that
         *   relies on it.
         */
        updateMVT: function(mvt) {
            ComponentView.prototype.updateMVT.apply(this, arguments);

            this.updateGraphics();
        },

        updateGraphics: function() {
            var modelLength = this.model.getStartPoint().distance(this.model.getEndPoint());
            var viewLength = this.mvt.modelToViewDeltaX(modelLength);
            var imageLength = this.sprite.texture.width;
            var scale = viewLength / imageLength;
            var angle = this._direction.set(this.model.getEndPoint()).sub(this.model.getStartPoint()).angle();

            if (Math.abs(scale) > 1E-4) {
                this.displayObject.scale.x = scale;
                this.displayObject.scale.y = scale;
                
                this.hoverLayer.scale.x = scale;
                this.hoverLayer.scale.y = scale;

                this.effectsLayer.scale.x = scale;
                this.effectsLayer.scale.y = scale;

                var flameScale = this.mvt.modelToViewDeltaX(0.005);
                this.flame.scale.x = (1 / scale) * flameScale;
                this.flame.scale.y = (1 / scale) * flameScale;
            }

            this.setRotation(angle);

            var viewStartPosition = this.mvt.modelToView(this.model.getStartPoint());
            this.setPosition(viewStartPosition.x, viewStartPosition.y);

            this.effectsLayer.visible = !this.circuit.get('schematic');
        },

        updateFlame: function() {
            if (this.model.get('isOnFire') && !this.simulation.get('paused'))
                this.flame.gotoAndPlay((this.flame.totalFrames - 1) * Math.random());
            else
                this.flame.stop();
            
            this.flame.visible = this.model.get('isOnFire');
        },

        setRotation: function(rotation) {
            ComponentView.prototype.setRotation.apply(this, arguments);

            this.flame.rotation = -rotation;
        },

        generateTexture: function() {
            var texture = PIXI.Texture.EMPTY;
            return texture;
        },

        schematicModeChanged: function() {
            this.updateComponentGraphics();
            this.updateHoverGraphics();
            this.updateGraphics();
        }

    });

    return RectangularComponentView;
});
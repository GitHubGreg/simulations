define(function(require) {

    'use strict';

    var Vector2 = require('common/math/vector2');

    var LightBulbView = require('views/energy-user/light-bulb');

    var Assets = require('assets');

    var IncandescentLightBulbView = LightBulbView.extend({

        initImages: function() {
            var straightWire = this.createSpriteWithOffset(Assets.Images.WIRE_BLACK_62,      new Vector2(-0.036, -0.04));
            var curvedWire   = this.createSpriteWithOffset(Assets.Images.WIRE_BLACK_RIGHT,   new Vector2(-0.009, -0.016));
            var baseBack     = this.createSpriteWithOffset(Assets.Images.ELEMENT_BASE_BACK);
            var baseFront    = this.createSpriteWithOffset(Assets.Images.ELEMENT_BASE_FRONT);
            var unlitBulb    = this.createSpriteWithOffset(Assets.Images.INCANDESCENT_2,     new Vector2(0, 0.055));
            var litBulb      = this.createSpriteWithOffset(Assets.Images.INCANDESCENT_ON_3,  new Vector2(0, 0.055));
            this.litBulb = litBulb; // We need to remember this one

            // Fudging
            straightWire.x += 4;

            this.backLayer.addChild(straightWire);
            this.backLayer.addChild(curvedWire);
            this.backLayer.addChild(baseBack);

            // [ then the energy chunks layer ]

            this.frontLayer.addChild(baseFront);
            this.frontLayer.addChild(unlitBulb);
            this.frontLayer.addChild(litBulb);
        },

    });

    return IncandescentLightBulbView;
});
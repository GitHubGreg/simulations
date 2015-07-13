define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');
    
    var PixiView = require('common/pixi/view');
    var Colors   = require('common/colors/colors');
    var Vector2  = require('common/math/vector2');
    var Vector3  = require('common/math/vector3');

    var BatteryToCapacitorsTopWire    = require('models/wire/battery-to-capacitors-top');
    var BatteryToCapacitorsBottomWire = require('models/wire/battery-to-capacitors-bottom');

    var Constants = require('constants');

    /**
     * A view that represents a wire, which consists of one or more wire segments.
     */
    var WireView = PixiView.extend({

        /**
         * Overrides PixiView's initializeDisplayObject function
         */
        initializeDisplayObject: function() {
            this.displayObject = new PIXI.Graphics();
        },

        /**
         * Initializes the new WireView.
         */
        initialize: function(options) {
            this.color = Colors.parseHex('#bbb');

            this._modelStartVec = new Vector3();
            this._modelEndVec   = new Vector3();
            this._viewStartVec  = new Vector2();
            this._viewEndVec    = new Vector2();

            this.listenTo(this.model, 'change:position', this.drawWire);

            this.updateMVT(options.mvt);
        },

        /**
         * Draws the wire
         */
        drawWire: function() {
            var thickness = Math.round(this.mvt.modelToViewDeltaX(this.model.get('thickness')));

            var graphics = this.displayObject;
            graphics.clear();
            graphics.lineStyle(thickness, this.color, 1);

            var modelStart = this._modelStartVec;
            var modelEnd   = this._modelEndVec;
            var viewStart  = this._viewStartVec;
            var viewEnd    = this._viewEndVec;
            
            var segment;
            for (var i = 0; i < this.model.segments.length; i++) {
                segment = this.model.segments.at(i);

                modelStart.set(segment.get('startX'), segment.get('startY'), 0);
                modelEnd.set(segment.get('endX'), segment.get('endY'), 0);

                viewStart.set(this.mvt.modelToView(modelStart));
                viewEnd.set(this.mvt.modelToView(modelEnd));

                graphics.moveTo(viewStart.x, viewStart.y);
                graphics.lineTo(viewEnd.x, viewEnd.y);
            }
        },

        /**
         * Updates the model-view-transform and anything that
         *   relies on it.
         */
        updateMVT: function(mvt) {
            this.mvt = mvt;

            this.drawWire();
        },

        /**
         * Returns the y-value that should be used for sorting. Calculates the
         *   average y for all segment endpoints.
         */
        getYSortValue: function() {
            var y;
            
            if (this.model instanceof BatteryToCapacitorsTopWire)
                y = this.model.getMinY();
            else if (this.model instanceof BatteryToCapacitorsBottomWire)
                y = this.model.getMaxY();
            else
                y = this.model.getAverageY();

            return this.mvt.modelToViewY(y);
        }

    });

    return WireView;
});
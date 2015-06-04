define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');
    
    var PixiView = require('common/pixi/view');
    var Colors   = require('common/colors/colors');
    var Vector2  = require('common/math/vector2');

    var Constants = require('constants');

    var Assets = require('assets');

    /**
     * Draws all the rays coming from points on the source object.
     *   There are three different ray modes and an off mode.
     */
    var RaysView = PixiView.extend({

        /**
         * Initializes the new RaysView.
         */
        initialize: function(options) {
            this.mvt = options.mvt;
            this.simulation = this.model;
            this.lensView = options.lensView;
            this.mode = RaysView.MARGINAL_RAYS
            this.virtualImageVisible = false;
            this.secondPointVisible = false;

            this.virtualRayColor = Colors.parseHex(RaysView.VIRTUAL_RAY_COLOR);
            this.sourcePointColor     = Colors.parseHex(RaysView.POINT_1_COLOR);
            this.targetPointColor     = Colors.parseHex(RaysView.POINT_2_COLOR);

            if (options.lensView === undefined)
                throw 'lensView is a required option for RaysView.';

            // Cached objects
            this._sourcePoint = new Vector2();
            this._targetPoint = new Vector2();

            this.initGraphics();
            this.updateMVT(this.mvt);

            // Listen for changes in the source object
            this.listenTo(this.simulation.sourceObject, 'change:position',    this.drawPoint1Rays);
            this.listenTo(this.simulation.sourceObject, 'change:secondPoint', this.drawPoint2Rays);

            // Listen for changes in the lens
            this.listenTo(this.simulation.lens, 'change:position',    this.drawAllRays);
            this.listenTo(this.simulation.lens, 'change:focalLength', this.drawAllRays);
            this.listenTo(this.simulation.lens, 'change:diameter',    this.drawAllRays);
        },

        /**
         * Initializes all the graphics
         */
        initGraphics: function() {
            this.sourcePointRays = new PIXI.Graphics();
            this.targetPointRays = new PIXI.Graphics();

            this.displayObject.addChild(this.sourcePointRays);
            this.displayObject.addChild(this.targetPointRays);
        },

        /**
         * Draws all the rays according to the current mode.
         */
        drawAllRays: function() {
            this.drawPoint1Rays();
            this.drawPoint2Rays();
        },

        /**
         * Draws the rays coming from the source object's position
         *   according to the current mode.
         */
        drawPoint1Rays: function() {
            this._sourcePoint.set(this.mvt.modelToView(this.simulation.sourceObject.get('position')));
            this._targetPoint.set(this.mvt.modelToView(this.simulation.targetImage.get('position')));
            this.drawRays(this.sourcePointRays, this.sourcePointColor, this._sourcePoint, this._targetPoint);
        },

        /**
         * Draws the rays coming from the source object's second
         *   point according to the current mode.
         */
        drawPoint2Rays: function() {
            if (this.secondPointVisible) {
                this._sourcePoint.set(this.mvt.modelToView(this.simulation.sourceObject.get('secondPoint')));
                this._targetPoint.set(this.mvt.modelToView(this.simulation.targetImage.get('secondPoint')));
                this.drawRays(this.targetPointRays, this.targetPointColor, this._sourcePoint, this._targetPoint);    
            }
            else
                this.targetPointRays.clear();
        },

        /**
         * Draws a specific set of rays onto the specified graphics
         *   object with the specified color from point 1 through
         *   the lens to point 2.
         */
        drawRays: function(graphics, color, sourcePoint, targetPoint) {
            graphics.clear();
            graphics.lineStyle(RaysView.LINE_WIDTH, color, RaysView.LINE_ALPHA);

            var Ax = sourcePoint.x;
            var Ay = sourcePoint.y;

            var Bx = this.mvt.modelToViewX(this.simulation.lens.get('position').x);
            var By = this.mvt.modelToViewY(this.simulation.lens.get('position').y);

            var Cx = targetPoint.x;
            var Cy = targetPoint.y;

            // Radius of lens minus a bit so marginal ray hits inside lens
            var h = this.lensView.displayObject.height / 2 - 5;

            // Length of the ray (enough to go off the screen)
            var R = 1000;

            var topGuideTheta    = Math.atan((Ay - By - h) / (Bx - Ax)) * 180 / Math.PI;
            var bottomGuideTheta = Math.atan((Ay - By + h) / (Bx - Ax)) * 180 / Math.PI;

            // Used to store slope of line towards C
            var m, m1, m2;

            // TODO: make guides

            // Note: Skipping "blur spot" of the algorithm for now because I don't
            //   understand what it does and don't think it's used anymore

            var objectLensDistance = this.getObjectLensDistance();
            var virtualImage = this.simulation.targetImage.isVirtualImage();

            // Draw different rays depending on the mode
            if (this.mode === RaysView.MARGINAL_RAYS && objectLensDistance > 0) {
                if (!virtualImage) {
                    graphics.moveTo(Ax, Ay);
                    graphics.lineTo(Bx, By);
                    // Cannot draw line directly to C since it may be at infinity.
                    m = (Cy - By) / (Cx - Bx);
                    graphics.lineTo(Bx + R, By + (m * R));

                    graphics.moveTo(Ax, Ay);
                    graphics.lineTo(Bx, By + h);
                    m = (Cy - (By + h)) / (Cx - Bx);
                    graphics.lineTo(Bx + R, By + h + (m * R));

                    graphics.moveTo(Ax, Ay);
                    graphics.lineTo(Bx, By - h);
                    m = (Cy - (By - h)) / (Cx - Bx);
                    graphics.lineTo(Bx + R, By - h + (m * R));
                }
                else {
                    graphics.moveTo(Ax, Ay);
                    graphics.lineTo(Bx, By);
                    m = (By - Cy) / (Bx - Cx);
                    graphics.lineTo(Bx + R, By + (m * R));

                    graphics.moveTo(Ax, Ay);
                    graphics.lineTo(Bx, By + h);
                    m = ((By + h) - Cy) / (Bx - Cx);
                    graphics.lineTo(Bx + R, By + h + (m * R));

                    graphics.moveTo(Ax, Ay);
                    graphics.lineTo(Bx, By - h);
                    m = ((By - h) - Cy) / (Bx - Cx);
                    graphics.lineTo(Bx + R, By - h + (m * R));

                    // Draw virtual marginal rays
                    if (this.virtualImageVisible && Cx > -5 * R) {
                        // Last condition needed to prevent problems that occur when image at infinity
                        graphics.lineStyle(RaysView.LINE_WIDTH, this.virtualRayColor, RaysView.LINE_ALPHA);
                        graphics.moveTo(Ax, Ay);
                        graphics.lineTo(Cx, Cy);
                        graphics.moveTo(Bx, By+  h);
                        graphics.lineTo(Cx, Cy);
                        graphics.moveTo(Bx, By - h);
                        graphics.lineTo(Cx, Cy);
                    }
                }
            }
            else if (this.mode === RaysView.PRINCIPAL_RAYS && objectLensDistance > 0) {
                var f = this.mvt.modelToViewDeltaX(this.simulation.lens.get('focalLength'));

                graphics.moveTo(Ax, Ay);
                graphics.lineTo(Bx, By);
                m = (By - Ay) / (Bx - Ax);
                graphics.lineTo(Bx + R, By + (m * R));

                graphics.moveTo(Ax, Ay);
                graphics.lineTo(Bx, Ay);
                m2 = (By - Ay) / f;
                graphics.lineTo(Bx + R, Ay + (m2 * R));

                graphics.moveTo(Ax, Ay);
                m1 = (By - Ay) / (Bx - f - Ax);
                graphics.lineTo(Bx, By + (m1 * f));
                graphics.lineTo(Bx + R, By + (m1 * f));

                // Draw principal virtual rays
                if (this.virtualImageVisible && virtualImage) {
                    graphics.lineStyle(RaysView.LINE_WIDTH, this.virtualRayColor, RaysView.LINE_ALPHA);
                    graphics.moveTo(Ax, Ay);
                    graphics.lineTo(Cx, Cy);
                    graphics.moveTo(Bx, Cy);
                    graphics.lineTo(Cx, Cy);
                    graphics.moveTo(Bx, Ay);
                    graphics.lineTo(Cx, Cy);
                }
            }
            else if (this.mode === RaysView.MANY_RAYS) {
                var N = 25; // Number of rays
                var deltaTheta = 180 / N; // Degrees between adjacent arrays
                var degToRad = Math.PI / 180;
                var bottomTheta = Math.atan((Ay-By-h) / (Bx-Ax)) * 180 / Math.PI;
                var topTheta = Math.atan((Ay-By+h) / (Bx-Ax)) * 180 / Math.PI;
                var bottomSlope = (Ay-By-h) / (Bx-Ax);
                var topSlope = (Ay-By+h) / (Bx-Ax);

                for (var i = 5; i < (N - 5); i++) {
                    m = Math.tan(degToRad * (90 - i * deltaTheta));
                    if (m > bottomSlope && m < topSlope) {
                        graphics.moveTo(Ax, Ay);
                        graphics.lineStyle(RaysView.LINE_WIDTH, color, RaysView.LINE_ALPHA);
                        graphics.lineTo(Bx, Ay - m * (Bx - Ax));
                        m2 = (Cy - (Ay - m * (Bx - Ax))) / (Cx - Bx);
                        graphics.lineTo(Bx + R, Ay - m * (Bx - Ax) + m2 * R);
                        if (Cx < Ax && this.virtualImageVisible && Cx > -5 * R) {
                            graphics.moveTo(Bx, Ay - m * (Bx - Ax));
                            graphics.lineStyle(RaysView.LINE_WIDTH, this.virtualRayColor, 0.6);
                            graphics.lineTo(Cx, Cy);
                        }
                    } 
                    else {
                        graphics.moveTo(Ax, Ay);
                        graphics.lineStyle(RaysView.LINE_WIDTH, color, RaysView.LINE_ALPHA);
                        graphics.lineTo(Ax + R, Ay - m * R);
                    }
                }
            }
        },

        getObjectLensDistance: function() {
            return this.simulation.lens.get('position').x - this.simulation.sourceObject.get('position').x;
        },

        /**
         * Updates the model-view-transform and anything that
         *   relies on it.
         */
        updateMVT: function(mvt) {
            this.mvt = mvt;

            this.drawAllRays();
        },

        /**
         * Sets the mode that dictates what kinds of rays we draw.
         */
        setMode: function(mode) {
            this.mode = mode;
            this.drawAllRays();
        },

        /**
         * Shows rays for second point
         */
        showSecondPoint: function() {
            this.secondPointVisible = true;
            this.drawPoint2Rays();
        },

        hideSecondPoint: function() {
            this.secondPointVisible = false;
            this.drawPoint2Rays();
        },

        showVirtualImage: function() {
            this.virtualImageVisible = true;
            this.drawAllRays();
        },

        hideVirtualImage: function() {
            this.virtualImageVisible = false;
            this.drawAllRays();
        }

    }, Constants.RaysView);

    return RaysView;
});
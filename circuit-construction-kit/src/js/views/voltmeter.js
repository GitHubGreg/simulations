define(function(require) {

    'use strict';

    var SAT  = require('sat');
    var PIXI = require('pixi');
    require('common/v3/pixi/extensions');

    var AppView  = require('common/v3/app/app');
    var PixiView = require('common/v3/pixi/view');
    var Colors   = require('common/colors/colors');
    var Vector2  = require('common/math/vector2');

    var Constants = require('constants');

    var Assets = require('assets');

    var VoltmeterView = PixiView.extend({

        events: {
            'touchstart      .voltmeterContainer': 'dragStart',
            'mousedown       .voltmeterContainer': 'dragStart',
            'touchmove       .voltmeterContainer': 'drag',
            'mousemove       .voltmeterContainer': 'drag',
            'touchend        .voltmeterContainer': 'dragEnd',
            'mouseup         .voltmeterContainer': 'dragEnd',
            'touchendoutside .voltmeterContainer': 'dragEnd',
            'mouseupoutside  .voltmeterContainer': 'dragEnd',

            'touchstart      .redProbe': 'dragRedProbeStart',
            'mousedown       .redProbe': 'dragRedProbeStart',
            'touchmove       .redProbe': 'dragRedProbe',
            'mousemove       .redProbe': 'dragRedProbe',
            'touchend        .redProbe': 'dragRedProbeEnd',
            'mouseup         .redProbe': 'dragRedProbeEnd',
            'touchendoutside .redProbe': 'dragRedProbeEnd',
            'mouseupoutside  .redProbe': 'dragRedProbeEnd',

            'touchstart      .blackProbe': 'dragBlackProbeStart',
            'mousedown       .blackProbe': 'dragBlackProbeStart',
            'touchmove       .blackProbe': 'dragBlackProbe',
            'mousemove       .blackProbe': 'dragBlackProbe',
            'touchend        .blackProbe': 'dragBlackProbeEnd',
            'mouseup         .blackProbe': 'dragBlackProbeEnd',
            'touchendoutside .blackProbe': 'dragBlackProbeEnd',
            'mouseupoutside  .blackProbe': 'dragBlackProbeEnd'
        },

        initialize: function(options) {
            this.mvt = options.mvt;
            this.scene = options.scene;
            this.simulation = options.simulation;

            this.redColor   = Colors.parseHex(VoltmeterView.RED_COLOR);
            this.blackColor = Colors.parseHex(VoltmeterView.BLACK_COLOR);

            this.lastPosition = new PIXI.Point();
            this._probePosition = new Vector2();

            this.initGraphics();
            this.updateMVT(this.mvt);
        },

        initGraphics: function() {
            this.initProbes();
            this.initVoltmeterBrick();
            this.initVoltageLabel();

            this.redProbe.x   = this.voltmeterContainer.x - this.voltmeterContainer.width / 2 - 50;
            this.blackProbe.x = this.voltmeterContainer.x + 50;
            this.redProbe.y = this.blackProbe.y = this.voltmeterContainer.y + 100;
        },

        initVoltmeterBrick: function() {
            this.voltmeterSprite = Assets.createSprite(Assets.Images.VOLTMETER);

            this.voltmeterContainer = new PIXI.DisplayObjectContainer();
            this.voltmeterContainer.buttonMode = true;
            this.voltmeterContainer.defaultCursor = 'move';
            this.voltmeterContainer.addChild(this.voltmeterSprite);

            if (AppView.windowIsShort()) {
                this.voltmeterContainer.x = 600;
                this.voltmeterContainer.y = 230;
            }
            else {
                this.voltmeterContainer.x = 590;
                this.voltmeterContainer.y = 370;
            }

            this.displayObject.addChild(this.voltmeterContainer);
        },

        initVoltageLabel: function() {
            var textStyle = {
                font: '13px Helvetica Neue',
                fill: '#000'
            };

            var voltage = new PIXI.Text('-- V', textStyle);
            voltage.resolution = this.getResolution();
            voltage.anchor.x = 1;
            voltage.anchor.y = 0.37;
            voltage.x = this.voltmeterSprite.width - (0.18 * this.voltmeterSprite.width);
            voltage.y = 0.185 * this.voltmeterSprite.height;

            this.voltmeterContainer.addChild(voltage);
            this.voltageLabel = voltage;
        },

        initProbes: function() {
            this.redWire = new PIXI.Graphics();
            this.blackWire = new PIXI.Graphics();

            this.redProbe   = Assets.createSprite(Assets.Images.VOLTMETER_PROBE_RED);
            this.blackProbe = Assets.createSprite(Assets.Images.VOLTMETER_PROBE_BLACK);

            this.redProbe.anchor.x = this.blackProbe.anchor.x = 0.5;
            this.redProbe.anchor.y = this.blackProbe.anchor.y = 1;

            this.redProbe.buttonMode   = true;
            this.blackProbe.buttonMode = true;
            this.redProbe.defaultCursor   = 'move';
            this.blackProbe.defaultCursor = 'move';

            this.displayObject.addChild(this.redWire);
            this.displayObject.addChild(this.blackWire);
            this.displayObject.addChild(this.redProbe);
            this.displayObject.addChild(this.blackProbe);

            this.redProbePolygon   = (new SAT.Box(new SAT.Vector(0, 0), 1, 1)).toPolygon();
            this.blackProbePolygon = (new SAT.Box(new SAT.Vector(0, 0), 1, 1)).toPolygon();
        },

        drawWires: function() {
            this.drawWire(this.redWire,   this.redColor,   this.redProbe,  -this.voltmeterContainer.width / 5);
            this.drawWire(this.blackWire, this.blackColor, this.blackProbe, this.voltmeterContainer.width / 5);
        },

        drawWire: function(graphics, color, probe, connectionXOffset) {
            var x0 = probe.x;
            var y0 = probe.y;

            var x1 = this.voltmeterContainer.x + this.voltmeterContainer.width / 2 + connectionXOffset;
            var y1 = this.voltmeterContainer.y + this.voltmeterContainer.height * (190 / 202);

            var c1x = x0;
            var c1y = y0 + probe.height * 0.4;

            var c2x = x1;
            var c2y = y1 + probe.height * 0.4;

            graphics.clear();
            graphics.lineStyle(2, color, 1);
            graphics.moveTo(x0, y0);
            graphics.bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1);

            if (graphics.currentPath && graphics.currentPath.shape)
                graphics.currentPath.shape.closed = false;

            graphics.lineStyle(8, color, 1);
            graphics.moveTo(x1, y1);
            graphics.lineTo(x1, y1 + this.voltmeterContainer.height * 0.02);
        },

        updateMVT: function(mvt) {
            this.mvt = mvt;

            var targetProbeHeight = Math.abs(this.mvt.modelToViewDeltaY(VoltmeterView.PROBE_HEIGHT)); // in pixels
            var scale = targetProbeHeight / this.redProbe.texture.height;
            
            this.redProbe.scale.x = this.blackProbe.scale.x = scale;
            this.redProbe.scale.y = this.blackProbe.scale.y = scale;

            this.drawWires();

            this.updateProbePolygon(this.redProbePolygon);
            this.updateProbePolygon(this.blackProbePolygon);
        },

        updateVoltage: function() {
            var redProbePolygon   = this.getPositionedProbePolygon(this.redProbePolygon,   this.redProbe);
            var blackProbePolygon = this.getPositionedProbePolygon(this.blackProbePolygon, this.blackProbe);

            var voltage = this.simulation.circuit.getVoltage(redProbePolygon, blackProbePolygon);
            if (isNaN(voltage))
                this.voltageLabel.text = '-- V';
            else
                this.voltageLabel.text = voltage.toFixed(3) + ' V';
        },

        getPositionedProbePolygon: function(probePolygon, probeSprite) {
            var probePosition = this._probePosition
                .set(probeSprite.x, probeSprite.y)
                .sub(0, probeSprite.height);

            var modelPosition = this.mvt.viewToModel(probePosition);

            probePolygon.pos.x = modelPosition.x * Constants.SAT_SCALE;
            probePolygon.pos.y = modelPosition.y * Constants.SAT_SCALE;

            return probePolygon;
        },

        updateProbePolygon: function(polygon) {
            var thickness = this.mvt.viewToModelDeltaX(this.redProbe.width  * (18 /  75)) * Constants.SAT_SCALE;
            var length    = this.mvt.viewToModelDeltaX(this.redProbe.height * (23 / 202)) * Constants.SAT_SCALE;

            polygon.points[0].x = -thickness / 2;
            polygon.points[0].y = 0;
            polygon.points[1].x = thickness / 2;
            polygon.points[1].y = 0;
            polygon.points[2].x = thickness / 2;
            polygon.points[2].y = length;
            polygon.points[3].x = -thickness / 2;
            polygon.points[3].y = length;

            polygon.setPoints(polygon.points);
        },

        update: function(time, deltaTime) {
            if (this.displayObject.visible)
                this.updateVoltage();
        },

        dragStart: function(event) {
            this.lastPosition.x = event.data.global.x;
            this.lastPosition.y = event.data.global.y;

            this.dragging = true;
        },

        drag: function(event) {
            if (this.dragging) {
                var dx = event.data.global.x - this.lastPosition.x;
                var dy = event.data.global.y - this.lastPosition.y;

                this.voltmeterContainer.x += dx;
                this.voltmeterContainer.y += dy;

                this.drawWires();

                this.lastPosition.x = event.data.global.x;
                this.lastPosition.y = event.data.global.y;
            }
        },

        dragEnd: function(event) {
            this.dragging = false;
        },

        dragRedProbeStart: function(event) {
            this.lastPosition.x = event.data.global.x;
            this.lastPosition.y = event.data.global.y;

            this.draggingRedProbe = true;
        },

        dragRedProbe: function(event) {
            if (this.draggingRedProbe) {
                var dx = event.data.global.x - this.lastPosition.x;
                var dy = event.data.global.y - this.lastPosition.y;

                this.redProbe.x += dx;
                this.redProbe.y += dy;

                this.drawWires();
                // this.updateProbePolygon(this.redProbe,   this.redProbePolygon);

                this.lastPosition.x = event.data.global.x;
                this.lastPosition.y = event.data.global.y;
            }
        },

        dragRedProbeEnd: function(event) {
            this.draggingRedProbe = false;
        },

        dragBlackProbeStart: function(event) {
            this.lastPosition.x = event.data.global.x;
            this.lastPosition.y = event.data.global.y;

            this.draggingBlackProbe = true;
        },

        dragBlackProbe: function(event) {
            if (this.draggingBlackProbe) {
                var dx = event.data.global.x - this.lastPosition.x;
                var dy = event.data.global.y - this.lastPosition.y;

                this.blackProbe.x += dx;
                this.blackProbe.y += dy;

                this.drawWires();
                // this.updateProbePolygon(this.blackProbe, this.blackProbePolygon);

                this.lastPosition.x = event.data.global.x;
                this.lastPosition.y = event.data.global.y;
            }
        },

        dragBlackProbeEnd: function(event) {
            this.draggingBlackProbe = false;
        },

        show: function() {
            this.displayObject.visible = true;
        },

        hide: function() {
            this.displayObject.visible = false;
        },

        setPosition: function(x, y) {
            this.voltmeterContainer.x = x;
            this.voltmeterContainer.y = y;
            this.drawWires();
        },

        setRedProbePosition: function(x, y) {
            this.redProbe.x = x;
            this.redProbe.y = y;
            this.drawWires();
        },

        setBlackProbePosition: function(x, y) {
            this.blackProbe.x = x;
            this.blackProbe.y = y;
            this.drawWires();
        }

    }, Constants.VoltmeterView);

    return VoltmeterView;
});

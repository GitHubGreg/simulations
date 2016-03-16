define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');

                         require('common/v3/pixi/extensions');
                         require('common/v3/pixi/draw-stick-arrow');
                         require('common/v3/pixi/dash-to');
    var AppView        = require('common/v3/app/app');
    var PixiView       = require('common/v3/pixi/view');
    var Colors         = require('common/colors/colors');
    var PiecewiseCurve = require('common/math/piecewise-curve');

    var HalfLifeInfo = require('models/half-life-info');
    var NucleusType  = require('models/nucleus-type');

    var Constants = require('constants');
    var HALF_LIFE_LINE_COLOR = Colors.parseHex(Constants.NucleusDecayChart.HALF_LIFE_LINE_COLOR);
    var HALF_LIFE_LINE_WIDTH = Constants.NucleusDecayChart.HALF_LIFE_LINE_WIDTH;
    var HALF_LIFE_LINE_ALPHA = Constants.NucleusDecayChart.HALF_LIFE_LINE_ALPHA;

    /**
     * A panel that contains a chart showing the timeline for decay of nuclei over time.
     */
    var NucleusDecayChart = PixiView.extend({

        events: {
            
        },

        /**
         * Initializes the new NucleusDecayChart.
         */
        initialize: function(options) {
            options = _.extend({
                height: 130,
                paddingLeft: 220, // Number of pixels on the left before the chart starts
                paddingBottom: 46,
                paddingRight: 15,
                paddingTop: 15,
                bgColor: '#FF9797',
                bgAlpha: 1,

                xAxisLabelText: 'Time (yrs)',
                yAxisLabelText: 'Isotope',

                timeSpan: NucleusDecayChart.DEFAULT_TIME_SPAN
            }, options);

            // Required options
            this.simulation = options.simulation;
            this.width = options.width;

            // Optional options
            this.height         = options.height;
            this.paddingLeft    = options.paddingLeft;
            this.paddingBottom  = options.paddingBottom;
            this.paddingRight   = options.paddingRight;
            this.paddingTop     = options.paddingTop;
            this.graphWidth     = this.width - this.paddingLeft - this.paddingRight;
            this.graphHeight    = this.height - this.paddingTop - this.paddingBottom;
            this.graphOriginX   = this.paddingLeft;
            this.graphOriginY   = this.height - this.paddingBottom;
            this.bgColor        = Colors.parseHex(options.bgColor);
            this.bgAlpha        = options.bgAlpha;
            this.xAxisLabelText = options.xAxisLabelText;
            this.yAxisLabelText = options.yAxisLabelText;

            this.axisLineColor = Colors.parseHex(NucleusDecayChart.AXIS_LINE_COLOR);
            this.tickColor     = Colors.parseHex(NucleusDecayChart.TICK_MARK_COLOR);

            // Initialize the graphics
            this.initGraphics();

            this.updateTimeSpan();
        },

        /**
         * Initializes everything for rendering graphics
         */
        initGraphics: function() {
            if (AppView.windowIsShort()) {
                this.displayObject.x = 12;
                this.displayObject.y = 12;
            }
            else {
                this.displayObject.x = 20;
                this.displayObject.y = 20;
            }

            this.initMVT();
            this.initPanel();
            this.initXAxis();
            this.initYAxis();
            this.initHalfLifeBar();
        },

        initMVT: function() {
            // Creates an MVT that will scale the nucleus graphics
        },

        initPanel: function() {
            // Draw the shadow
            var outline = new PiecewiseCurve()
                .moveTo(0, 0)
                .lineTo(this.width, 0)
                .lineTo(this.width, this.height)
                .lineTo(0, this.height)
                .close();

            var drawStyle = {
                lineWidth: 11,
                strokeStyle: 'rgba(0,0,0,0)',
                shadowBlur: 11,
                fillStyle: 'rgba(0,0,0,1)'
            };

            var shadow = PIXI.Sprite.fromPiecewiseCurve(outline, drawStyle);
            shadow.alpha = 0.25;
            this.displayObject.addChild(shadow);

            // Draw the panel
            var graphics = new PIXI.Graphics();
            graphics.beginFill(this.bgColor, this.bgAlpha);
            graphics.drawRect(0, 0, this.width, this.height);
            graphics.endFill();

            this.displayObject.addChild(graphics);
        },

        initXAxis: function() {
            // Draw axis line
            var axisLine = new PIXI.Graphics();
            axisLine.lineStyle(NucleusDecayChart.AXIS_LINE_WIDTH, this.axisLineColor, 1);
            axisLine.drawStickArrow(
                this.graphOriginX,                   this.graphOriginY,
                this.graphOriginX + this.graphWidth, this.graphOriginY,
                8, 6
            );

            // Create axis label
            var label = new PIXI.Text(this.xAxisLabelText, {
                font: Constants.NucleusDecayChart.AXIS_LABEL_FONT,
                fill: Constants.NucleusDecayChart.AXIS_LABEL_COLOR
            });
            label.resolution = this.getResolution();
            label.x = this.graphOriginX;
            label.y = this.graphOriginY + 14;
            this.xAxisLabel = label;

            // Create ticks
            this.xAxisTicks = new PIXI.Graphics();
            this.xAxisTickLabels = new PIXI.Container();

            // Add everything
            this.displayObject.addChild(axisLine);
            this.displayObject.addChild(this.xAxisTicks);
            this.displayObject.addChild(this.xAxisTickLabels);
            this.displayObject.addChild(label);
        },

        initYAxis: function() {

        },

        /**
         * Initializes the vertical line that illustrates where the half-life is on the timeline
         */
        initHalfLifeBar: function() {
            var height = this.graphHeight + 16;

            this.halfLifeMarker = new PIXI.Graphics();
            this.halfLifeMarker.lineStyle(HALF_LIFE_LINE_WIDTH, HALF_LIFE_LINE_COLOR, HALF_LIFE_LINE_ALPHA);
            this.halfLifeMarker.moveTo(0, 0);
            this.halfLifeMarker.dashTo(0, height, NucleusDecayChart.HALF_LIFE_LINE_DASHES);
            this.halfLifeMarker.y = this.paddingTop;

            var text = new PIXI.Text('Half Life', {
                font: Constants.NucleusDecayChart.HALF_LIFE_TEXT_FONT,
                fill: Constants.NucleusDecayChart.HALF_LIFE_TEXT_COLOR
            });
            text.resolution = this.getResolution();
            text.alpha = NucleusDecayChart.HALF_LIFE_TEXT_ALPHA;
            text.anchor.x = 0.5;
            text.y = height;

            this.halfLifeMarker.addChild(text);

            this.displayObject.addChild(this.halfLifeMarker);
        },

        drawXAxisTicks: function() {
            this.xAxisTicks.clear();
            this.xAxisTicks.lineStyle(NucleusDecayChart.TICK_MARK_WIDTH, this.tickColor, 1);
            this.xAxisTickLabels.removeChildren();

            var numTickMarks;
            var i;

            if (this.timeSpan < 10000) {
                // Tick marks are 1 second apart.
                numTickMarks = Math.floor(this.timeSpan / 1000 + 1);

                for (i = 0; i < numTickMarks; i++)
                    this.drawXAxisTick(i * 1000, '' + i);
            }
            else if (this.timeSpan < HalfLifeInfo.convertYearsToMs(100)) {
                // Tick marks are 10 yrs apart.
                numTickMarks = Math.floor(this.timeSpan / HalfLifeInfo.convertYearsToMs(10) + 1);

                for (i = 0; i < numTickMarks; i++)
                    this.drawXAxisTick(i * HalfLifeInfo.convertYearsToMs(10), '' + i * 10);
            }
            else if (this.timeSpan < HalfLifeInfo.convertYearsToMs(1E9)) {
                // Tick marks are 5000 yrs apart.  This is generally used for
                //   the Carbon 14 range.
                numTickMarks = Math.floor(this.timeSpan / HalfLifeInfo.convertYearsToMs(5000) + 1);

                for (i = 0; i < numTickMarks; i++)
                    this.drawXAxisTick(i * HalfLifeInfo.convertYearsToMs(5000), '' + i * 5000);
            }
            else {
                // Space the tick marks four billion years apart.
                numTickMarks = Math.floor(this.timeSpan / HalfLifeInfo.convertYearsToMs(4E9) + 1);

                for (i = 0; i < numTickMarks; i++)
                    this.drawXAxisTick(i * HalfLifeInfo.convertYearsToMs(4E9), (i * 4).toFixed(1));
            }
        },

        drawXAxisTick: function(time, labelText) {
            var timeZeroPosX = this.paddingLeft + (NucleusDecayChart.TIME_ZERO_OFFSET_PROPORTION * this.timeSpan * this.msToPixelsFactor);
            var y = this.height - this.paddingBottom;
            var x = timeZeroPosX + (time * this.msToPixelsFactor);
            var length = NucleusDecayChart.TICK_MARK_LENGTH;
            
            this.xAxisTicks.moveTo(x, y);
            this.xAxisTicks.lineTo(x, y - length);

            var label = new PIXI.Text(labelText, {
                font: NucleusDecayChart.SMALL_LABEL_FONT,
                fill: this.tickColor
            });

            label.x = x;
            label.y = y;
            label.anchor.x = 0.5;
            label.anchor.y = 0;
            label.resolution = this.getResolution();

            this.xAxisTickLabels.addChild(label);
        },

        update: function() {
            this.drawXAxisTicks();
            this.updateHalfLifeMarker();
        },

        /**
         * Position the half life marker on the chart based on the values of the
         *   half life for the nucleus in the model.
         */
        updateHalfLifeMarker: function() {
            // Position the marker for the half life.
            var halfLife = this.simulation.get('halfLife');
            var halfLifeMarkerX = 0;

            if (this.getExponentialMode()) {
                if (halfLife == Number.POSITIVE_INFINITY) {
                    halfLifeMarkerX = this.graphOriginX + this.graphWidth;
                }
                else {
                    // halfLifeMarkerX = _exponentialTimeLine.mapTimeToHorizPixels( halfLife ) + _graphOriginX +
                    //                      ( TIME_ZERO_OFFSET * _msToPixelsFactor );
                    // halfLifeMarkerX = Math.min( halfLifeMarkerX, _xAxisOfGraph.getFullBoundsReference().getMaxX() );
                }
            }
            else {
                halfLifeMarkerX = this.graphOriginX + (NucleusDecayChart.TIME_ZERO_OFFSET_PROPORTION * this.timeSpan + halfLife) * this.msToPixelsFactor;
            }

            this.halfLifeMarker.x = halfLifeMarkerX;

            // Position the textual label for the half life.
            // _halfLifeLabel.setOffset( _halfLifeMarkerLine.getX() - ( _halfLifeLabel.getFullBoundsReference().width / 2 ),
            //                           (float) ( _graphOriginY + ( ( _usableHeight - _graphOriginY ) * 0.5 ) ) );

            // Hide the x axis label if there is overlap with the half life label.
            // if ( _xAxisLabel.getFullBoundsReference().intersects( _halfLifeLabel.getFullBoundsReference() ) ) {
            //     _xAxisLabel.setVisible( false );
            // }
            // else {
            //     _xAxisLabel.setVisible( true );
            // }

            // Position the infinity marker, set its scale, and set its visibility.
            // _halfLifeInfinityText.setScale( 1 );
            // if ( _halfLifeMarkerLine.getFullBoundsReference().height > 0 &&
            //      _halfLifeInfinityText.getFullBoundsReference().height > 0 ) {

            //     // Tweak the multiplier on the following line as needed.
            //     double desiredHeight = _halfLifeMarkerLine.getFullBoundsReference().height * 0.7;

            //     _halfLifeInfinityText.setScale( desiredHeight / _halfLifeInfinityText.getFullBoundsReference().height );
            // }

            // _halfLifeInfinityText.setOffset(
            //         _halfLifeMarkerLine.getX() - _halfLifeInfinityText.getFullBoundsReference().width,
            //         _halfLifeMarkerLine.getFullBoundsReference().getMinY() -
            //         _halfLifeInfinityText.getFullBoundsReference().height * 0.4 );

            // _halfLifeInfinityText.setVisible( _model.getHalfLife() == Double.POSITIVE_INFINITY );
        },

        updateTimeSpan: function() {
            var nucleusType = this.simulation.get('nucleusType');

            // Set the time span of the chart based on the nucleus type.
            switch (nucleusType) {
                case NucleusType.HEAVY_CUSTOM:
                    this.setTimeSpan(5000); // Set the chart for five seconds of real time.
                    break;
                case NucleusType.CARBON_14:
                    this.setTimeSpan(HalfLifeInfo.getHalfLifeForNucleusType(nucleusType) * 2.6);
                    break;
                case NucleusType.HYDROGEN_3:
                    this.setTimeSpan(HalfLifeInfo.getHalfLifeForNucleusType(nucleusType) * 3.2);
                    break;
                default:
                    this.setTimeSpan(HalfLifeInfo.getHalfLifeForNucleusType(nucleusType) * 2.5);
                    break;
            }
        },

        setTimeSpan: function(timeSpan) {
            this.timeSpan = timeSpan;
            this.msToPixelsFactor = ((this.width - this.paddingLeft - this.paddingRight) * 0.98) / this.timeSpan;
            this.update();
        },

        getExponentialMode: function() {
            return (this.simulation.get('nucleusType') === NucleusType.HEAVY_CUSTOM);
        }

    }, Constants.NucleusDecayChart);


    return NucleusDecayChart;
});
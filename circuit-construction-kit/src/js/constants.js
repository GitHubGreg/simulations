define(function (require) {

    'use strict';

    var Vector2 = require('common/math/vector2');

    var Dimension = function(width, height) {
        this.width = width;
        this.height = height;
    };

    var Constants = {}; 

    /*************************************************************************
     **                                                                     **
     **                         UNIVERSAL CONSTANTS                         **
     **                                                                     **
     *************************************************************************/

    var aspectRatio = 1.2;
    var SCALE = 0.5;
    var modelWidth = 10;
    var modelHeight = modelWidth / aspectRatio;
    var modelBounds = new Rectangle(0, 0, modelWidth, modelHeight);
    var switchscale = 1.45;
    var bulbLength = 1;
    var bulbHeight = 1.5;
    var bulbDistJ = 0.39333;
    var bulbScale = 1.9;
    Constants.ELECTRON_DX = 0.56 * SCALE;
	Constants.RESISTOR_DIMENSION       = new Dimension(1.3 * SCALE, .6 * SCALE);
	Constants.CAP_DIM                  = new Dimension(1.8 * SCALE, .6 * SCALE);
	Constants.AC_DIM                   = new Dimension(1.3 * SCALE, .6 * SCALE);
	Constants.SWITCH_DIMENSION         = new Dimension(1.5 * SCALE * switchscale, 0.8 * SCALE * switchscale);
	Constants.LEVER_DIMENSION          = new Dimension(1.0 * SCALE * switchscale, 0.5 * SCALE * switchscale);
	Constants.BATTERY_DIMENSION        = new Dimension(1.9 * SCALE, 0.7 * SCALE);
	Constants.SERIES_AMMETER_DIMENSION = new Dimension(2.33 * SCALE, 0.92 * SCALE);
	Constants.INDUCTOR_DIM             = new Dimension(2.5 * SCALE, 0.6 * SCALE);
	Constants.BULB_DIMENSION           = new Dimension(bulbLength * SCALE * bulbScale, bulbHeight * SCALE * bulbScale);
	Constants.BULB_DISTANCE_BETWEEN_JUNCTIONS = bulbDistJ * SCALE * bulbScale
    Constants.WIRE_LENGTH = Constants.BATTERY_DIMENSION.getLength() * 1.2;
    Constants.JUNCTION_GRAPHIC_STROKE_WIDTH = 0.015;
    Constants.JUNCTION_RADIUS = 0.162;
    Constants.MIN_RESISTANCE = 1E-8;
    Constants.SCH_BULB_DIST = 1;


    return Constants;
});

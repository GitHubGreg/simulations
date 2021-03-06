define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');

                           require('common/v3/pixi/create-drop-shadow');
                           require('common/v3/pixi/draw-stick-arrow');
                           require('common/v3/pixi/draw-arrow');
    var PixiView         = require('common/v3/pixi/view');
    var Colors           = require('common/colors/colors');
    var WavelengthColors = require('common/colors/wavelength');
    var Rectangle        = require('common/math/rectangle');
    var Functions        = require('common/math/functions');
    var PhysicsUtil      = require('common/quantum/models/physics-util');

    var EnergyLevelView = require('views/energy-level');
    var AtomView        = require('views/atom');

    var Constants = require('constants');

    /**
     * 
     */
    var EnergyLevelPanelView = PixiView.extend({

        width: 300,
        height: 200,

        /**
         * Initializes the new EnergyLevelPanelView.
         */
        initialize: function(options) {
            options = _.extend({
                padding: 15,
                bgColor: '#f5f5f5',
                bgAlpha: 0.75,
                axisLineColor: '#000',
                axisLineAlpha: 1,

                averagingPeriod: 0
            }, options);

            // Required options
            this.simulation = options.simulation;

            // Optional options
            this.padding = options.padding;
            this.bgColor = Colors.parseHex(options.bgColor);
            this.bgAlpha = options.bgAlpha;
            this.axisLineColor = Colors.parseHex(options.axisLineColor);
            this.axisLineAlpha = options.axisLineAlpha;
            this.averagingPeriod = options.averagingPeriod;

            this.energyLevelViews = [];

            // Init graph parameters
            this.minY = this.padding + 16;
            this.maxY = this.height - this.padding - 10;
            this.atomDiameter = 10;
            this.squiggleAmplitude = this.atomDiameter; // Amplitude of the squiggle waves

            var groundStateEnergy = this.simulation.getGroundState().getEnergyLevel();
            this.energyToY = Functions.createLinearFunction(
                groundStateEnergy + PhysicsUtil.wavelengthToEnergy(WavelengthColors.MIN_WAVELENGTH),
                groundStateEnergy,
                this.minY,
                this.maxY
            );

            this.atomCounts = [0, 0, 0];
            this.numAtomsInLevel = [0, 0, 0];
            this.numUpdatesToAverage = 0;
            this.timeSinceLastUpdate = 0;

            // Initialize the graphics
            this.initGraphics();

            this.listenTo(this.simulation, 'atomic-states-changed', this.energyLevelsChanged);
            this.listenTo(this.simulation.seedBeam,    'change:wavelength change:photonsPerSecond', this.beamChanged);
            this.listenTo(this.simulation.pumpingBeam, 'change:wavelength change:photonsPerSecond', this.beamChanged);
            this.listenTo(this.simulation.seedBeam,    'change:enabled', this.seedBeamEnabledChanged);
            this.listenTo(this.simulation.pumpingBeam, 'change:enabled', this.pumpingBeamEnabledChanged);
        },

        /**
         * Initializes everything for rendering graphics
         */
        initGraphics: function() {
            this.initPanel();
            this.initAxis();
            this.initAtoms();
            this.initSquiggles();
            this.drawSquiggles();
            this.initHelpLabels();

            this.energyLevelsLayer = new PIXI.Container();
            this.displayObject.addChild(this.energyLevelsLayer);

            this.createEnergyLevels();
        },

        initPanel: function() {
            // Draw the shadow
            var rectangle = new Rectangle(0, 0, this.width, this.height);
            var shadow = PIXI.createDropShadow(rectangle);
            this.displayObject.addChild(shadow);

            // Draw the panel
            var graphics = new PIXI.Graphics();
            graphics.beginFill(this.bgColor, this.bgAlpha);
            graphics.drawRect(0, 0, this.width, this.height);
            graphics.endFill();

            this.displayObject.addChild(graphics);
        },

        initAxis: function() {
            var labelWidth = 15;
            var x = this.padding + labelWidth;
            var y0 = this.height - this.padding;
            var y1 = this.padding;
            var graphics = new PIXI.Graphics();
            graphics.lineStyle(2, this.axisLineColor, this.axisLineAlpha);
            graphics.drawStickArrow(x, y0, x, y1, 12, 10);

            var text = new PIXI.Text('Energy (eV)', {
                font: 'bold 12px Helvetica Neue',
                fill: '#000'
            });
            text.resolution = this.getResolution();
            text.rotation = -Math.PI / 2;
            text.anchor.y = 0;
            text.anchor.x = 0.5;
            text.x = this.padding - 5;
            text.y = this.height / 2;

            this.displayObject.addChild(graphics);
            this.displayObject.addChild(text);

            this.axisOriginX = x;
        },

        initAtoms: function() {
            this.atomSprites = [];
            var scale = this.atomDiameter / AtomView.getTextureWidth();
            
            for (var i = 0; i < this.simulation.atoms.length; i++) {
                var sprite = AtomView.createSprite();
                sprite.anchor.x = 0;
                sprite.anchor.y = 1;
                sprite.scale.x = scale;
                sprite.scale.y = scale;

                this.atomSprites.push(sprite);
                this.displayObject.addChild(sprite);
            }
        },

        initSquiggles: function() {
            this.seedSquiggle = new PIXI.Graphics();
            this.pumpSquiggle = new PIXI.Graphics();

            this.seedSquiggle.x = this.axisOriginX + this.squiggleAmplitude * 2;
            this.pumpSquiggle.x = this.axisOriginX + this.squiggleAmplitude;
            this.seedSquiggle.y = this.maxY;
            this.pumpSquiggle.y = this.maxY;
            this.seedSquiggle.rotation = -Math.PI / 2;
            this.pumpSquiggle.rotation = -Math.PI / 2;

            this.displayObject.addChild(this.seedSquiggle);
            this.displayObject.addChild(this.pumpSquiggle);

            this.seedBeamEnabledChanged(null, this.simulation.seedBeam.get('enabled'));
            this.pumpingBeamEnabledChanged(null, this.simulation.pumpingBeam.get('enabled'));
        },

        initHelpLabels: function() {
            var settings = {
                font: 'bold 12px Helvetica Neue',
                fill: '#000'
            };

            var text1 = new PIXI.Text('Energy level can be\nadjusted up and\ndown by dragging', settings);
            text1.resolution = this.getResolution();
            text1.x = this.axisOriginX + 10;
            text1.y = this.padding + 20;

            var text2 = new PIXI.Text('Slider adjusts\nlifetime of\nenergy state', settings);
            text2.resolution = this.getResolution();
            text2.x = this.axisOriginX + 180;
            text2.y = this.padding + 100;

            this.helpLayer = new PIXI.Container();
            this.helpLayer.addChild(text1);
            this.helpLayer.addChild(text2);

            this.displayObject.addChild(this.helpLayer);

            this.hideHelp();
        },

        drawSquiggles: function() {
            this.drawSquiggle(this.seedSquiggle, this.simulation.seedBeam);
            this.drawSquiggle(this.pumpSquiggle, this.simulation.pumpingBeam);
        },

        drawSquiggle: function(graphics, beam) {
            // Calculate all our rendering variables
            var wavelength = beam.get('wavelength')
            var color = Colors.parseHex(WavelengthColors.nmToHex(wavelength));
            var beamEnergy = PhysicsUtil.wavelengthToEnergy(wavelength);
            var groundStateEnergy = this.simulation.getGroundState().getEnergyLevel();
            var y0 = this.energyToY(groundStateEnergy);
            var y1 = this.energyToY(groundStateEnergy + beamEnergy);
            var length = y0 - y1;
            var amp = this.squiggleAmplitude;
            var intensity = beam.get('photonsPerSecond') / beam.get('maxPhotonsPerSecond');
            var alpha = Math.sqrt(intensity);
            var arrowHeight = amp;
            // So that the tip of the arrow will just touch an energy level line when it is supposed to
            //   match the line, we need to subtract 1 from the length of the squiggle
            var actualLength = length - 1;

            graphics.clear();
            graphics.lineStyle(1, color, alpha);

            // Draw squiggle
            var phaseAngle = 0;
            var freqFactor = 15 * wavelength / 680;

            for (var i = 0; i <= actualLength - arrowHeight * 2; i++) {
                var k = Math.floor(Math.sin(phaseAngle + i * Math.PI * 2 / freqFactor) * amp / 2 + amp / 2);
                for (var j = 0; j < amp; j++) {
                    if (j === k) {
                        if (i === 0)
                            graphics.moveTo(i + arrowHeight, k);
                        else
                            graphics.lineTo(i + arrowHeight, k);
                    }
                }
            }

            // Draw arrows
            graphics.lineStyle(0, 0, 0);
            graphics.beginFill(color, alpha);

            var tailWidth = 2;
            var headWidth = amp * 1.2;
            graphics.drawArrow(arrowHeight, amp / 2, 0, amp / 2, tailWidth, headWidth, arrowHeight);
            graphics.drawArrow(actualLength - arrowHeight, amp / 2, actualLength, amp / 2, tailWidth, headWidth, arrowHeight);

            graphics.endFill();
        },

        createEnergyLevels: function() {
            // Remove old ones
            for (var j = this.energyLevelViews.length - 1; j >= 0; j--) {
                this.stopListening(this.energyLevelViews[j].model);
                this.energyLevelViews[j].remove();
                this.energyLevelViews.splice(j, 1);
            }

            var x = this.axisOriginX + 10;
            var width = this.width - x - this.padding;

            var states = this.simulation.getStates();
            for (var i = 0; i < states.length; i++) {
                // Set the minimum lifetime to be two clock ticks, so we will always see an energy halo.
                var minLifetime = Constants.DT * 2;
                var maxLifetime = (i === 1) ? Constants.MAXIMUM_STATE_LIFETIME : Constants.MAXIMUM_STATE_LIFETIME / 4;
                if (i > 0)
                    states[i].set('meanLifetime', maxLifetime);

                var energyLevelView = new EnergyLevelView({
                    simulation: this.simulation,
                    model: states[i],
                    groundState: states[0],
                    highestEnergyState: states[states.length - 1],
                    energyToY: this.energyToY,
                    minY: this.minY,
                    maxY: this.maxY,
                    width: width,
                    levelNumber: i + 1,
                    wavelengthChangeEnabled: (i > 0),
                    lifetimeChangeEnabled: (i > 0),
                    minLifetime: minLifetime,
                    maxLifetime: maxLifetime
                });
                energyLevelView.displayObject.x = x;

                this.listenTo(states[i], 'change:energyLevel', this.energyLevelChanged);

                this.energyLevelViews.push(energyLevelView);
                this.energyLevelsLayer.addChild(energyLevelView.displayObject);
            }

            for (var k = 0; k < states.length; k++)
                this.energyLevelChanged(states[k], states[k].get('energyLevel'));
        },

        update: function(time, deltaTime, paused) {
            this.updateAtomCounts(time, deltaTime, paused);
        },

        updateAtomCounts: function(time, deltaTime, paused) {
            this.atomCounts[0] += this.simulation.getNumGroundStateAtoms();
            this.atomCounts[1] += this.simulation.getNumMiddleStateAtoms();
            this.atomCounts[2] += this.simulation.getNumHighStateAtoms();

            this.numUpdatesToAverage++;
            this.timeSinceLastUpdate += deltaTime;
            if (this.timeSinceLastUpdate >= this.averagingPeriod) {
                // Compute the average number of atoms in each state. Take care to round off rather than truncate.
                this.numAtomsInLevel[0] = Math.floor(0.5 + this.atomCounts[0] / this.numUpdatesToAverage);
                this.numAtomsInLevel[1] = Math.floor(0.5 + this.atomCounts[1] / this.numUpdatesToAverage);
                this.numAtomsInLevel[2] = Math.floor(0.5 + this.atomCounts[2] / this.numUpdatesToAverage);
                this.atomCounts[0] = 0;
                this.atomCounts[1] = 0;
                this.atomCounts[2] = 0;
                this.numUpdatesToAverage = 0;
                this.timeSinceLastUpdate = 0;
                
                // Move atoms
                var currentLevelCount;
                var currentLevel = 0;
                var offsetX = this.squiggleAmplitude * 2 + 4;
                var width = this.atomDiameter / 2;
                var i = 0;

                while (i < this.atomSprites.length && currentLevel < 3) {
                    currentLevelCount = this.numAtomsInLevel[currentLevel];
                    for (var j = 0; j < currentLevelCount; j++) {
                        var energyLevelX = this.energyLevelViews[currentLevel].displayObject.x;
                        var energyLevelY = this.energyLevelViews[currentLevel].displayObject.y;

                        this.atomSprites[i].x = energyLevelX + offsetX + j * width;
                        this.atomSprites[i].y = energyLevelY - 1;

                        i++;
                    }
                    currentLevel++;
                }
            }
        },

        showHelp: function() {
            this.helpLayer.visible = true;
        },

        hideHelp: function() {
            this.helpLayer.visible = false;
        },

        energyLevelsChanged: function() {
            this.createEnergyLevels();
        },

        beamChanged: function(model, wavelength) {
            if (model === this.simulation.seedBeam)
                this.drawSquiggle(this.seedSquiggle, model);
            else
                this.drawSquiggle(this.pumpSquiggle, model);
        },

        seedBeamEnabledChanged: function(model, enabled) {
            this.seedSquiggle.visible = enabled;
        },

        pumpingBeamEnabledChanged: function(model, enabled) {
            this.pumpSquiggle.visible = enabled;
        },

        energyLevelChanged: function(model, energyLevel) {
            var margin = 20;
            var energyLevelY = this.energyToY(energyLevel);

            for (var i = 0; i < this.energyLevelViews.length; i++) {
                if (this.energyLevelViews[i].model !== model) {
                    if (this.energyLevelViews[i].displayObject.y > energyLevelY)
                        this.energyLevelViews[i].setMinY(Math.max(this.minY, energyLevelY + margin));
                    else
                        this.energyLevelViews[i].setMaxY(Math.min(this.maxY, energyLevelY - margin));
                }
            }
        }

    }, Constants.EnergyLevelPanelView);


    return EnergyLevelPanelView;
});
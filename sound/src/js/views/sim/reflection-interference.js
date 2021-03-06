define(function (require) {

    'use strict';

    var _ = require('underscore');
    var $ = require('jquery');

    var ReflectionInterferenceSimulation = require('models/simulation/reflection-interference');

    var SoundSimView                    = require('views/sim');
    var ReflectionInterferenceSceneView = require('views/scene/reflection-interference');

    var Constants = require('constants');

    var wallControlsHtml = require('text!templates/wall-controls.html');
    var modeControlsHtml = require('text!templates/mode-controls.html');

    /**
     * 
     */
    var ReflectionInterferenceSimView = SoundSimView.extend({

        wallControlsTemplate: _.template(wallControlsHtml),
        modeControlsTemplate: _.template(modeControlsHtml),

        showHelpBtn: false,

        /**
         * Dom event listeners
         */
        events: _.extend({}, SoundSimView.prototype.events, {
            'slide .wall-angle'    : 'changeWallAngle',
            'slide .wall-position' : 'changeWallPosition',

            'click .mode-continuous' : 'changeModeContinuous',
            'click .mode-pulse'      : 'changeModePulse',
            'click .btn-pulse'       : 'pulse'
        }),

        /**
         * Inits simulation, views, and variables.
         *
         * @params options
         */
        initialize: function(options) {
            options = _.extend({
                title: 'Interference by Reflection',
                name: 'reflection-interference',
            }, options);

            SoundSimView.prototype.initialize.apply(this, [options]);
        },

        /**
         * Initializes the Simulation.
         */
        initSimulation: function() {
            this.simulation = new ReflectionInterferenceSimulation();
        },

        /**
         * Initializes the SceneView.
         */
        initSceneView: function() {
            this.sceneView = new ReflectionInterferenceSceneView({
                simulation: this.simulation
            });
        },

        /**
         * Renders page content
         */
        renderScaffolding: function() {
            SoundSimView.prototype.renderScaffolding.apply(this, arguments);

            var data = {
                Constants: Constants,
                unique: this.cid
            };

            // Sound mode controls
            this.$('.sim-controls').append(this.modeControlsTemplate(data));

            // Wall property controls
            this.$('.sim-controls-column').append(this.wallControlsTemplate(data));

            this.$('.sim-controls .wall-angle').noUiSlider({
                start: Constants.DEFAULT_WALL_ANGLE,
                connect: 'lower',
                range: {
                    'min': Constants.MIN_WALL_ANGLE,
                    'max': Constants.MAX_WALL_ANGLE
                }
            });

            this.$('.sim-controls .wall-position').noUiSlider({
                start: Constants.DEFAULT_WALL_POSITION,
                connect: 'lower',
                range: {
                    'min': Constants.MIN_WALL_POSITION,
                    'max': Constants.MAX_WALL_POSITION
                }
            });

            this.$wallAngle    = this.$('.wall-angle-value');
            this.$wallPosition = this.$('.wall-position-value');
        },

        changeModePulse: function() {
            this.simulation.setPulseMode();
            this.$('.btn-pulse').removeAttr('disabled');
        },

        changeModeContinuous: function() {
            this.simulation.setContinuousMode();
            this.$('.btn-pulse').prop('disabled', true);
        },

        pulse: function() {
            this.simulation.pulse();
        },

        changeWallAngle: function(event) {
            var angle = parseInt($(event.target).val());
            this.inputLock(function() {
                this.$wallAngle.html(angle + '&deg;');
                this.sceneView.setReflectionLineAngle(angle);
            });
        },

        changeWallPosition: function(event) {
            var position = parseFloat($(event.target).val());
            this.inputLock(function() {
                this.$wallPosition.html(position.toFixed(1) + 'm');
                this.sceneView.setReflectionLinePosition(position);
            });
        }

    });

    return ReflectionInterferenceSimView;
});

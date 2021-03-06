define(function (require) {

    'use strict';

    var $ = require('jquery');
    var _ = require('underscore');

    var SimView = require('common/v3/app/sim');

    var SoundSimulation = require('models/simulation');
    var SoundSceneView  = require('views/scene');

    var Constants = require('constants');

    require('nouislider');
    require('bootstrap');
    require('bootstrap-select');

    // CSS
    require('less!styles/sim');
    require('less!styles/playback-controls');
    require('less!common/styles/slider');
    require('less!common/styles/radio');
    require('less!bootstrap-select-less');

    // HTML
    var simHtml              = require('text!templates/sim.html');
    var playbackControlsHtml = require('text!templates/playback-controls.html');
    var audioControlsHtml    = require('text!templates/audio-controls.html');

    /**
     * This is the umbrella view for everything in a simulation tab.
     *   It will be extended by both the Intro module and the Charts
     *   and contains all the common functionality between the two.
     */
    var SoundSimView = SimView.extend({

        /**
         * Root element properties
         */
        tagName:   'section',
        className: 'sim-view',

        /**
         * Template for rendering the basic scaffolding
         */
        template: _.template(simHtml),
        playbackControlsTemplate: _.template(playbackControlsHtml),
        audioControlsTemplate: _.template(audioControlsHtml),

        showHelpBtn: true,

        /**
         * Dom event listeners
         */
        events: {
            'click .play-btn'   : 'play',
            'click .pause-btn'  : 'pause',
            'click .step-btn'   : 'step',

            'click .help-btn'   : 'toggleHelp',

            'slide .frequency-slider' : 'changeFrequency',
            'slide .amplitude-slider' : 'changeAmplitude',

            'click .audio-enabled-check' : 'toggleAudioEnabled',
            'click .audio-speaker'       : 'audioSpeakerClicked',
            'click .audio-listener'      : 'audioListenerClicked'
        },

        /**
         * Inits simulation, views, and variables.
         *
         * @params options
         */
        initialize: function(options) {
            options = _.extend({
                title: 'Template Sim',
                name: 'template-sim',
                link: 'sound'
            }, options);

            SimView.prototype.initialize.apply(this, [options]);

            this.initSceneView();

            this.listenTo(this.simulation, 'change:paused', this.pausedChanged);
            this.pausedChanged(this.simulation, this.simulation.get('paused'));
        },

        /**
         * Initializes the Simulation.
         */
        initSimulation: function() {
            this.simulation = new SoundSimulation();
        },

        /**
         * Initializes the SceneView.
         */
        initSceneView: function() {
            this.sceneView = new SoundSceneView({
                simulation: this.simulation
            });
        },

        /**
         * Renders everything
         */
        render: function() {
            this.$el.empty();

            this.renderScaffolding();
            this.renderSceneView();

            return this;
        },

        /**
         * Renders page content
         */
        renderScaffolding: function() {
            var data = {
                Constants: Constants,
                simulation: this.simulation,
                unique: this.cid,
                showHelpBtn: this.showHelpBtn
            };
            this.$el.html(this.template(data));
            this.$el.append(this.playbackControlsTemplate(data));

            this.$('select').selectpicker();

            this.$('.frequency-slider').noUiSlider({
                start: this.simulation.get('frequency'),
                connect: 'lower',
                range: {
                    'min': Constants.MIN_FREQUENCY,
                    'max': Constants.MAX_FREQUENCY
                }
            });

            this.$('.amplitude-slider').noUiSlider({
                start: this.simulation.get('amplitude'),
                connect: 'lower',
                range: {
                    'min': Constants.MIN_AMPLITUDE,
                    'max': Constants.MAX_AMPLITUDE
                }
            });

            this.$frequency = this.$('.frequency-value');
            this.$amplitude = this.$('.amplitude-value');
        },

        /**
         * Appends audio controls to the sim controls panel
         */
        renderAudioControls: function() {
            var data = {
                Constants: Constants,
                simulation: this.simulation,
                unique: this.cid,
                listenerOptions: true
            };
            this.$('.sim-controls').append(this.audioControlsTemplate(data));
        },

        /**
         * Appends audio controls to the sim controls panel
         */
        renderSimpleAudioControls: function() {
            var data = {
                Constants: Constants,
                simulation: this.simulation,
                unique: this.cid,
                listenerOptions: false
            };
            this.$('.sim-controls').append(this.audioControlsTemplate(data));
        },

        /**
         * Renders the scene view
         */
        renderSceneView: function() {
            this.sceneView.render();
            this.$('.scene-view-placeholder').replaceWith(this.sceneView.el);
        },

        /**
         * Called after every component on the page has rendered to make sure
         *   things like widths and heights and offsets are correct.
         */
        postRender: function() {
            this.sceneView.postRender();
            this.$('.scene-background').after(this.sceneView.ui);
        },

        /**
         * Resets all the components of the view.
         */
        resetComponents: function() {
            SimView.prototype.resetComponents.apply(this);
            this.initSceneView();
        },

        /**
         * Overrides step to make sure we calculate the right step time.
         */
        step: function() {
            this.play();
            setTimeout(this._stepFinished, this.simulation.frameDuration * 1000);
        },

        /**
         * If we switch to a new sim, we pause this one,
         *   but we want to save whether or not it was
         *   paused already so it doesn't resume when we
         *   don't want it to.
         */
        halt: function() {
            SimView.prototype.halt.apply(this, arguments);

            this.simulation.pauseAudio();
        },

        /**
         * Used from the outside to continue execution but
         *   paying attention to whether it was already
         *   paused or not before it was halted.
         */
        resume: function() {
            SimView.prototype.resume.apply(this, arguments);

            this.simulation.resumeAudio();
        },

        /**
         * This is run every tick of the updater.  It updates the wave
         *   simulation and the views.
         */
        update: function(time, deltaTime) {
            // Update the model
            this.simulation.update(time, deltaTime);

            var timeSeconds = time / 1000;
            var dtSeconds   = deltaTime / 1000;

            this._update(timeSeconds, dtSeconds, this.simulation.get('paused'));
        },

        /**
         * Called with time and deltaTime converted to seconds
         */
        _update: function(time, deltaTime, paused) {
            // Update the scene
            this.sceneView.update(time, deltaTime, paused);
        },

        /**
         * The simulation changed its paused state.
         */
        pausedChanged: function() {
            if (this.simulation.get('paused'))
                this.$el.removeClass('playing');
            else
                this.$el.addClass('playing');
        },

        /**
         * Responds to changes in the frequency slider
         */
        changeFrequency: function(event) {
            var frequency = parseInt($(event.target).val());
            this.inputLock(function() {
                this.$frequency.text(frequency + ' Hz');
                this.simulation.set('frequency', frequency);
            });
        },

        /**
         * Responds to changes in the amplitude slider
         */
        changeAmplitude: function(event) {
            var amplitude = parseFloat($(event.target).val());
            this.inputLock(function() {
                this.$amplitude.text(amplitude.toFixed(2));
                this.simulation.set('amplitude', amplitude);
            });
        },

        /**
         * Toggles sounds
         */
        toggleAudioEnabled: function(event) {
            if ($(event.target).is(':checked'))
                this.simulation.set('audioEnabled', true);
            else
                this.simulation.set('audioEnabled', false);
        },

        /**
         * Toggles the help labels
         */
        toggleHelp: function(event) {
            if ($(event.target).hasClass('toggled-on')) {
                this.sceneView.hideHelpLabels();
                $(event.target).removeClass('toggled-on');
            }
            else {
                this.sceneView.showHelpLabels();
                $(event.target).addClass('toggled-on');
            }
        },

        audioSpeakerClicked: function() {
            this.simulation.setListenerToSpeaker();
        },

        audioListenerClicked: function() {
            this.simulation.setListenerToPerson();
        }

    });

    return SoundSimView;
});

define(function (require) {

    'use strict';

    //var _        = require('underscore');
    var Backbone = require('backbone');

    var Rectangle = require('common/math/rectangle');

    var WavefrontType = require('models/wavefront-type');

    /**
     * Constants
     */
    var Constants = require('constants');
    var S_LENGTH = 400;

    /**
     * A movable target object that detects collisions with projectiles
     */
    var Wavefront = Backbone.Model.extend({

        defaults: {
            maxAmplitude: Constants.DEFAULT_AMPLITUDE,
            frequency: Constants.DEFAULT_FREQUENCY / Constants.FREQUENCY_DISPLAY_FACTOR,
            propagationSpeed: 1,

            originX: 0,
            originY: 0,

            listenerX: 0,

            waveFunction: function() {},
            wavefrontType: WavefrontType.Spherical,

            /**
             * "Enabled" means that the wavefront should be added into the
             *   wave medium. The waveform runs continuously whether it is enabled
             *   or not, so it does not get out of phase from when it was started.
             */
            enabled: true
        },

        initialize: function(attributes, options) {
            this.time = 0;

            // We store amplitudes as an array, where each index corresponds to
            //   a specific distance from the source.  The higher the index, the
            //   farther away from the source we are when we calculate amplitude.
            this.amplitude = [];

            // Tracks the frequency and max amplitude at which each entry
            //   in the amplitude array was generated
            this.frequencyAtTime = [];
            this.maxAmplitudeAtTime = [];

            // Tracks the previous values for frequency and max amplitude so
            //   we can tell if the listener's oscillator needs to be updated
            this.prevFrequencyAtTime = [];
            this.prevMaxAmplitudeAtTime = [];

            // Set default values
            this.clear();
        },

        getAmplitude: function() {
            return this.amplitude;
        },

        getAmplitudeAt: function(x) {
            return this.amplitude[parseInt(x)];
        },

        /**
         * Returns the frequency at which the amplitude at a particular index
         *   was generated. This enables a client to get the frequency at some
         *   point in the wave train other than what is being generated right now.
         */
        getFrequencyAtTime: function(frequencyIndex) {
            frequencyIndex = Math.max(0, Math.min(S_LENGTH - 1, frequencyIndex));
            return this.frequencyAtTime[frequencyIndex];
        },

        getMaxAmplitudeAtTime: function(maxAmplitudeIndex) {
            maxAmplitudeIndex = Math.max(0, Math.min(S_LENGTH - 1, maxAmplitudeIndex));
            return this.maxAmplitudeAtTime[maxAmplitudeIndex];
        },

        getWavelengthAtTime: function(time) {
            var lambda = this.get('propagationSpeed') / (Constants.TIME_STEP * this.getFrequencyAtTime(time));
            // Note from PhET: I'm sorry to say I'm not sure just why 6.2 is the
            //   right factor here, but it works.
            return lambda * 6.2;
        },

        update: function(time, deltaTime, attenuationFunction) {
            this.time += deltaTime;
            var stepSize = this.get('propagationSpeed');
            var amplitude;
            var attenuation;

            // Move the existing elements of the wavefront up in the array of amplitudes
            for (var i = S_LENGTH - 1; i > stepSize - 1; i--) {

                // Has the amplitude changed for the listener since the last time step?
                // if ((i - stepSize) === this.get('listenerX') && this.maxAmplitudeAtTime[i] !== this.prevMaxAmplitudeAtTime[i]) {
                //     // Trigger some sort of event
                // }

                this.prevMaxAmplitudeAtTime[i] = this.maxAmplitudeAtTime[i];
                this.amplitude[i] = this.amplitude[i - stepSize];

                // Amplitude must be adjusted for distance from source, and attenuation
                //   due to the density of the wave medium
                amplitude = this.get('wavefrontType').computeAmplitudeAtDistance(this, this.amplitude[i], i);
                attenuation = attenuationFunction(i * this.get('propagationSpeed'), 0);
                this.amplitude[i] = amplitude * attenuation;

                // Has the frequency changed for the listener since the last time step?
                // if ((i - stepSize) === this.get('listenerX') && this.frequencyAtTime[i] !== this.prevFrequencyAtTime[i]) {
                //     // Trigger some sort of event
                // }

                this.prevFrequencyAtTime[i] = this.frequencyAtTime[i];
                this.frequencyAtTime[i] = this.frequencyAtTime[i - stepSize];

                amplitude = this.get('wavefrontType').computeAmplitudeAtDistance(this, this.maxAmplitudeAtTime[i - stepSize], i);
                attenuation = attenuationFunction(i * this.get('propagationSpeed'), 0);
                this.maxAmplitudeAtTime[i] = amplitude * attenuation;

                if (this.maxAmplitudeAtTime[i] < 0)
                    throw 'Negative amplitude';
            }

            // Generate the new element(s) of the wavefront
            var a = this.get('waveFunction')(this.time);
            for (var j = 0; j < stepSize; j++) {
                this.amplitude[j] = a;
                if (this.frequencyAtTime[j] !== this.get('frequency'))
                    this.frequencyAtTime[j] = this.get('frequency');
                if (this.maxAmplitudeAtTime[j] !== this.get('maxAmplitude')) 
                    this.maxAmplitudeAtTime[j] = this.get('maxAmplitude');
            }
        },

        clear: function() {
            for (var i = 0; i < S_LENGTH; i++) {
                this.amplitude[i] = 0;
                this.frequencyAtTime[i] = 0;
                this.maxAmplitudeAtTime[i] = 0;
            }
        }

    });

    return Wavefront;
});
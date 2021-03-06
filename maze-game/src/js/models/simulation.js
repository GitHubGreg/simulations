define(function (require, exports, module) {

    'use strict';

    var _ = require('underscore');
    var buzz = require('buzz');

    var Simulation = require('common/simulation/simulation');

    var Particle = require('models/particle');
    var Level    = require('models/level');

    var Levels = require('levels');

    var Constants = require('constants');

    /**
     * The simulation model
     */
    var MazeGameSimulation = Simulation.extend({

        defaults: _.extend(Simulation.prototype.defaults, {
            level: Levels['Practice'],
            levelName: 'Practice',
            collisions: 0,
            soundVolume: 80,
            won: false
        }),
        
        initialize: function(attributes, options) {
            this.particle = new Particle(); 

            // Sounds
            this.ambientSound = new buzz.sound('audio/ambient-loop', {
                formats: ['ogg', 'mp3', 'wav']
            });
            this.collisionSound = new buzz.sound('audio/computer-twitches', {
                formats: ['ogg', 'mp3', 'wav']
            });
            this.winSound = new buzz.sound('audio/success-2', {
                formats: ['ogg', 'mp3', 'wav']
            });

            Simulation.prototype.initialize.apply(this, [attributes, options]);

            this.on('change:level', this.levelChanged);
            this.on('change:soundVolume', this.volumeChanged);
            this.on('change:won', this.winStateChanged);
            this.listenTo(this.particle, 'change:colliding', this.collidingChanged);
        },

        /**
         * Initializes the models used in the simulation
         */
        initComponents: function() {
            this.resetParticle();
            this.ambientSound
                .play()
                .fadeTo(80)
                .loop();
        },

        /**
         * Overrides simulation's reset function
         */
        reset: function() {
            this.stopTimer();
            this.resetParticle();
            this.set({
                time: 0,
                won: false,
                collisions: 0
            });
        },

        resetParticle: function() {
            var startPosition = this.get('level').startPosition();
            this.particle.set({
                // Position it in the middle of the start tile
                x: this.get('level').colToX(startPosition.col) + Constants.TILE_SIZE / 2,
                y: this.get('level').rowToY(startPosition.row) + Constants.TILE_SIZE / 2,

                // And reset the velocity and acceleration
                vx: 0,
                vy: 0,
                ax: 0,
                ay: 0
            });
        },

        startTimer: function() {
            this.set('time', 0);
            this.timing = true;
        },

        stopTimer: function() {
            this.timing = false;
        },

        resetTimer: function() {
            this.set('time', 0);
        },

        win: function() {
            this.winSound.play();
            this.stopTimer();
        },

        changeLevel: function(levelName) {
            this.set({
                levelName: levelName,
                level: Levels[levelName]
            });
        },

        _update: function(time, deltaTime) {
            // Update the position
            this.particle.update(time, deltaTime);
            var x = this.particle.get('x');
            var y = this.particle.get('y');
            var radius = this.particle.get('radius');

            // Check for collisions
            if (this.get('level').collidesWithTileTypeAt(Level.TILE_WALL, x, y, radius))
                this.particle.set('colliding', true);
            else
                this.particle.set('colliding', false);

            if (this.get('level').collidesWithTileTypeAt(Level.TILE_FINISH, x, y, radius) && this.get('collisions') === 0)
                this.set('won', true);

            if (this.timing)
                this.set('time', this.get('time') + deltaTime);
        },

        winStateChanged: function(simulation, won) {
            if (won)
                this.win();
        },

        levelChanged: function(simulation, level) {
            this.resetParticle();
            this.set('won', false);
            this.set('collisions', 0);
        },

        volumeChanged: function(simulation, volume) {
            this.collisionSound.setVolume(volume);
            this.ambientSound.setVolume(volume);
            this.winSound.setVolume(volume);
        },

        collidingChanged: function(particle, colliding) {
            if (colliding) {
                this.set('collisions', this.get('collisions') + 1);
                this.collisionSound
                    .play()
                    .loop();
            }
            else {
                this.collisionSound.pause();
            }
        }

    });

    return MazeGameSimulation;
});

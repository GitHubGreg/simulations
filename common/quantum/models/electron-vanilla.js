define(function (require) {

    'use strict';

    var _ = require('underscore');

    var Vector2              = require('common/math/vector2');
    var VanillaSphericalBody = require('common/mechanics/models/spherical-body-vanilla');
    
    var PhysicsUtil   = require('./physics-util');
    var QuantumConfig = require('../config');

    /**
     * Represents an electron
     */
    var VanillaElectron = VanillaSphericalBody.extend({

        defaults: _.extend({}, VanillaSphericalBody.prototype.defaults, {
            // Radius of an electron. An arbitrary dimension based on how it looks on the screen
            radius: 2,
            mass: PhysicsUtil.ELECTRON_MASS
        }),

        init: function() {
            VanillaSphericalBody.prototype.init.apply(this, arguments);

            // Cached objects
            this._velocity = new Vector2();
        },

        onCreate: function(attributes, options) {
            VanillaSphericalBody.prototype.onCreate.apply(this, [attributes, options]);

            this._markedForDestruction = false;
        },

        /**
         * Sets a flag for the electron to be destroyed on the next loop
         */
        markForDestruction: function() {
            this._markedForDestruction = true;
        },

        /**
         * Returns whether the electron has been marked for destruction
         */
        markedForDestruction: function() {
            return this._markedForDestruction;
        },

        /**
         * Returns the the energy of the electron in Joules
         *
         * @return
         */
        getEnergy: function() {
            var ke = QuantumConfig.PIXELS_PER_NM * QuantumConfig.PIXELS_PER_NM * this.get('velocity').lengthSq() * this.get('mass') / 2;
            var ev = ke * PhysicsUtil.EV_PER_JOULE;
            return ev;
        },

        /**
         * Sets the energy of the electron, in EV
         */
        setEnergy: function(e) {
            var ke = e * PhysicsUtil.JOULES_PER_EV;

            // compute the speed of the electron
            var sNew = Math.sqrt(2 * ke / this.get('mass'));
            var sCurr = this.get('velocity').length();
            this.setVelocity(this._velocity.set(this.get('velocity')).scale(sNew / sCurr / QuantumConfig.PIXELS_PER_NM));
        }

    });

    return VanillaElectron;
});
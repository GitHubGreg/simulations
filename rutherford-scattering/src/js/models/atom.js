define(function (require) {

    'use strict';

    var Backbone = require('backbone');
    var Constants = require('constants');
    var C = Constants.AtomModel.MIN_NUCLEUS_RADIUS / Math.pow( Constants.AtomModel.MIN_PARTICLE_COUNT, Constants.AtomModel.PARTICLE_COUNT_EXP );

    var Atom = Backbone.Model.extend({

        defaults: {
            protonCount: Constants.DEFAULT_PROTON_COUNT,
            neutronCount: Constants.DEFAULT_NEUTRON_COUNT,
            hold: false
        },

        initialize: function(attributes, options) {
            Backbone.Model.prototype.initialize.apply(this, [attributes, options]);
            this.updateRadius(options.simulation);
        },

        updateRadius: function(simulation) {
            var protonCount = simulation.get('protonCount');
            var neutronCount = simulation.get('neutronCount');

            var currentParticles = protonCount + neutronCount;
            var radius = C * Math.pow( currentParticles, Constants.AtomModel.PARTICLE_COUNT_EXP );

            this.set({
                protonCount: protonCount,
                neutronCount: neutronCount,
                radius: radius
            });
        }

    });

    return Atom;
});

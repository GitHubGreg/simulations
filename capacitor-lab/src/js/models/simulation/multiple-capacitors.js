define(function (require, exports, module) {

    'use strict';

    var _ = require('underscore');

    var Vector3 = require('common/math/vector3');

    var CapacitorLabSimulation = require('models/simulation');
    var DielectricMaterial     = require('models/dielectric-material');
    var Capacitor              = require('models/capacitor');
    var SingleCircuit          = require('models/circuit/single');  
    var SeriesCircuit          = require('models/circuit/series');
    var ParallelCircuit        = require('models/circuit/parallel');
    var Combination1Circuit    = require('models/circuit/combination-1');
    var Combination2Circuit    = require('models/circuit/combination-2');
    /**
     * Constants
     */
    var Constants = require('constants');

    /**
     * Wraps the update function in 
     */
    var MultipleCapacitorsSimulation = CapacitorLabSimulation.extend({

        defaults: _.extend(CapacitorLabSimulation.prototype.defaults, {
            currentCircuitIndex: 0,
            circuit: null
        }),
        
        initialize: function(attributes, options) {
            CapacitorLabSimulation.prototype.initialize.apply(this, [attributes, options]);

            this.on('change:currentCircuitIndex', this.currentCircuitIndexChanged);
        },

        /**
         * Initializes the models used in the simulation
         */
        initComponents: function() {
            this.initCircuits();
        },

        initCircuits: function() {
            var dielectricMaterial = new DielectricMaterial.Air();

            var plateSeparation = Capacitor.calculatePlateSeparation(
                dielectricMaterial.get('dielectricConstant'), 
                MultipleCapacitorsSimulation.PLATE_WIDTH, 
                Constants.CAPACITANCE_RANGE.min
            );

            var config = {
                batteryLocation:    MultipleCapacitorsSimulation.BATTERY_LOCATION,
                capacitorXSpacing:  MultipleCapacitorsSimulation.CAPACITOR_X_SPACING,
                capacitorYSpacing:  MultipleCapacitorsSimulation.CAPACITOR_Y_SPACING,
                plateWidth:         MultipleCapacitorsSimulation.PLATE_WIDTH,
                plateSeparation:    plateSeparation,
                dielectricMaterial: dielectricMaterial,
                dielectricOffset:   MultipleCapacitorsSimulation.DIELECTRIC_OFFSET,
                wireThickness:      MultipleCapacitorsSimulation.WIRE_THICKNESS,
                wireExtent:         MultipleCapacitorsSimulation.WIRE_EXTENT
            };

            this.circuits = [
                new SingleCircuit(      {}, { config: config }),
                new SeriesCircuit(      {}, { config: config, numberOfCapacitors: 2 }),
                new SeriesCircuit(      {}, { config: config, numberOfCapacitors: 3 }),
                new ParallelCircuit(    {}, { config: config, numberOfCapacitors: 2 }),
                new ParallelCircuit(    {}, { config: config, numberOfCapacitors: 3 }),
                new Combination1Circuit({}, { config: config }),
                new Combination2Circuit({}, { config: config })
            ];

            this.currentCircuitIndexChanged(this, this.get('currentCircuitIndex'));
        },

        resetComponents: function() {
            this.circuit.reset();
        },

        _update: function(time, deltaTime) {
            
        },

        currentCircuitIndexChanged: function(simulation, currentCircuitIndex) {
            this.set('circuit', this.circuits[currentCircuitIndex]);
        }

    }, Constants.MultipleCapacitorsSimulation);

    return MultipleCapacitorsSimulation;
});

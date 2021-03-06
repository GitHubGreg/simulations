define(function (require) {

    'use strict';

    var _ = require('underscore');

    var Vector2 = require('common/math/vector2');

    var WaterMoleculeStructure = require('models/water-molecule-structure');

    var Constants = require('constants');
    var MAX_NUM_ATOMS = Constants.MAX_NUM_ATOMS;

    /**
     * 
     */
    var MoleculeForceAndMotionDataSet = function(atomsPerMolecule) {
        this.atomsPerMolecule = atomsPerMolecule;

        this.numberOfAtoms = 0;
        this.numberOfSafeMolecules = 0;

        this.atomPositions = [];
        this.moleculeCenterOfMassPositions = [];
        this.moleculeVelocities = [];
        this.moleculeForces = [];
        this.nextMoleculeForces = [];

        // Note that some of the following are not used in the monatomic case,
        //   but need to be here for compatibility.
        this.moleculeRotationAngles = [];
        this.moleculeRotationRates = [];
        this.moleculeTorques = [];
        this.nextMoleculeTorques = [];

        // Set default values.
        if (atomsPerMolecule === 1) {
            this.moleculeMass = 1;
            this.moleculeRotationalInertia = 0;
        }
        else if (atomsPerMolecule === 2) {
            this.moleculeMass = 2; // Two molecules, assumed to be the same.
            this.moleculeRotationalInertia = Math.pow(Constants.DIATOMIC_PARTICLE_DISTANCE, 2) / 2;
        }
        else if (atomsPerMolecule === 3) {
            this.moleculeMass = 1.5; // Two molecules, assumed to be the same.
            this.moleculeRotationalInertia = WaterMoleculeStructure.rotationalInertia;
        }

        for (var i = 0; i < Constants.MAX_NUM_ATOMS; i++) {
            this.moleculeRotationAngles.push(0);
            this.moleculeRotationRates.push(0);
            this.moleculeTorques.push(0);
            this.nextMoleculeTorques.push(0);
            //this.nextMoleculeForces.push(0);
        }
    };

    /**
     * Instance functions/properties
     */
    _.extend(MoleculeForceAndMotionDataSet.prototype, {

        /**
         * Returns a value indicating how many more molecules can be added.
         */
        getNumberOfRemainingSlots: function() {
            return ((MAX_NUM_ATOMS / this.atomsPerMolecule) - (this.numberOfAtoms / this.atomsPerMolecule));
        },

        getNumberOfMolecules: function() {
            return this.numberOfAtoms / this.atomsPerMolecule;
        },

        /**
         * Calculate the temperature of the system based on the total kinetic
         * energy of the molecules.
         *
         * @return - temperature in model units (as opposed to Kelvin, Celsius, or whatever)
         */
        calculateTemperatureFromKineticEnergy: function() {
            var translationalKineticEnergy = 0;
            var rotationalKineticEnergy = 0;
            var numberOfMolecules = this.numberOfAtoms / this.atomsPerMolecule;
            var kineticEnergyPerMolecule;
            var i;

            if (this.atomsPerMolecule === 1) {
                for (i = 0; i < this.numberOfAtoms; i++) {
                    translationalKineticEnergy += (
                        (this.moleculeVelocities[i].x * this.moleculeVelocities[i].x) +
                        (this.moleculeVelocities[i].y * this.moleculeVelocities[i].y)
                    ) / 2;
                }
                kineticEnergyPerMolecule = translationalKineticEnergy / this.numberOfAtoms;
            }
            else {
                for (i = 0; i < this.numberOfAtoms / this.atomsPerMolecule; i++) {
                    translationalKineticEnergy += 0.5 * this.moleculeMass * (
                        Math.pow(this.moleculeVelocities[i].x, 2) + Math.pow(this.moleculeVelocities[i].y, 2)
                    );
                    rotationalKineticEnergy += 0.5 * this.moleculeRotationalInertia * Math.pow(this.moleculeRotationRates[i], 2);
                }
                kineticEnergyPerMolecule = (translationalKineticEnergy + rotationalKineticEnergy) / numberOfMolecules / 1.5;
            }

            return kineticEnergyPerMolecule;
        },

        /**
         * Add a new molecule to the model.  The molecule must have been created
         * and initialized before being added.  It is considered to be "unsafe",
         * meaning that it can't interact with other molecules, until an external
         * entity (generally the motion-and-force calculator) changes that
         * designation.
         *
         * @return - true if able to add, false if not.
         */
        addMolecule: function(atomPositions, moleculeCenterOfMassPosition, moleculeVelocity, moleculeRotationRate) {
            if (this.getNumberOfRemainingSlots() === 0)
                return false;

            // Add the information for this molecule to the data set.
            for (var i = 0; i < this.atomsPerMolecule; i++)
                this.atomPositions.push(atomPositions[i]);

            var numberOfMolecules = this.numberOfAtoms / this.atomsPerMolecule;
            this.moleculeCenterOfMassPositions[numberOfMolecules] = moleculeCenterOfMassPosition;
            this.moleculeVelocities[numberOfMolecules] = moleculeVelocity;
            this.moleculeRotationRates[numberOfMolecules] = moleculeRotationRate;

            // Allocate memory for the information that is not specified.
            this.moleculeForces[numberOfMolecules] = new Vector2();
            this.nextMoleculeForces[numberOfMolecules] = new Vector2();

            // Increment the number of atoms.  Note that we DON'T increment the number of safe atoms - that must
            // be done by some outside entity.
            this.numberOfAtoms += this.atomsPerMolecule;

            return true;
        },

        /**
         * Remove the molecule at the designated index.  This also removes all
         *   atoms and forces associated with the molecule and shifts the
         *   various arrays to compensate.
         * 
         * This used to be a very expensive operation in the original, but I
         *   think this one will run pretty fast. - Patrick
         *
         * @param moleculeIndex
         */
        removeMolecule: function(moleculeIndex) {
            if (moleculeIndex >= this.numberOfAtoms / this.atomsPerMolecule) {
                // Ignore this out-of-range request.
                return;
            }

            this.moleculeCenterOfMassPositions.splice(moleculeIndex, 1);
            this.moleculeVelocities.splice(moleculeIndex, 1);
            this.moleculeForces.splice(moleculeIndex, 1);
            this.nextMoleculeForces.splice(moleculeIndex, 1);
            this.moleculeRotationAngles.splice(moleculeIndex, 1);
            this.moleculeRotationRates.splice(moleculeIndex, 1);
            this.moleculeTorques.splice(moleculeIndex, 1);
            this.nextMoleculeTorques.splice(moleculeIndex, 1);

            // Reduce the atom count.
            this.numberOfAtoms -= this.atomsPerMolecule;
        }

    });


    return MoleculeForceAndMotionDataSet;
});

define(function (require) {

	'use strict';

	var Backbone = require('backbone');

	/**
	 * Wraps the update function in 
	 */
	var Simulation = Backbone.Model.extend({
		
		/**
		 *
		 */
		initialize: function(options) {
			this.initComponents();
		},

		/**
		 *
		 */
		initComponents: function() {},

		/**
		 * 
		 */
		update: function(time, delta) {

			if (!this.paused) {
				this._update(time, delta);
			}
			
		},

		/**
		 * Inside the fixed-interval loop
		 */
		_update: function(time, delta) {},

		play: function() {
			this.paused = false;
			this.trigger('play');
		},

		pause: function() {
			this.paused = true;
			this.trigger('pause');
		},

		reset: function() {
			this.initComponents();
		}

	});

	return Simulation;
});
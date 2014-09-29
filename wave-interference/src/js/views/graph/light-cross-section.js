define(function(require) {

	'use strict';

	var CrossSectionGraphView = require('views/graph/cross-section');

	var graphHtml    = require('text!templates/graph.html');
	var controlsHtml = require('text!templates/light-cross-section-graph-controls.html');

	/*
	 * "Local" variables for functions to share and recycle
	 */

	/**
	 * LightCrossSectionGraphView shows the values of a certain row of the
	 *   lattice in real time in the form of a curve.
	 */
	var LightCrossSectionGraphView = CrossSectionGraphView.extend({

		template: _.template(graphHtml + controlsHtml),

		className: 'light-cross-section-graph-view open initial',

		events: _.extend({}, CrossSectionGraphView.prototype.events, {
			'click .curve-check'   : 'curveCheckClicked',
			'click .vectors-check' : 'vectorsCheckClicked',
		}),

		initialize: function(options) {
			CrossSectionGraphView.prototype.initialize.apply(this, [options]);

			this.showCurves  = true;
			this.showVectors = false;
		},

		/**
		 * Renders html container
		 */
		renderContainer: function() {
			this.$el.html(this.template(this.graphInfo));

			this.$showButton = this.$('.graph-show-button');
			this.$hideButton = this.$('.graph-hide-button');
		},

		/**
		 *
		 */
		curveCheckClicked: function(event) {
			this.showCurves = $(event.target).is(':checked');
		},

		/**
		 *
		 */
		vectorsCheckClicked: function(event) {
			this.showVectors = $(event.target).is(':checked');
		},

	});

	return LightCrossSectionGraphView;
});

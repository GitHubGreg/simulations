define(function (require) {

    'use strict';

    var $ = require('jquery');
    var _ = require('underscore');

    var SimView = require('common/app/sim');
    var VectorAdditionSimulation = require('models/simulation');
    var VectorAdditionSceneView = require('views/scene');

    require('bootstrap');

    // CSS
    require('less!styles/sim');
    require('less!common/styles/radio');

    // HTML
    var simHtml = require('text!templates/sim.html');

    var VectorAdditionSimView = SimView.extend({

        tagName:   'section',
        className: 'sim-view',
        template: _.template(simHtml),

        events: {
          'change #show-grid' : 'showGrid',
          'click .btn': 'clearAll'
        },

        initialize: function(options) {
            options = _.extend({
                title: 'Vector Addition',
                name: 'vector-addition',
            }, options);

            SimView.prototype.initialize.apply(this, [options]);
            this.listenTo(this.simulation, 'change:rText change:thetaText change:rXText change:rYText',
             this.updateFields);
            this.initSceneView();
        },

        initSimulation: function() {
            this.simulation = new VectorAdditionSimulation();
        },

        initSceneView: function() {
            this.sceneView = new VectorAdditionSceneView({
                simulation: this.simulation
            });
        },

        render: function() {
            this.$el.empty();
            this.renderScaffolding();
            this.renderSceneView();

            return this;
        },

        renderScaffolding: function() {
            this.$el.html(this.template(this.simulation.attributes));
        },

        renderSceneView: function() {
            this.sceneView.render();
            this.$('.scene-view-placeholder').replaceWith(this.sceneView.el);
        },

        postRender: function() {
            this.sceneView.postRender();
        },

        resetComponents: function() {
            SimView.prototype.resetComponents.apply(this);
            this.initSceneView();
        },

        update: function(time, delta) {
            // Update the model
            this.simulation.update(time, delta);
            // Update the scene
            this.sceneView.update(time, delta);
        },

        showGrid: function(e) {
          if ($(e.target).is(':checked')) {
            this.simulation.set('showGrid', true);
          }
          else {
            this.simulation.set('showGrid', false);
          }
        },

        clearAll: function() {
          this.simulation.set('emptyStage', true);
        },

        updateFields: function() {
          this.$el.find('input.rText').val(this.simulation.get('rText'));
          this.$el.find('input.thetaText').val(this.simulation.get('thetaText'));
          this.$el.find('input.rXText').val(this.simulation.get('rXText'));
          this.$el.find('input.rYText').val(this.simulation.get('rYText'));
        }

    });

    return VectorAdditionSimView;
});

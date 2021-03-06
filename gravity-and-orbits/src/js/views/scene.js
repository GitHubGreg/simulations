define(function(require) {

    'use strict';

    var PIXI = require('pixi');

    var PixiSceneView      = require('common/v3/pixi/view/scene');
    var AppView            = require('common/v3/app/app');
    var GridView           = require('common/v3/pixi/view/grid');
    var ModelViewTransform = require('common/math/model-view-transform');
    var Vector2            = require('common/math/vector2');
    var Rectangle          = require('common/math/rectangle');

    var Sun       = require('models/body/sun');
    var Planet    = require('models/body/planet');
    var Moon      = require('models/body/moon');
    var Satellite = require('models/body/satellite');

    var BodyView      = require('views/body');
    var SunView       = require('views/body/sun');
    var PlanetView    = require('views/body/planet');
    var MoonView      = require('views/body/moon');
    var SatelliteView = require('views/body/satellite');
    var BodyTraceView = require('views/body-trace');
    var CollisionView = require('views/collision');

    // Constants
    var Constants = require('constants');

    // CSS
    require('less!styles/scene');

    /**
     *
     */
    var GOSceneView = PixiSceneView.extend({

        events: {
            
        },

        initialize: function(options) {
            this.zoom = 1;

            PixiSceneView.prototype.initialize.apply(this, arguments);

            this.loadScenario(this.simulation.get('scenario'));

            this.listenTo(this.simulation.bodies, 'reset',  this.bodiesReset);
            this.listenTo(this.simulation.bodies, 'add',    this.bodyAdded);
            this.listenTo(this.simulation.bodies, 'remove', this.bodyRemoved);

            this.listenTo(this.simulation, 'change:scenario', this.scenarioChanged);
            this.listenTo(this.simulation, 'collision',       this.showCollision);
        },

        renderContent: function() {
            
        },

        initGraphics: function() {
            PixiSceneView.prototype.initGraphics.apply(this, arguments);

            if (AppView.windowIsShort()) {
                this.viewOriginX = Math.round((this.width - 216) / 2);
                this.viewOriginY = Math.round((this.height - 62) / 2);
                this.zoom = Constants.SceneView.SHORT_SCREEN_SCALE_MODIFIER;
            }
            else {
                this.viewOriginX = Math.round(this.width  / 2);
                this.viewOriginY = Math.round(this.height / 2);    
            }

            this.initMVT();
            this.initBodies();
            this.initGridView();
            this.initCollisions();
        },

        initMVT: function() {
            this.mvt = ModelViewTransform.createSinglePointScaleInvertedYMapping(
                new Vector2(this.modelOrigin.x, this.modelOrigin.y),
                new Vector2(this.viewOriginX, this.viewOriginY),
                this.zoom * Constants.SceneView.SCENE_SCALE
            );

            this.simulation.setBounds(
                this.mvt.viewToModelX(0), 
                this.mvt.viewToModelY(this.height), 
                this.mvt.viewToModelX(this.width), 
                this.mvt.viewToModelY(0)
            );
        },

        initBodies: function() {
            this.bodyViews = [];
            this.bodyTraceViews = [];

            this.bodyTraceLayer = new PIXI.Container();
            this.bodyTraceLayer.visible = false;
            this.stage.addChild(this.bodyTraceLayer);

            this.bodies = new PIXI.Container();
            this.stage.addChild(this.bodies);

            this.bodiesReset(this.simulation.bodies);
        },

        initGridView: function() {
            this.gridView = new GridView({
                origin: new Vector2(this.viewOriginX, this.viewOriginY),
                bounds: new Rectangle(0, 0, this.width, this.height),
                gridSize: this.mvt.modelToViewDeltaX(this.getViewSettings().gridSpacing),
                lineColor: '#fff',
                lineAlpha: 0.15
            });
            this.gridView.hide();
            this.stage.addChild(this.gridView.displayObject);
        },

        initCollisions: function() {
            this.collisionViews = [];
            this.collisionLayer = new PIXI.Container();
            this.stage.addChild(this.collisionLayer);
        },

        showCollision: function(simulation, smallerBody, largerBody) {
            var collisionView = new CollisionView({
                smallerBody: smallerBody,
                largerBody: largerBody,
                mvt: this.mvt
            });
            this.collisionLayer.addChild(collisionView.displayObject);
            this.collisionViews.push(collisionView);
        },

        clearCollisionViews: function() {
            // Remove collision views
            if (this.collisionViews) {
                for (var i = this.collisionViews.length - 1; i >= 0; i--) {
                    this.collisionViews[i].removeFrom(this.collisionLayer);
                    this.collisionViews.slice(i, 1);
                }
            }
        },

        reset: function() {
            // Reset visibility options
            this.velocityArrowsVisible = false;
            this.gravityArrowsVisible = false;
            this.gridView.hide();
            this.bodyTraceLayer.visible = false;

            // Remove collision views
            this.clearCollisionViews();

            // Make new body views and trace views
            this.bodiesReset(this.simulation.bodies);
        },

        _update: function(time, deltaTime, paused, timeScale) {
            if (!paused) {
                this.updateCollisions(time, deltaTime);
                this.updateBodies(time, deltaTime, paused);
            }
        },

        updateCollisions: function(time, deltaTime) {
            for (var i = this.collisionViews.length - 1; i >= 0; i--) {
                this.collisionViews[i].update(time, deltaTime);

                if (this.collisionViews[i].finished()) {
                    this.collisionViews[i].removeFrom(this.collisionLayer);
                    this.collisionViews.slice(i, 1);
                }
            }
        },

        updateBodies: function(time, deltaTime, paused) {
            for (var i = this.bodyTraceViews.length - 1; i >= 0; i--)
                this.bodyTraceViews[i].update(time, deltaTime, paused);
        },

        bodiesReset: function(bodies) {
            var i;

            // Remove old collision views
            this.clearCollisionViews();

            // Remove old body trace views
            for (i = this.bodyTraceViews.length - 1; i >= 0; i--) {
                this.bodyTraceViews[i].removeFrom(this.bodyTraceLayer);
                this.bodyTraceViews.splice(i, 1);
            }

            // Remove old body views
            for (i = this.bodyViews.length - 1; i >= 0; i--) {
                this.bodyViews[i].removeFrom(this.bodies);
                this.bodyViews.splice(i, 1);
            }

            // Add new body views
            bodies.each(function(body) {
                this.createAndAddBodyView(body);
            }, this);
        },

        bodyAdded: function(body, bodies) {
            this.createAndAddBodyView(body);
        },

        bodyRemoved: function(body, bodies) {
            for (var i = this.bodyViews.length - 1; i >= 0; i--) {
                if (this.bodyViews[i].model === body) {
                    this.bodyViews[i].removeFrom(this.bodies);
                    this.bodyViews.splice(i, 1);
                    this.bodyTraceViews[i].removeFrom(this.bodyTraceLayer);
                    this.bodyTraceViews.splice(i, 1);
                    break;
                }
            }
        },

        createAndAddBodyView: function(body) {
            var constructor;
            if (body instanceof Sun)
                constructor = SunView;
            else if (body instanceof Planet)
                constructor = PlanetView;
            else if (body instanceof Moon)
                constructor = MoonView;
            else if (body instanceof Satellite)
                constructor = SatelliteView;
            else
                constructor = BodyView;

            var bodyView = new constructor({ 
                model: body,
                mvt: this.mvt,
                simulation: this.simulation
            });
            this.bodies.addChild(bodyView.displayObject);
            this.bodyViews.push(bodyView);

            if (this.velocityArrowsVisible)
                bodyView.showVelocityArrow();
            else
                bodyView.hideVelocityArrow();

            if (this.gravityArrowsVisible)
                bodyView.showGravityArrow();
            else
                bodyView.hideGravityArrow();

            if (this.massLabelsVisible)
                bodyView.showMassLabel();
            else
                bodyView.hideMassLabel();

            // Trace view
            var bodyTraceView = new BodyTraceView({
                model: body,
                mvt: this.mvt
            });
            this.bodyTraceLayer.addChild(bodyTraceView.displayObject);
            this.bodyTraceViews.push(bodyTraceView);
        },

        scenarioChanged: function(simulation, scenario) {
            this.loadScenario(scenario);
            this.updateMVT();
        },

        loadScenario: function(scenario) {
            // Update zoom
            this.zoom = scenario.viewSettings.defaultZoom;
            if (AppView.windowIsShort())
                this.zoom *= Constants.SceneView.SHORT_SCREEN_SCALE_MODIFIER;
            this.maxZoom = this.zoom * 2;
            this.minZoom = this.zoom / 2;

            // Update model origin
            this.modelOrigin = scenario.viewSettings.origin;
        },

        updateMVT: function() {
            this.initMVT();

            this.gridView.setGridSize(this.mvt.modelToViewDeltaX(this.getViewSettings().gridSpacing));

            var i;
            
            for (i = 0; i < this.bodyViews.length; i++)
                this.bodyViews[i].updateMVT(this.mvt);

            for (i = this.bodyTraceViews.length - 1; i >= 0; i--)
                this.bodyTraceViews[i].updateMVT(this.mvt);

            for (i = this.collisionViews.length - 1; i >= 0; i--) 
                this.collisionViews[i].updateMVT(this.mvt);

            this.trigger('change:mvt', this, this.mvt);
        },

        showVelocityArrows: function() {
            this.velocityArrowsVisible = true;
            for (var i = this.bodyViews.length - 1; i >= 0; i--)
                this.bodyViews[i].showVelocityArrow();
        },

        hideVelocityArrows: function() {
            this.velocityArrowsVisible = false;
            for (var i = this.bodyViews.length - 1; i >= 0; i--)
                this.bodyViews[i].hideVelocityArrow();
        },

        showGravityArrows: function() {
            this.gravityArrowsVisible = true;
            for (var i = this.bodyViews.length - 1; i >= 0; i--)
                this.bodyViews[i].showGravityArrow();
        },

        hideGravityArrows: function() {
            this.gravityArrowsVisible = false;
            for (var i = this.bodyViews.length - 1; i >= 0; i--)
                this.bodyViews[i].hideGravityArrow();
        },

        showMassLabels: function() {
            this.massLabelsVisible = true;
            for (var i = this.bodyViews.length - 1; i >= 0; i--)
                this.bodyViews[i].showMassLabel();
        },

        hideMassLabels: function() {
            this.massLabelsVisible = false;
            for (var i = this.bodyViews.length - 1; i >= 0; i--)
                this.bodyViews[i].hideMassLabel();
        },

        showGrid: function() {
            this.gridView.show();
        },

        hideGrid: function() {
            this.gridView.hide();
        },

        getViewSettings: function() {
            return this.simulation.get('scenario').viewSettings;
        },

        zoomIn: function() {
            var zoom = this.zoom + 0.2;
            if (zoom <= Constants.SceneView.MAX_SCALE) {
                this.zoom = zoom;
                this.updateMVT();
            }
        },

        zoomOut: function() {
            var zoom = this.zoom - 0.2;
            if (zoom >= Constants.SceneView.MIN_SCALE) {
                this.zoom = zoom;
                this.updateMVT();
            }
        },

        showTraces: function() {
            this.clearTraces();
            this.bodyTraceLayer.visible = true;
        },

        hideTraces: function() {
            this.bodyTraceLayer.visible = false;
        },

        clearTraces: function() {
            for (var i = this.bodyTraceViews.length - 1; i >= 0; i--)
                this.bodyTraceViews[i].clear();
        }

    });

    return GOSceneView;
});

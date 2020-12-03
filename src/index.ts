/* CSCI 5619 Assignment 7, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Logger } from "@babylonjs/core/Misc/logger";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Sound } from "@babylonjs/core/Audio/sound"
import { AssetsManager} from "@babylonjs/core/Misc/assetsManager"


// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    private gameStarted : boolean;
    private gamePaused : boolean;

    private weapon_arrow : TransformNode | null;
    private weapon_archery : TransformNode | null;

    private weapon_rifle : TransformNode | null;
    private weapon_hatchet : TransformNode | null;

    private weapon_hatchet_scale : number;
    private weapon_archery_scale: number;


    private sound_swoosh : Sound | null;

    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        this.gameStarted = false;
        this.gamePaused = true;
        
        // Weapons
        this.weapon_arrow = null;
        this.weapon_archery = null;
        this.weapon_rifle = null;
        this.weapon_hatchet = null;

        // scale factors
        this.weapon_hatchet_scale = .2;
        this.weapon_archery_scale = .1;

        // Sound effects
        this.sound_swoosh = null;
    }

    start() : void 
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => { 
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        // This creates and positions a first-person camera (non-mesh)
        var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;
        camera.minZ = .1;
        camera.maxZ = 100;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

       // Create a point light
       var pointLight = new PointLight("pointLight", new Vector3(0, 2.5, 0), this.scene);
       pointLight.intensity = 1.0;
       pointLight.diffuse = new Color3(.25, .25, .25);

       var light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 100,
            skyboxSize: 50,
            skyboxColor: new Color3(0, 0, 0)
        });

        // Make sure the ground and skybox are not pickable!
        environment!.ground!.isPickable = false;
        environment!.skybox!.isPickable = false;

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation
        xrHelper.teleportation.dispose();

        // This executes when the user enters or exits immersive mode
        xrHelper.enterExitUI.activeButtonChangedObservable.add((enterExit) => {
            // If we are entering immersive mode
            if(enterExit)
            {
                // Start the game only in immersive mode
                this.gameStarted = true;

                // Need to set both play and autoplay depending on
                // whether the music has finished loading or not
                // if(this.sound_swoosh)
                // {
                //     this.sound_swoosh.autoplay = true;
                //     this.sound_swoosh.play();
                // } 
                        
            }
            // This boolean flag is necessary to prevent the pause function
            // from being executed twice (this may be a bug in the xrHelper)
            else if(!this.gamePaused)
            {
                // Pause the game and music upon exit
                this.gameStarted = false;
                // this.pause();
            }
        });
        
        // The assets manager can be used to load multiple assets
        var assetsManager = new AssetsManager(this.scene);

        var sound_swoosh_task = assetsManager.addBinaryFileTask("sound_swoosh", "assets/sounds/swoosh.wav");
        sound_swoosh_task.onSuccess = (task) => {
            this.sound_swoosh = new Sound("swoosh", task.data, this.scene, null, {
                loop: false,
                autoplay: false,
            });
        }

        this.weapon_archery = new TransformNode("archery", this.scene);
        var weapon_archery_task = assetsManager.addMeshTask("weapon_archery", "", "assets/models/", "bow.obj");
        weapon_archery_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                element.parent = this.weapon_archery;
            });
            this.weapon_archery?.scaling.scaleInPlace(this.weapon_archery_scale);
        }

        this.weapon_arrow = new TransformNode("weapon_arrow", this.scene);
        var weapon_arrow_task = assetsManager.addMeshTask("weapon_arrow", "", "assets/models/", "arrow.obj");
        weapon_arrow_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                element.parent = this.weapon_arrow;
            });
        }

        this.weapon_rifle = new TransformNode("weapon_rifle", this.scene);
        var weapon_rifle_task = assetsManager.addMeshTask("weapon_rifle", "", "assets/models/", "rifle.obj");
        weapon_rifle_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                element.parent = this.weapon_rifle;
            });
        }


        this.weapon_hatchet = new TransformNode("weapon_hatchet", this.scene);
        var weapon_hatchet_task = assetsManager.addMeshTask("weapon_hatchet", "", "assets/models/", "hatchet.obj");
        weapon_hatchet_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                element.parent = this.weapon_hatchet;
            });
            this.weapon_hatchet?.scaling.scaleInPlace(this.weapon_hatchet_scale);
        }

        // This loads all the assets and displays a loading screen
        assetsManager.load();
        

        // Assign the left and right controllers to member variables
        xrHelper.input.onControllerAddedObservable.add((inputSource) => {
            if(inputSource.uniqueId.endsWith("right"))
            {
                this.rightController = inputSource;
            }
            else 
            {
                this.leftController = inputSource;
            }  
        });

        // Don't forget to deparent objects from the controllers or they will be destroyed!
        xrHelper.input.onControllerRemovedObservable.add((inputSource) => {

            if(inputSource.uniqueId.endsWith("right")) 
            {

            }
        });

        this.scene.debugLayer.show(); 
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
 
    }

}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();
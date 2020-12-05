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
import { Sound } from "@babylonjs/core/Audio/sound";
import { CylinderPanel } from "@babylonjs/gui/3D/controls/cylinderPanel"
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager"
import { MeshButton3D } from "@babylonjs/gui/3D/controls/Meshbutton3D"
import { AssetsManager, HighlightLayer, StandardMaterial, TransformNode, BoxBuilder, MeshBuilder, SwitchInput, Mesh} from "@babylonjs/core";
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController/webXRControllerComponent";


// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";
import "@babylonjs/loaders/OBJ/objFileLoader";
import "@babylonjs/loaders/OBJ/mtlFileLoader";
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

    private world : TransformNode | null;

    private weapon_panel : CylinderPanel | null;
    private weapon_panel_radius : number;

    private weapon_arrow : TransformNode | null;
    private weapon_archery : TransformNode | null;

    private weapon_rifle : TransformNode | null;
    private weapon_hatchet : TransformNode | null;

    private weapon_hatchet_scale : number;
    private weapon_archery_scale: number;
    private weapon_rifle_scale: number;
    private weapon_arrow_scale: number;

    private weapon_in_hand : TransformNode | null;

    private sound_swoosh : Sound | null;

    private gui_manager : GUI3DManager | null;

    private weapon_list : Array<TransformNode>;

    private right_grip_transform : TransformNode | null;

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

        // World
        this.world = null;
        
        // Weapon panel
        this.weapon_panel = null;
        this.weapon_panel_radius = 20;

        // Weapons
        this.weapon_arrow = null;
        this.weapon_archery = null;
        this.weapon_rifle = null;
        this.weapon_hatchet = null;

        // Weapon list
        this.weapon_list = [];

        // scale factors
        this.weapon_hatchet_scale = .05;
        this.weapon_archery_scale = .01;
        this.weapon_rifle_scale = .2;
        this.weapon_arrow_scale = .1;

        // Sound effects
        this.sound_swoosh = null;

        this.gui_manager = null;

        this.right_grip_transform = null;

        this.weapon_in_hand = null;
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
        var camera = new UniversalCamera("camera1", new Vector3(-6.18, 2.03 + 1.6, 1.16), this.scene);
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

        // The manager automates some of the GUI creation steps
        this.gui_manager = new GUI3DManager(this.scene);


        // Creates a default skybox
        /*const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 100,
            skyboxSize: 50,
            skyboxColor: new Color3(0, 0, 0)
        });

        // Make sure the ground and skybox are not pickable!
        environment!.ground!.isPickable = false;
        environment!.skybox!.isPickable = false;*/

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation
        xrHelper.teleportation.dispose();

        // Remove pointer laser 
        xrHelper.pointerSelection.dispose();

        this.right_grip_transform = new TransformNode("right hand");

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

        // Loads world, sound effects and weapon meshes
        this.loadAssets();

        // Assign the left and right controllers to member variables
        xrHelper.input.onControllerAddedObservable.add((inputSource) => {
            if(inputSource.uniqueId.endsWith("right"))
            {
                this.rightController = inputSource;
                this.right_grip_transform!.parent = this.rightController.grip!;
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

        this.weapon_list.push(this.weapon_rifle!);
        this.weapon_list.push(this.weapon_arrow!);
        this.weapon_list.push(this.weapon_hatchet!);
        this.weapon_list.push(this.weapon_archery!);

        this.scene.debugLayer.show(); 
    }

     // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
        this.processControllerInput();
    }

    // Process event handlers for controller input
    private processControllerInput()
    {
        this.onLeftTrigger(this.leftController?.motionController?.getComponent("xr-standard-trigger"));
        this.onRightSqueeze(this.rightController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
    }

    private onRightTrigger(component?: WebXRControllerComponent) {
        // What will happend depends on what's on hand
        if (component?.pressed) {
            if (this.weapon_in_hand == this.weapon_rifle) {
                if (!this.sound_swoosh?.isPlaying) {
                    this.sound_swoosh?.play();
                }
            }
        }
    }

    private onRightSqueeze(component?: WebXRControllerComponent) {
        if (component?.changes.pressed) {
            if (component?.pressed) {
                this.findIntersectedWeapon();
            } else {
                this.weapon_in_hand?.setParent(null);
                this.weapon_in_hand = null;
            }
        }
    }

    private findIntersectedWeapon() : void {
        for (const weapon of this.weapon_list) {
            for (const mesh of weapon.getChildMeshes()) {
                if (this.rightController!.grip!.intersectsMesh(mesh)) {
                    weapon.setParent(this.right_grip_transform);
                    this.weapon_in_hand = weapon;
                    return;
                }
            }
        }
    }

    private onLeftTrigger(component?: WebXRControllerComponent)
    {
        if (component?.changes.pressed) {
            if (component.pressed) {
                if (this.weapon_panel==null) {
                    this.renderWeaponPanel();
                } else if (this.weapon_panel?.isVisible) {
                    this.setWeaponPanelVisibility(false);
                } else if (!this.weapon_panel?.isVisible) {
                    this.setWeaponPanelVisibility(true);
                }
            }
        }
    }

    private setWeaponPanelVisibility(b: boolean) : void {
        this.weapon_panel!.children.forEach(child => {
            child.isVisible = b;
        });
        this.weapon_panel!.isVisible = b;
    }

    private renderWeaponPanel() : void
    {
        if (this.weapon_panel == null) {
            this.weapon_panel = new CylinderPanel();
            this.gui_manager!.addControl(this.weapon_panel);
            this.weapon_panel.radius = this.weapon_panel_radius;
            this.weapon_panel.margin = 0.1;
            this.weapon_panel.blockLayout = true;
            this.weapon_panel.rows = 2;
            this.weapon_panel.blockLayout = true;
    
            var a = MeshBuilder.CreateBox("button", {width: 2, depth:0.1, height:2})
            a.visibility = 0.1;
            var pushButton = new MeshButton3D(a, "pushButton");
            this.weapon_rifle!.parent = a;
            this.weapon_panel.addControl(pushButton);
    
            var b = MeshBuilder.CreateBox("button", {width: 2, depth:0.1, height:2})
            b.visibility = 0.1;
            var pushButton = new MeshButton3D(b, "pushButton");
            this.weapon_archery!.parent = b;
            this.weapon_panel.addControl(pushButton);
    
            var c = MeshBuilder.CreateBox("button", {width: 2, depth:0.1, height:2})
            c.visibility = 0.1;
            var pushButton = new MeshButton3D(c, "pushButton");
            this.weapon_arrow!.parent = c;
            this.weapon_panel.addControl(pushButton);
            
            var d = MeshBuilder.CreateBox("button", {width: 2, depth:0.1, height:2})
            d.visibility = 0.1;
            var pushButton = new MeshButton3D(d, "pushButton");
            this.weapon_hatchet!.parent = d;
            this.weapon_panel.addControl(pushButton);
        }
        // recalculate the position to put the weapon panel
        var panel_position = this.xrCamera!.globalPosition.clone();
        panel_position.addInPlace(new Vector3(0, 0, -this.weapon_panel_radius));
        // within arm's reach
        panel_position.addInPlace(new Vector3(0, 0, 1));
        this.weapon_panel.position = panel_position;
    }

    private loadAssets() : void {
        // The assets manager can be used to load multiple assets
        var assetsManager = new AssetsManager(this.scene);
        this.world = new TransformNode("world", this.scene);
        var world_task = assetsManager.addMeshTask("world", "", "assets/models/", "PolyIsland.obj");
        world_task.onSuccess = (task) => {
            task.loadedMeshes.forEach((mesh) => {
                mesh.parent = this.world;
                // Mountains and canyon
                if (mesh.name == "Icosphere") {
                    var mountainMat = new StandardMaterial("mountainMat", this.scene);
                    mountainMat.diffuseColor = new Color3(130 / 255, 144 / 255, 11 / 255);
                    mountainMat.specularColor = new Color3(127 / 255, 127 / 255, 127 / 255);
                    mountainMat.emissiveColor = new Color3(0);

                    mesh.material = mountainMat;
                }
                else if (mesh.name == "Plane") {
                    var canyonMat = new StandardMaterial("canyonMat", this.scene);
                    canyonMat.diffuseColor = new Color3(6 / 255, 53 / 255, 6 / 255);
                    canyonMat.specularColor = new Color3(127 / 255, 127 / 255, 127 / 255);
                    canyonMat.emissiveColor = new Color3(0);

                    mesh.material = canyonMat;
                }
            });
        };
        this.world.setEnabled(false);

        var sound_swoosh_task = assetsManager.addBinaryFileTask("sound_swoosh", "assets/sounds/swoosh.wav");
        sound_swoosh_task.onSuccess = (task) => {
            this.sound_swoosh = new Sound("swoosh", task.data, this.scene, null, {
                loop: false,
            });
        };

        this.weapon_archery = new TransformNode("archery", this.scene);
        var weapon_archery_task = assetsManager.addMeshTask("weapon_archery", "", "assets/models/", "bow.obj");
        weapon_archery_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                element.parent = this.weapon_archery;
                // for some unknown reason, skip nodes called "default"
                if (element.name == "default") {
                    element.dispose();
                    return;
                }
            });
            this.weapon_archery?.scaling.scaleInPlace(this.weapon_archery_scale);
        };

        this.weapon_arrow = new TransformNode("weapon_arrow", this.scene);
        var weapon_arrow_task = assetsManager.addMeshTask("weapon_arrow", "", "assets/models/", "arrow.obj");
        weapon_arrow_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                if (element.name == "default") {
                    element.dispose();
                    return;
                }
                element.parent = this.weapon_arrow;
            });
            this.weapon_arrow?.scaling.scaleInPlace(this.weapon_arrow_scale);
        };

        this.weapon_rifle = new TransformNode("weapon_rifle", this.scene);
        var weapon_rifle_task = assetsManager.addMeshTask("weapon_rifle", "", "assets/models/", "rifle.obj");
        weapon_rifle_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                if (element.name == "default") {
                    element.dispose();
                    return;
                }
                element.parent = this.weapon_rifle;
            });
            this.weapon_rifle?.scaling.scaleInPlace(this.weapon_rifle_scale);
        };


        this.weapon_hatchet = new TransformNode("weapon_hatchet", this.scene);
        var weapon_hatchet_task = assetsManager.addMeshTask("weapon_hatchet", "", "assets/models/", "hatchet.obj");
        weapon_hatchet_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                if (element.name == "default") {
                    element.dispose();
                    return;
                }
                element.parent = this.weapon_hatchet;
            });
            this.weapon_hatchet?.scaling.scaleInPlace(this.weapon_hatchet_scale);
        };

        // This loads all the assets and displays a loading screen
        assetsManager.load();
    }
}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();
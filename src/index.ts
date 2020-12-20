/* CSCI 5619 Assignment 7, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Quaternion } from "@babylonjs/core/Maths/math";
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
import { AssetsManager, HighlightLayer, StandardMaterial, TransformNode, BoxBuilder, MeshBuilder, SwitchInput, Mesh, PhysicsImpostor, setAndStartTimer, InstancedMesh, Ray, LinesMesh, ActionManager, ExecuteCodeAction, IPhysicsEnabledObject} from "@babylonjs/core";
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController/webXRControllerComponent";

// Physics
import * as Cannon from "cannon"
import { CannonJSPlugin } from "@babylonjs/core/Physics/Plugins/cannonJSPlugin";
import "@babylonjs/core/Physics/physicsEngineComponent";

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";
import "@babylonjs/loaders/OBJ/objFileLoader";
import "@babylonjs/loaders/OBJ/mtlFileLoader";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ThinSprite } from "@babylonjs/core/Sprites/thinSprite";

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
    private arrow_clone : TransformNode | null;

    private weapon_rifle : TransformNode | null;
    private weapon_hatchet : TransformNode | null;

    private target : TransformNode | null;

    private weapon_hatchet_scale : number;
    private weapon_archery_scale: number;
    private weapon_rifle_scale: number;
    private weapon_arrow_scale: number;

    private weapon_in_rightHand : TransformNode | null;
    private weapon_in_leftHand : TransformNode | null;

    private sound_swoosh : Sound | null;
    private sound_jp : Sound | null;
    private sound_shoot : Sound | null;
    private sound_load : Sound | null;


    private gui_manager : GUI3DManager | null;

    private weapon_list : Array<TransformNode>;

    private right_grip_transform : TransformNode | null;
    private left_grip_transform : TransformNode | null;
    private weapon_panel_transform : TransformNode | null;

    private arrow_notched : boolean;
    private string_pullback : number;
    private arrow_velocity : number;

    private right_grip_prev_pos : Vector3;

    private weapon_hatchet_velocity_factor : number;

    private jetpack_equipped: boolean;
    private jetpack_max_velocity: number;

    private challenge_mode : boolean;

    private weapon_arrow_mesh: Mesh | null;
    // Targets parameters
    private target_scale : number;
    private targets : Array<Mesh>;
    private target_initial_pos : Vector3;

    // Data structure for VATS
    private targets_velocity_before_VATS : Map<Mesh, Vector3>;
    private time_slow_factor : number;
    private target_initial_velocity: number;
    private in_slow_time: boolean;

    // map to store velocity before pausing
    private targets_velocity_before_pause : Map<Mesh, Vector3>;

    // map from targets to its shadows
    private targets_shadows : Map<Mesh, Array<Mesh>>;
    private shadow_mtl : StandardMaterial | null;
    private rifle_ray : Ray | null;
    private highlighted_mesh : Mesh | null;

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

        // Weapon clones
        this.arrow_clone = null;

        // Weapon list
        this.weapon_list = [];

        // scale factors
        this.weapon_hatchet_scale = .05;
        this.weapon_archery_scale = .01;
        this.weapon_rifle_scale = .115;
        this.weapon_arrow_scale = .07;

        // Sound effects
        this.sound_swoosh = null;
        this.sound_jp = null;
        this.sound_load = null;
        this.sound_shoot = null;

        this.gui_manager = null;

        this.right_grip_transform = null;
        this.left_grip_transform = null;
        this.weapon_panel_transform = null;

        this.weapon_in_rightHand = null;
        this.weapon_in_leftHand = null;

        this.arrow_notched = false;
        this.string_pullback = 0;
        this.arrow_velocity = 100;

        this.right_grip_prev_pos = Vector3.Zero();

        this.weapon_hatchet_velocity_factor = 100;

        this.jetpack_equipped = false;
        this.jetpack_max_velocity = 3;

        this.target = null;
        this.target_scale = .2;
        this.target_initial_pos = new Vector3(3, 1.6, 10);
        this.targets = [];
        this.target_initial_velocity = 3;
        this.challenge_mode = true;

        this.weapon_arrow_mesh = null;
        
        this.targets_velocity_before_VATS = new Map<Mesh, Vector3>();
        this.time_slow_factor = .5;
        this.in_slow_time = false;
        
        this.targets_velocity_before_pause = new Map<Mesh, Vector3>();

        this.targets_shadows = new Map<Mesh, Array<Mesh>>();
        
        this.shadow_mtl = new StandardMaterial("shadow_mtl", this.scene);
        this.shadow_mtl.emissiveColor = Color3.Red();
        this.shadow_mtl.diffuseColor = Color3.Red();
        this.shadow_mtl.ambientColor =  Color3.Red();

        this.rifle_ray = null;
        this.highlighted_mesh = null;
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
        var camera = new UniversalCamera("camera1", new Vector3(-13.55, 1.6, 4.67), this.scene);
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
        const environment = this.scene.createDefaultEnvironment({
            skyboxSize: 50,
            skyboxColor: new Color3(89/255, 156/255, 197/255)
        });

        // Make sure the ground and skybox are not pickable!
        environment!.skybox!.isPickable = false;

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation
        xrHelper.teleportation.dispose();

        // Remove pointer laser 
        xrHelper.pointerSelection.dispose();

        this.right_grip_transform = new TransformNode("right hand");
        this.left_grip_transform = new TransformNode("left hand");
        this.weapon_panel_transform = new TransformNode("weapon panel parent");
        this.weapon_panel_transform.rotationQuaternion = new Quaternion();

        // This executes when the user enters or exits immersive mode
        xrHelper.enterExitUI.activeButtonChangedObservable.add((enterExit) => {
            // If we are entering immersive mode
            if(enterExit)
            {
                // Start the game only in immersive mode
                this.gameStarted = true;
                this.gamePaused = false;
                this.resume();
            }
            // This boolean flag is necessary to prevent the pause function
            // from being executed twice (this may be a bug in the xrHelper)
            else if(!this.gamePaused)
            {
                // Pause the game and music upon exit
                this.gameStarted = false;
                this.gamePaused = true;
                this.pause();
            }
        });

        // Loads world, sound effects and weapon meshes
        this.loadAssets();

        // Regular gravity
        this.scene.enablePhysics(new Vector3(0, -9.8, 0), new CannonJSPlugin(undefined, undefined, Cannon));

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
                this.left_grip_transform!.parent = this.leftController.grip!;
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

        // Create an example target that flies towards the user
        setInterval(() => this.generateTarget(), 5000);

        this.scene.debugLayer.show(); 
    }

    private pause() : void {
        if (this.challenge_mode) {
            this.targets.forEach(t => {
                if (t.isDisposed()) return;  // skip disposed targets
                if (t.physicsImpostor) {
                    this.targets_velocity_before_pause.set(t, t.physicsImpostor!.getLinearVelocity()!);
                }
                t.physicsImpostor?.sleep();
            });
        }
        // What about flying arrows and hatchet?
    }

    private resume() : void {
        if (this.challenge_mode) {
            this.targets.forEach(t => {
                if (t.isDisposed()) return;  // skip disposed targets
                t.physicsImpostor?.wakeUp();
                if (this.targets_velocity_before_pause.has(t)) {
                    var v = this.targets_velocity_before_pause.get(t);
                    t.physicsImpostor?.setLinearVelocity(v!);
                }
            });
            this.targets_velocity_before_pause.clear();
        }
    }

     // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
        this.processControllerInput();

        // record right hand position from last frame
        if (this.rightController && this.rightController.grip ) {
            this.right_grip_prev_pos = this.rightController.grip.position.clone();
        }

        if (this.jetpack_equipped) {
            this.steerJetPack();
        }

        if (!this.arrow_notched) {
            this.notchArrow();
        } else {
            this.pullBowString();
        }

        // apply a counter force to cancel gravity
        this.targets.forEach(t => {
            t.physicsImpostor?.applyForce(new Vector3(0, 9.8, 0), t.getAbsolutePosition());
            t.physicsImpostor?.setAngularVelocity(Vector3.Zero());
        });

        // if (this.c) {
        //     this.c!.position = this.targets[0].position;
        //     this.c!.rotation = this.targets[0].rotation;
        // }
        this.targets_shadows.forEach((mesh_arr : Array<Mesh>, t : Mesh) => {
            mesh_arr.forEach(shadow => {
                shadow.position = t.position;
                shadow.rotation = t.rotation;
            })
        });

        this.highlightTarget();
    }

    // Process event handlers for controller input
    private processControllerInput()
    {
        this.onLeftSqueeze(this.leftController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onLeftTrigger(this.leftController?.motionController?.getComponent("xr-standard-trigger"));
        this.onRightSqueeze(this.rightController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
        this.onLeftY(this.leftController?.motionController?.getComponent("y-button"));
        this.onLeftX(this.leftController?.motionController?.getComponent("x-button"));
        this.onRightA(this.rightController?.motionController?.getComponent("a-button"));
    }

    private onRightA(component?: WebXRControllerComponent) {
        if (component?.changes.pressed) {
            if (component?.pressed) {
                if (this.jetpack_equipped) {
                    this.jetpack_equipped = false;
                } else {
                    this.jetpack_equipped = true;
                }
             }
        }
    }

    private onLeftY(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed) {
            if(component?.pressed) {
                if (this.weapon_panel==null) {
                    this.renderWeaponPanel();
                    this.relocatePanel();
                } else if (this.weapon_panel?.isVisible) {
                    this.setWeaponPanelVisibility(false);
                } else if (!this.weapon_panel?.isVisible) {
                    this.setWeaponPanelVisibility(true);
                    this.relocatePanel();
                }
            }
        }
    }

    private onLeftX(component?: WebXRControllerComponent) {  
        // make all targets slow down
        if(component?.changes.pressed) {
            if(component?.pressed) {
                this.in_slow_time = true;
                this.targets.forEach(t => {
                    if (t.isDisposed()) return;  // skip disposed targets
                    var v = t.physicsImpostor!.getLinearVelocity()!;
                    this.targets_velocity_before_VATS.set(t, v);
                    t.physicsImpostor?.setLinearVelocity(v.scale(this.time_slow_factor));
                });
            } else {
                this.targets.forEach(t => {
                    if (t.isDisposed()) return;
                    var v = this.targets_velocity_before_VATS.get(t);
                    t.physicsImpostor?.setLinearVelocity(v!);
                });
                this.targets_velocity_before_VATS.clear();  // clear the map
                this.in_slow_time = false;
            }
        }
    }

    private highlightTarget() : void {
        if (this.weapon_in_leftHand == this.weapon_rifle || this.weapon_in_rightHand == this.weapon_rifle) {
            if (this.rifle_ray) {
                this.rifle_ray.origin = this.weapon_rifle!.absolutePosition.clone();
                this.rifle_ray.direction = this.weapon_rifle!.forward.normalizeToNew();
                var pickInfo = this.scene.pickWithRay(this.rifle_ray);
                var pickedMesh = pickInfo?.pickedMesh;
                if (this.highlighted_mesh) {
                    this.highlighted_mesh.material = null;
                    this.highlighted_mesh = null;
                }
                if (pickedMesh != null && this.in_slow_time) {
                    // there exists picked mesh
                    this.highlighted_mesh = pickedMesh as Mesh;
                    pickedMesh.material = this.shadow_mtl;
                }
            }
        } else {
            // if nothing in hands, reset highlighted mesh to null
            if (this.highlighted_mesh) {
                this.highlighted_mesh.material = null;
                this.highlighted_mesh = null;
            }
        }
    }

    private onRightTrigger(component?: WebXRControllerComponent) {
        // What will happend depends on what's on hand
        if (component?.pressed) {
            // this.fireRifle();
            if (this.weapon_in_rightHand == this.weapon_rifle) {
                this.fireRifle();
            } else if (this.jetpack_equipped) {
                var upwardVelocity = component.value * this.jetpack_max_velocity;
                var moveDistance = (this.engine.getDeltaTime() / 1000) * upwardVelocity;
                this.xrCamera!.position.addInPlace(new Vector3(0, moveDistance, 0));
            }
        }
    }

    private onRightSqueeze(component?: WebXRControllerComponent) {
        if (component?.changes.pressed) {
            if (component?.pressed) {
                if (this.weapon_in_leftHand == this.weapon_archery) {
                    this.grabArrow("right");
                } else {
                    this.findIntersectedWeapon("right");
                }
            } else {
                if (this.weapon_in_rightHand == this.weapon_hatchet) {
                    this.throwHatchet();
                } else if (this.weapon_in_rightHand == this.weapon_archery) {
                    this.weapon_in_leftHand?.setParent(null);
                    this.weapon_in_leftHand = null;
                } else if (this.weapon_in_rightHand == this.weapon_arrow && this.arrow_notched) {
                    this.shootArrow("right");
                }
                this.weapon_in_rightHand?.setParent(null);
                this.weapon_in_rightHand = null;
            }
        }
    }

    private onLeftTrigger(component?: WebXRControllerComponent)
    {
        if (this.jetpack_equipped) {
            if (component?.pressed) {
                var downwardVelocity = component.value * this.jetpack_max_velocity * -1;
                var moveDistance = (this.engine.getDeltaTime() / 1000) * downwardVelocity;
                this.xrCamera!.position.addInPlace(new Vector3(0, moveDistance, 0));
            }
        }
    }

    private onLeftSqueeze(component?: WebXRControllerComponent) {
        if (component?.changes.pressed) {
            if (component?.pressed) {
                if (this.weapon_in_rightHand == this.weapon_archery) {
                    this.grabArrow("left");
                } else {
                    this.findIntersectedWeapon("left");
                }
            } else {
                if (this.weapon_in_leftHand == this.weapon_archery) {
                    this.weapon_in_rightHand?.setParent(null);
                    this.weapon_in_rightHand = null;
                } else if (this.weapon_in_leftHand == this.weapon_arrow && this.arrow_notched) {
                    this.shootArrow("left");
                }
                this.weapon_in_leftHand?.setParent(null);
                this.weapon_in_leftHand = null;
            }
        }
    }

    private grabArrow(hand : string) : void {
        if (this.weapon_arrow) {
            this.weapon_arrow.setEnabled(true);
            if (hand == "right") {
                this.arrow_notched = false;
                this.weapon_arrow.setParent(this.right_grip_transform);
                this.weapon_arrow.position = new Vector3(this.right_grip_transform?.position.x, this.right_grip_transform?.position.y, this.right_grip_transform?.position.z);
                this.weapon_arrow.rotation = new Vector3(this.right_grip_transform!.rotation.x-Math.PI/2, this.right_grip_transform!.rotation.y, this.right_grip_transform!.rotation.z);
                this.weapon_arrow.position.y -= 0.4;
                this.weapon_in_rightHand = this.weapon_arrow;
            } else if (hand == "left") {
                this.arrow_notched = false;
                this.weapon_arrow.setParent(this.left_grip_transform);
                this.weapon_arrow.position = new Vector3(this.left_grip_transform?.position.x, this.left_grip_transform?.position.y, this.left_grip_transform?.position.z);
                this.weapon_arrow.rotation = new Vector3(this.left_grip_transform!.rotation.x-Math.PI/2, this.left_grip_transform!.rotation.y, this.left_grip_transform!.rotation.z);
                this.weapon_arrow.position.y -= 0.4;
                this.weapon_in_leftHand = this.weapon_arrow;
            }
        }
    }

    private notchArrow() {
        if (this.weapon_arrow && this.weapon_archery && this.left_grip_transform && this.right_grip_transform) {
            if (this.weapon_in_leftHand == this.weapon_archery && this.weapon_in_rightHand == this.weapon_arrow) {
                if (Vector3.Distance(this.left_grip_transform.absolutePosition, this.right_grip_transform.absolutePosition) <= 0.25) {
                    this.weapon_arrow.setParent(null);
                    this.weapon_arrow.setParent(this.left_grip_transform);
                    this.weapon_arrow.position = new Vector3(this.left_grip_transform?.position.x, this.left_grip_transform?.position.y, this.left_grip_transform?.position.z);
                    this.weapon_arrow.rotation = new Vector3(this.left_grip_transform!.rotation.x-Math.PI/2, this.left_grip_transform!.rotation.y, this.left_grip_transform!.rotation.z);
                    this.weapon_arrow.position.y -= 0.4;
                    this.arrow_notched = true;
                }
            } else if (this.weapon_in_leftHand == this.weapon_arrow && this.weapon_in_rightHand == this.weapon_archery) {
                if (Vector3.Distance(this.left_grip_transform.absolutePosition, this.right_grip_transform.absolutePosition) <= 0.25) {
                    this.weapon_arrow.setParent(null);
                    this.weapon_arrow.setParent(this.right_grip_transform);
                    this.weapon_arrow.position = new Vector3(this.right_grip_transform?.position.x, this.right_grip_transform?.position.y, this.right_grip_transform?.position.z);
                    this.weapon_arrow.rotation = new Vector3(this.right_grip_transform!.rotation.x-Math.PI/2, this.right_grip_transform!.rotation.y, this.right_grip_transform!.rotation.z);
                    this.weapon_arrow.position.y -= 0.4;
                    this.arrow_notched = true;
                }
            }
        }
    }

    private pullBowString() {
        if (this.weapon_archery && this.weapon_arrow && this.left_grip_transform && this.right_grip_transform) {
            if (this.leftController?.grip && this.rightController?.grip) {
                this.string_pullback = Vector3.Distance(this.leftController.grip?.position, this.rightController.grip?.position);
            }

            if (this.weapon_in_rightHand == this.weapon_archery) {
                this.weapon_arrow.position = new Vector3(this.right_grip_transform?.position.x, this.right_grip_transform?.position.y - 0.4 + this.string_pullback, this.right_grip_transform?.position.z);
                this.weapon_arrow.rotation = new Vector3(this.right_grip_transform!.rotation.x-Math.PI/2, this.right_grip_transform!.rotation.y, this.right_grip_transform!.rotation.z);
            } else if (this.weapon_in_leftHand == this.weapon_archery) {
                this.weapon_arrow.position = new Vector3(this.left_grip_transform?.position.x, this.left_grip_transform?.position.y - 0.4 + this.string_pullback, this.left_grip_transform?.position.z);
                this.weapon_arrow.rotation = new Vector3(this.left_grip_transform!.rotation.x-Math.PI/2, this.left_grip_transform!.rotation.y, this.left_grip_transform!.rotation.z);
            }
        }
    }

    private shootArrow(hand : string) {
        if (!this.sound_swoosh?.isPlaying) {
            this.sound_swoosh?.play();
        }
        var arrow_mesh = this.weapon_arrow!.getChildMeshes()[0];
        var pos = arrow_mesh.getAbsolutePosition().clone();
        var dir = this.leftController?.pointer.absolutePosition.subtract(this.rightController!.pointer.absolutePosition);
        dir?.normalize();
        var rotation_q = arrow_mesh.absoluteRotationQuaternion.clone();

        // this.weapon_arrow?.setParent(null);
        this.arrow_notched = false;
        if (hand == "right") {
            this.weapon_in_rightHand = null;
        } else if (hand == "left") {
            dir?.scaleInPlace(-1);
            this.weapon_in_leftHand = null;
        }

        var instanceArrow = new InstancedMesh("shooted arrow", arrow_mesh as Mesh);
        instanceArrow.parent = null;
        instanceArrow.position = pos;
        instanceArrow.rotationQuaternion = rotation_q;
        instanceArrow.scaling.scaleInPlace(this.weapon_arrow_scale);
        instanceArrow.physicsImpostor = new PhysicsImpostor(instanceArrow, PhysicsImpostor.BoxImpostor, {mass: .5}, this.scene);
        instanceArrow.physicsImpostor!.setLinearVelocity(dir!.scale(this.arrow_velocity*this.string_pullback));
        
        this.weapon_arrow?.setEnabled(false);
    }

    private throwHatchet() : void {
        var r = this.weapon_hatchet?.absoluteRotationQuaternion;
        this.weapon_hatchet?.setParent(null);
        var hatchet_mesh = this.weapon_hatchet!.getChildMeshes()[0];
        var prev_pos = this.right_grip_prev_pos;
        var curr_pos = this.rightController!.grip!.position.clone();
        var dir = curr_pos.subtract(this.right_grip_prev_pos!);
        hatchet_mesh.parent = null;
        hatchet_mesh.scaling.scaleInPlace(this.weapon_hatchet_scale);
        hatchet_mesh.position = prev_pos;
        hatchet_mesh.physicsImpostor = new PhysicsImpostor(hatchet_mesh, PhysicsImpostor.BoxImpostor, {mass: 3}, this.scene);
        hatchet_mesh.rotationQuaternion = r!;
        hatchet_mesh._physicsImpostor!.setLinearVelocity(dir.scale(this.weapon_hatchet_velocity_factor));
        var upperArmLength = 0.3;
        hatchet_mesh.physicsImpostor!.setAngularVelocity(dir.scale(10/upperArmLength)); 
    }

    private fireRifle() : void {
        if (!this.sound_shoot?.isPlaying) {
            this.sound_shoot?.play();
        }
        // var laserPoints = [];
        // laserPoints.push(this.weapon_rifle!.absolutePosition.clone());
        // laserPoints.push(this.weapon_rifle!.absolutePosition.add(this.weapon_rifle!.forward.normalizeToNew().scale(10)));
        // //Create a laser pointer and make sure it is not pickable
        // var laserPointer = MeshBuilder.CreateLines("laserPointer", {points: laserPoints}, this.scene);
        // laserPointer.color = Color3.Blue();
        // laserPointer.alpha = .5;
        // laserPointer.isPickable = false;
        var ray = new Ray(this.weapon_rifle!.absolutePosition.clone(), this.weapon_rifle!.forward.normalizeToNew(), 10);
        var pickInfo = this.scene.pickWithRay(ray);

        // If an object was hit, select it
        if(pickInfo?.hit)
        {
            var hit_object = pickInfo!.pickedMesh;
            if (hit_object?.name.startsWith("target")) {
                hit_object.dispose();
            }
        }
    }

    private scaleWeaponOnHand(weapon : TransformNode) : number {
        /*
            return normal scale of when weapons in hand
        */
        var ret_scale = -1;
        switch (weapon) {
            case this.weapon_rifle:
                ret_scale = this.weapon_rifle_scale;
                break;
            case this.weapon_hatchet:
                ret_scale = this.weapon_hatchet_scale;
                break;
            case this.weapon_arrow:
                ret_scale = this.weapon_arrow_scale;
                break;
            case this.weapon_archery:
                ret_scale = this.weapon_archery_scale;
                break;
        }
        return ret_scale;
    }


    private findIntersectedWeapon(hand : string) : void {
        if (hand == "right") {
            for (const weapon of this.weapon_list) {
                for (const mesh of weapon.getChildMeshes()) {
                    if (this.rightController!.grip!.intersectsMesh(mesh)) {
                        var normal_scale = this.scaleWeaponOnHand(weapon);
                        weapon.scaling = Vector3.One().scale(normal_scale);
                        weapon.setParent(this.right_grip_transform);
                        weapon.position = new Vector3(this.right_grip_transform?.position.x, this.right_grip_transform?.position.y, this.right_grip_transform?.position.z);
                        this.alignWeapon(weapon, hand);
                        this.weapon_in_rightHand = weapon;
                        return;
                    }
                }
            }
        } else if (hand == "left") {
            for (const weapon of this.weapon_list) {
                for (const mesh of weapon.getChildMeshes()) {
                    if (this.leftController!.grip!.intersectsMesh(mesh)) {
                        var normal_scale = this.scaleWeaponOnHand(weapon);
                        weapon.scaling = Vector3.One().scale(normal_scale);
                        weapon.setParent(this.left_grip_transform);
                        weapon.position = new Vector3(this.left_grip_transform?.position.x, this.left_grip_transform?.position.y, this.left_grip_transform?.position.z);
                        this.alignWeapon(weapon, hand);
                        this.weapon_in_leftHand = weapon;
                        return;
                    }
                }
            }
        }
    }

    private alignWeapon(weapon : TransformNode, hand : string) {
        // play the sound of load when grabbing rifle
        if (weapon == this.weapon_rifle) {
            if (!this.sound_load?.isPlaying) {
                this.sound_load?.play();
            }
            if (this.rifle_ray == null) {
                this.rifle_ray = new Ray(this.weapon_rifle!.absolutePosition.clone(), this.weapon_rifle!.forward.normalizeToNew(), 20);
            }
        }
        if (hand == "right") {
            if (weapon == this.weapon_archery) {
                weapon.rotation = new Vector3(this.right_grip_transform!.rotation.x, this.right_grip_transform!.rotation.y + Math.PI/2, this.right_grip_transform!.rotation.z+Math.PI/2);
            } else if (weapon == this.weapon_rifle) {
                weapon.rotation = new Vector3(this.right_grip_transform!.position.x+Math.PI/2, this.right_grip_transform!.position.y, this.right_grip_transform!.position.z);
            }
        } else if (hand == "left") {
            if (weapon == this.weapon_archery) {
                weapon.rotation = new Vector3(this.left_grip_transform!.rotation.x, this.left_grip_transform!.rotation.y + Math.PI/2, this.left_grip_transform!.rotation.z+Math.PI/2);
            } else if (weapon == this.weapon_rifle) {
                weapon.rotation = new Vector3(this.left_grip_transform!.position.x+Math.PI/2, this.left_grip_transform!.position.y, this.left_grip_transform!.position.z);
            }
        }
    }

    private steerJetPack() : void {
        if (this.rightController && this.leftController) {
            var totalMovementVector = new Vector3();

            // Calculate component for movement in the left-right direction
            var lrAngle = 0;
            var lrCoefficient = 0;
            var lrDirection = new Vector3();

            // Find angle between xz plane and bimanual line
            if (this.rightController!.grip!.position.y > this.leftController!.grip!.position.y) {
                var h = this.leftController!.grip!.position.subtract(this.rightController!.grip!.position).length();
                var o = this.rightController!.grip!.position.y - this.leftController!.grip!.position.y;
                lrAngle = Math.asin(o / h);

                lrDirection = this.leftController!.grip!.position.subtract(this.rightController!.grip!.position);
                lrDirection.y = 0;
                lrDirection.normalize();
            } else {
                var h = this.leftController!.grip!.position.subtract(this.rightController!.grip!.position).length();
                var o = this.leftController!.grip!.position.y - this.rightController!.grip!.position.y;
                lrAngle = Math.asin(o / h);

                lrDirection = this.rightController!.grip!.position.subtract(this.leftController!.grip!.position);
                lrDirection.y = 0;
                lrDirection.normalize();
            }

            // 45 degree max angle
            if (lrAngle > Math.PI/4) {
                lrCoefficient = 1;
            } else {
                lrCoefficient = lrAngle / (Math.PI/4);
            }

            // Calculate component for movement in the forward-back direction
            var fbAngle = 0;
            var fbCoefficient = 0;
            var fbDirection = new Vector3();
            var midpoint = this.rightController!.grip!.position.add(this.leftController.grip!.position).scale(.5);

            // Find angle between the line from midpoint to headset and the y axis
            var hyp = this.xrCamera!.position.subtract(midpoint).length();
            var opp = this.xrCamera!.position.subtract(new Vector3(midpoint.x, this.xrCamera!.position.y, midpoint.z)).length();
            fbAngle = Math.asin(opp / hyp);

            fbDirection = this.xrCamera!.position.subtract(midpoint);
            fbDirection.y = 0;
            fbDirection.normalize();

            // 45 degree max angle
            if (fbAngle > Math.PI/4) {
                fbCoefficient = 1;
            } else {
                fbCoefficient = fbAngle / (Math.PI/4);
            }

            // Calculate total movement on the xz plane
            totalMovementVector = (fbDirection.scale(fbCoefficient));
            this.xrCamera!.position.addInPlace(totalMovementVector.scale(this.jetpack_max_velocity * this.engine.getDeltaTime() / 1000));
        }
    }

    private relocatePanel() : void {
        /* 
           recalculate the rotation and posistion to always put panel
           in front of camera
        */

        this.weapon_panel!.linkToTransformNode(this.weapon_panel_transform!);
        
        var panel_position = this.xrCamera!.globalPosition.clone();

        this.weapon_panel_transform!.position = panel_position;

        this.weapon_panel!.position = new Vector3(0, 0, -this.weapon_panel_radius + 0.5);
        
        var y = this.xrCamera!.rotationQuaternion.toEulerAngles().y;
        var rotation_q = Quaternion.FromEulerAngles(0, y, 0);
        this.weapon_panel_transform!.rotationQuaternion = rotation_q;
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
            this.weapon_panel.margin = .05;
            // this.weapon_panel.blockLayout = true;
            this.weapon_panel.rows = 1;
    
            var size_button = new Vector3(2, .1, 2);
            var scale = .2;

            size_button.scaleInPlace(scale);

            var a = MeshBuilder.CreateBox("button", {width: size_button.x, depth:size_button.y, height:size_button.z})
            a.visibility = .1;
            var pushButton = new MeshButton3D(a, "pushButton");
            this.weapon_rifle!.parent = a;
            this.weapon_rifle!.rotation.y += Math.PI/2;
            this.weapon_rifle?.scaling.scaleInPlace(scale * .8);
            this.weapon_panel.addControl(pushButton);
    
            var b = MeshBuilder.CreateBox("button", {width: size_button.x, depth:size_button.y, height:size_button.z});
            b.visibility = .1;
            var pushButton = new MeshButton3D(b, "pushButton");
            this.weapon_archery!.parent = b;
            this.weapon_archery?.scaling.scaleInPlace(scale);
            this.weapon_panel.addControl(pushButton);
            
            var c = MeshBuilder.CreateBox("button", {width: size_button.x, depth:size_button.y, height:size_button.z});
            c.visibility = .1;
            var pushButton = new MeshButton3D(c, "pushButton");
            this.weapon_hatchet!.parent = c;
            this.weapon_hatchet!.rotation.y += Math.PI/2;
            this.weapon_hatchet?.scaling.scaleInPlace(scale);
            this.weapon_panel.addControl(pushButton);
        }
        this.relocatePanel();
    }

    private loadAssets() : void {
        var pos = MeshBuilder.CreateSphere("sphere", {diameter:1}, this.scene);
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

            this.world?.scaling.scaleInPlace(2.5);
            this.world?.position.addInPlace(new Vector3(0,-5.35,0));
        };
        //this.world.setEnabled(false);

        // Sound effects
        var sound_swoosh_task = assetsManager.addBinaryFileTask("sound_swoosh", "assets/sounds/swoosh.wav");
        sound_swoosh_task.onSuccess = (task) => {
            this.sound_swoosh = new Sound("swoosh", task.data, this.scene, null, {
                loop: false,
            });
        };

        var sound_jp_task = assetsManager.addBinaryFileTask("sound_jp", "assets/sounds/jp.wav");
        sound_jp_task.onSuccess = (task) => {
            this.sound_jp = new Sound("jet pack", task.data, this.scene, null, {
                loop: false,
            });
        };

        var sound_shoot_task = assetsManager.addBinaryFileTask("sound_shoot", "assets/sounds/shot.wav");
        sound_shoot_task.onSuccess = (task) => {
            this.sound_shoot = new Sound("shoot", task.data, this.scene, null, {
                loop: false,
            });
        };

        var sound_load_task = assetsManager.addBinaryFileTask("sound_load", "assets/sounds/unload.wav");
        sound_load_task.onSuccess = (task) => {
            this.sound_load = new Sound("load", task.data, this.scene, null, {
                loop: false,
            });
        };

        this.weapon_archery = new TransformNode("archery", this.scene);
        var weapon_archery_task = assetsManager.addMeshTask("weapon_archery", "", "assets/models/", "bow.obj");
        weapon_archery_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                element.parent = this.weapon_archery;
                element.isPickable = false;
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
            this.weapon_arrow_mesh = Mesh.MergeMeshes(task.loadedMeshes as Mesh[]);
            this.weapon_arrow_mesh!.isPickable = false;
            this.weapon_arrow_mesh!.parent = this.weapon_arrow;
            this.weapon_arrow!.scaling.scaleInPlace(this.weapon_arrow_scale);
        };

        this.weapon_rifle = new TransformNode("weapon_rifle", this.scene);
        var weapon_rifle_task = assetsManager.addMeshTask("weapon_rifle", "", "assets/models/", "rifle.obj");
        weapon_rifle_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                if (element.name == "default") {
                    element.dispose();
                    return;
                }
                element.isPickable = false;
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
                element.isPickable = false;
                element.parent = this.weapon_hatchet;
            });
            this.weapon_hatchet?.scaling.scaleInPlace(this.weapon_hatchet_scale);
        };

        this.target = new TransformNode("target", this.scene);
        var target_task = assetsManager.addMeshTask("target", "", "assets/models/", "archery-target.obj");
        target_task.onSuccess = (task) => {
            task.loadedMeshes.forEach(element => {
                element.parent = this.target;
                element.scaling.scaleInPlace(this.target_scale);
            });
        };

        // This loads all the assets and displays a loading screen
        assetsManager.load();
    }


    private generateTarget() : void {
        if (!this.gameStarted || !this.challenge_mode) return;

        // Do clean up to avoid having too many unused targets
        if (this.targets?.length >= 10) {
            var x = this.targets.shift();
            if (x?.isVisible) {
                // delete corresponding shadow meshes
                this.targets_shadows.get(x)?.forEach(mesh => {
                    mesh.dispose();
                })
                this.targets_shadows.delete(x); // clean the map
                x?.dispose();
            }
        }

        var a = MeshBuilder.CreateSphere("target", {diameter: 0.4}, this.scene);
        var b = MeshBuilder.CreateBox("target_top", {height:0.5, width:0.1, depth:0.1});
        var c = MeshBuilder.CreateBox("target_bottom", {height:0.5, width:0.2, depth:0.1});
        var arr = [a, b, c];
        var arr_shadow = [];
        for (var i=0; i<arr.length; i++) {
            var shadow_mesh = arr[i].clone();
            arr_shadow.push(shadow_mesh);
            shadow_mesh.visibility = 1;
        }
        var target = Mesh.MergeMeshes(arr);


        if (target) {
            target.visibility = 0;  // hide real targets
            target.isPickable = false;
            // store mapping like target -> shadow meshes array
            this.targets_shadows.set(target, arr_shadow as Mesh[]);
            target.physicsImpostor = new PhysicsImpostor(target as IPhysicsEnabledObject, PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
            target.physicsImpostor?.wakeUp();
            target.position = this.target_initial_pos.clone();
            var shift = new Vector3(2*Math.random() - 1, 2*Math.random() - 1, 2*Math.random() - 1);
            target.position.addInPlace(shift);
        
    
            var dir = this.xrCamera?.globalPosition.subtract(target.position);
            dir!.y = 0;
            dir?.normalize();

            // if a target is created when VATS is on, 
            // store its initial velocity in map and scale it
            var v = dir!.scale(this.target_initial_velocity);
            if (this.in_slow_time) {
                this.targets_velocity_before_VATS.set(target, v);
                v = v.scale(this.time_slow_factor);
            }
            target.physicsImpostor?.setLinearVelocity(v);
            this.targets?.push(target);
        }
    }
}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();

import { Environment } from './environment.js';
import { Player } from './characterController.js';

const { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight,
  Mesh, MeshBuilder, FreeCamera, Color4, StandardMaterial, Color3,
  PointLight, ShadowGenerator, Quaternion, Matrix } = BABYLON;
const { AdvancedDynamicTexture, Button, Control } = BABYLON.GUI;


let containerId = "appkanvas";
let Config;
const State = {
  START: 0,
  GAME: 1,
  LOSE: 2,
  CUTSCENE: 3
};
if (Object.freeze) Object.freeze(State);


class App {
  #config;

  #scene;
  #kanvas;
  #engine;

  #state;
  #gameScene;
  #cutScene;

  #assets;
  #environment;
  #player;

  constructor(containerId) {
    this.#state = State.START;
    
    this.#kanvas = this.#createCanvas(containerId);
    this.#engine = new Engine(this.#kanvas, true);
    this.#scene = new Scene(this.#engine);
    
    window.addEventListener("keydown", (ev) => {
      // Shift + Ctrl + Alt + I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (this.#scene.debugLayer.isVisible()) {
          this.#scene.debugLayer.hide();
        } else {
          this.#scene.debugLayer.show();
        }
      }
    });

    this.#main();
  }

  async #getConfig() {
    let res = {};
    try {
      let resp = await fetch('/config.json');
      res = await resp.json();
    } catch (e) {
      console.log(e);
      res = {
        errId: 1001
      }
    }
    return res;
  }

  #createCanvas(containerId) {
    document.documentElement.style["overflow"] = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    let kanvas = document.createElement("canvas");
    kanvas.style.width = "100%";
    kanvas.style.height = "100%";
    kanvas.id = "kanvas";
    const element = document.getElementById(containerId);
    element.appendChild(kanvas);
    this.#kanvas = kanvas;
    return this.#kanvas;
  }

  async #main() {
    console.log("---- main");
    this.#config = await this.#getConfig();
    console.log(this.#config);
    await this.#gotoStart();

    this.#engine.runRenderLoop(() => {
      switch (this.#state) {
        case State.START:
          this.#scene.render();
          break;
        case State.CUTSCENE:
          this.#scene.render();
          break;
        case State.GAME:
          this.#scene.render();
          break;
        case State.LOSE:
          this.#scene.render();
          break;
        default: break;
      }
    });


    window.addEventListener("resize", () => {
      this.#engine.resize();
      console.log(`---- resize ${new Date()}`);
    });

  }

  async #gotoStart() {
    console.log("---- gotoStart");
    this.#engine.displayLoadingUI();
    this.#scene.detachControl();
    let scene = new Scene(this.#engine);
    scene.clearColor = new Color4(0,0,0,1)
    let camera = new FreeCamera("camera1", new Vector3(0,0,0), scene);
    camera.setTarget(Vector3.Zero());

    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    guiMenu.idealHeight = 720;

    const startBtn = Button.CreateSimpleButton("start", "PLAY");
    startBtn.width = 0.2;
    startBtn.height = "40px";
    startBtn.color = "white";
    startBtn.top = "-14px";
    startBtn.thickness = 0;
    startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    guiMenu.addControl(startBtn);

    startBtn.onPointerDownObservable.add(() => {
      console.log("---- startBtn");
      this.#gotoCutScene();
      scene.detachControl();
    });

    await scene.whenReadyAsync();
    this.#engine.hideLoadingUI();
    this.#scene.dispose();
    this.#scene = scene;
    this.#state = State.START;
  }

  async #gotoCutScene() {
    console.log("---- gotoCutScene");
    this.#engine.displayLoadingUI();
    this.#scene.detachControl();
    this.#cutScene = new Scene(this.#engine);
    let camera = new FreeCamera("camera1", new Vector3(0,0,0), this.#cutScene);
    camera.setTarget(Vector3.Zero());
    this.#cutScene.clearColor = new Color4(0,0,0,1);

    const cutScene = AdvancedDynamicTexture.CreateFullscreenUI("cutscene");

    const next = Button.CreateSimpleButton("next", "NEXT");
    next.color = "white";
    next.thickness = 0;
    next.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    next.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    next.width = "64px";
    next.height = "64px";
    next.top = "-3%";
    next.left = "-12%";
    cutScene.addControl(next);

    next.onPointerUpObservable.add(() => {
      this.#gotoGame();
    });

    await this.#cutScene.whenReadyAsync();
    this.#engine.hideLoadingUI();
    this.#scene.dispose();
    this.#state = State.CUTSCENE;
    this.#scene = this.#cutScene;

    let finishedLoading = false;
    await this.#setupGame().then(res => {
      finishedLoading = true;
    });
  }

  async #setupGame() {
    console.log("---- setupGame");
    let scene = new Scene(this.#engine);
    this.#gameScene = scene;

    const environment = new Environment(scene);
    this.#environment = environment;
    await this.#environment.load();
    await this.#loadCharacterAssets(scene);

  }

  async #loadCharacterAssets(scene) {
    console.log("---- loadCharacterAssets");
    
    async function loadCharacter() {

      const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
      outer.isVisible = false;
      outer.isPickable = false;
      outer.checkCollisions = true;

      outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

      outer.ellipsoid = new Vector3(1, 1.5, 1);
      outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

      outer.rotationQuaternion = new Quaternion(0, 1, 0, 0);

      let box = MeshBuilder.CreateBox("Small1", { width: 0.5, depth: 0.5, height: 0.25, faceColors: [new Color4(0,0,0,1), new Color4(0,0,0,1), new Color4(0,0,0,1), new Color4(0,0,0,1),new Color4(0,0,0,1), new Color4(0,0,0,1)] }, scene);
      box.position.y = 1.5;
      box.position.z = 1;

      let body = Mesh.CreateCylinder("body", 3, 2,2,0,0, scene);
      let bodymtl = new StandardMaterial("red", scene);
      bodymtl.diffuseColor = new Color3(.8, .5, .5);
      body.material = bodymtl;
      body.isPickable = false;
      body.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

      box.parent = body;
      body.parent = outer;

      return {
        mesh: outer
      }
    }

    return loadCharacter().then(assets => {
      this.#assets = assets;
    });
  }


  async #initializeGameAsync(scene) {
    console.log("---- initializeGameAsync");

    let light0 = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);
    const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
    light.diffuse = new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825);
    light.intensity = 35;
    light.radius = 1;

    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.darkness = 0.4;

    this.#player = new Player(this.#assets, scene, shadowGenerator);
  }

  async #gotoGame() {
    console.log("---- gotoGame");
    this.#scene.detachControl();
    let scene = this.#gameScene;
    scene.clearColor = new Color4(0.01568627450980392, 0.01568627450980392, 0.20392156862745098);

    const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    scene.detachControl();

    const loseBtn = Button.CreateSimpleButton("lose", "LOSE");
    loseBtn.width = 0.2;
    loseBtn.height = "40px";
    loseBtn.color = "white";
    loseBtn.top = "-14px";
    loseBtn.thickness = 0;
    loseBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    playerUI.addControl(loseBtn);

    loseBtn.onPointerDownObservable.add(() => {
      this.#gotoLose();
      scene.detachControl();
    });

    await this.#initializeGameAsync(scene);

    await scene.whenReadyAsync();
    scene.getMeshByName("outer").position = new Vector3(0, 3, 0);

    this.#scene.dispose();
    this.#state = State.GAME;
    this.#scene = scene;
    this.#engine.hideLoadingUI();
    this.#scene.attachControl();
  }

  async #gotoLose() {
    console.log("---- gotoLose");
    this.#engine.displayLoadingUI();

    this.#scene.detachControl();
    let scene = new Scene(this.#engine);
    scene.clearColor = new Color4(0,0,0,1);
    let camera = new FreeCamera("camera1", new Vector3(0,0,0), scene);
    camera.setTarget(Vector3.Zero());

    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    const mainBtn = Button.CreateSimpleButton("mainmenu", "MAINMENU");
    mainBtn.width = 0.2;
    mainBtn.height = "40px";
    mainBtn.color = "white";
    guiMenu.addControl(mainBtn);
    mainBtn.onPointerUpObservable.add(() => {
      this.#gotoStart();
    });

    await scene.whenReadyAsync();
    this.#engine.hideLoadingUI();
    this.#scene.dispose();
    this.#scene = scene;
    this.#state = State.LOSE;
  }








}

new App(containerId);


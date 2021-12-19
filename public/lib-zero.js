

const { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight,
  Mesh, MeshBuilder, FreeCamera, Color4, StandardMaterial, Color3,
  PointLight, ShadowGenerator, Quaternion, Matrix } = BABYLON;
const { AdvancedDynamicTexture, Button, Control } = BABYLON.GUI;

// -- CONFIG --------------------------------------

const maindiv = "appkanvas";

// ------------------------------------------------

const State = {
  START: 0,
  GAME: 1,
  LOSE: 2,
  CUTSCENE: 3
};
if (Object.freeze) Object.freeze(appstate);

class App {
  #scene;
  #kanvas;
  #engine;

  #state;
  #gameScene;
  #cutScene;

  let assets;
  #environment;
  #player;

  constructor() {
    this.#state = State.START;
    
    this.#kanvas = this.#createCanvas();
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

  loadConfig() {
    return true;  
  }

  #createCanvas(div) {
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
    const element = document.getElementById(div);
    element.appendChild(kanvas);
    this.#kanvas = kanvas;
    return this.#kanvas;
  }

  #main() {
    await this.#gotoStart();

    this.#engine.runRenderLoop(() => {
      switch (this.#state) {
        case appstate.START:
          this.#scene.render();
          break;
        case appstate.CUTSCENE:
          this.#scene.render();
          break;
        case appstate.GAME:
          this.#scene.render();
          break;
        case appstate.LOSE:
          this.#scene.render();
          break;
        default: break;
      }
    });


    window.addEventListener("resize", () => {
      this.#engine.resize();
      console.log(`resize ${new Date()}`);
    });

  }

  async #gotoStart() {
    console.log("gotoStart");
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
      console.log("Click Play");
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
    console.log("gotoCutScene");
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
    this.#state = appstate.CUTSCENE;
    this.#scene = this.#cutScene;

    let finishedLoading = false;
    await this.#setupGame().then(res => {
      finishedLoading = true;
    });
  }

  async #setupGame() {
    console.log("setupGame");
    let scene = new Scene(this.#engine);
    this.#gameScene = scene;

    const environment = new Environment(scene);
    this.#environment = environment;
    await this.#environment.load();
    await this.#loadCharacterAssets(scene);

  }

  async #loadCharacterAssets(scene) {

  }

  async #gotoGame() {
    console.log("gotoGame");
    this.#scene.detachControl();
    let scene = this.#gameScene;
    scene.clearColor = new Color4(0.01568627450980392, 0.01568627450980392, 0.20392156862745098);
    let camera = new ArcRotateCamera("camera", Math.PI/2, Math.PI/2, 2, BABYLON.Vector3.Zero(), scene);
    camera.setTarget(Vector3.Zero());

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

    let light1 = new HemisphericLight("light1", new Vector3(1,1,0), scene);
    let sphere = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);

    await scene.whenReadyAsync();
    this.#scene.dispose();
    this.#state = appstate.GAME;
    this.#scene = scene;
    this.#engine.hideLoadingUI();
    this.#scene.attachControl();
  }

  async #gotoLose() {
    console.log("gotoLose");
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
    this.#state = appstate.LOSE;
  }








}

let libzero = new LibZero();
libzero.init();
libzero.loop();


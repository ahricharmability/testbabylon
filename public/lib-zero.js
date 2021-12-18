// -- CONFIG --------------------------------------

const maindiv = "appkanvas";

// ------------------------------------------------

const appstate = {
  START:0,
  CUTSCENE:1,
  GAME:2,
  LOST:3
};
if (Object.freeze) Object.freeze(appstate);

class LibZero {
  #state;
  #scene;
  #kanvas;
  #engine;

  #gameScene;
  #cutScene;

  constructor() {
    // LOAD CONFIG
    this.#state = appstate.START;
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
    return kanvas;
  }

  init() {
    console.log("!!!!! lib-zero init !!!!!");
    this.#kanvas = this.#createCanvas(maindiv);
    this.#engine = new BABYLON.Engine(this.#kanvas, true);
    this.#scene = new BABYLON.Scene(this.#engine);
    //const scene = createScene();
  
    let camera = new BABYLON.ArcRotateCamera("Camera",
      Math.PI / 2, Math.PI / 2, 2, 
      BABYLON.Vector3.Zero(), this.#scene);
    camera.attachControl(this.#kanvas, true);
    let light1 = new BABYLON.HemisphericLight("light1", 
      new BABYLON.Vector3(1, 1, 0), this.#scene);
    let sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this.#scene);
 
    this.#gotoStart();

    window.addEventListener("keydown", (ev) => {
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (this.#scene.debugLayer.isVisible()) {
          this.#scene.debugLayer.hide();
        } else {
          this.#scene.debugLayer.show();
        }
      }
    });

    window.addEventListener("resize", () => {
      this.#engine.resize();
      console.log(`resize ${new Date()}`);
    });
  }

  loop() {
    this.#engine.runRenderLoop(() => {
      this.#scene.render();
    });
  }

  async #gotoStart() {
    console.log("gotoStart");
    this.#engine.displayLoadingUI();
    this.#scene.detachControl();
    let scene = new BABYLON.Scene(this.#engine);
    scene.clearColor = new BABYLON.Color4(0,0,0,1)
    let camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0,0,0), scene);
    camera.setTarget(BABYLON.Vector3.Zero());

    const guiMenu = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    guiMenu.idealHeight = 720;

    const startBtn = BABYLON.GUI.Button.CreateSimpleButton("start", "PLAY");
    startBtn.width = 0.2;
    startBtn.height = "40px";
    startBtn.color = "white";
    startBtn.top = "-14px";
    startBtn.thickness = 0;
    startBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
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
    this.#state = appstate.START;
  }

  async #gotoCutScene() {
    console.log("gotoCutScene");
    this.#engine.displayLoadingUI();
    this.#scene.detachControl();
    this.#cutScene = new BABYLON.Scene(this.#engine);
    let camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0,0,0), this.#cutScene);
    camera.setTarget(BABYLON.Vector3.Zero());
    this.#cutScene.clearColor = new BABYLON.Color4(0,0,0,1);

    const cutScene = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("cutscene");

    const next = BABYLON.GUI.Button.CreateSimpleButton("next", "NEXT");
    next.color = "white";
    next.thickness = 0;
    next.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    next.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
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

  async #gotoGame() {
    console.log("gotoGame");
    this.#scene.detachControl();
    let scene = this.#gameScene;
    scene.clearColor = new BABYLON.Color4(0.01568627450980392, 0.01568627450980392, 0.20392156862745098);
    let camera = new BABYLON.ArcRotateCamera("camera", Math.PI/2, Math.PI/2, 2, BABYLON.Vector3.Zero(), scene);
    camera.setTarget(BABYLON.Vector3.Zero());

    const playerUI = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    scene.detachControl();

    const loseBtn = BABYLON.GUI.Button.CreateSimpleButton("lose", "LOSE");
    loseBtn.width = 0.2;
    loseBtn.height = "40px";
    loseBtn.color = "white";
    loseBtn.top = "-14px";
    loseBtn.thickness = 0;
    loseBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    playerUI.addControl(loseBtn);

    loseBtn.onPointerDownObservable.add(() => {
      this.#gotoLose();
      scene.detachControl();
    });

    let light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1,1,0), scene);
    let sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);

    await scene.whenReadyAsync();
    this.#scene.dispose();
    this.#state = appstate.GAME;
    this.#scene = scene;
    this.#engine.hideLoadingUI();
    this.#scene.attachControl();
  }

  #gotoLose() {
    console.log("gotoLose");
  }


  async #setupGame() {
    console.log("setupGame");
    let scene = new BABYLON.Scene(this.#engine);
    this.#gameScene = scene;

    // ....load assets
    
  }






}

let libzero = new LibZero();
libzero.init();
libzero.loop();


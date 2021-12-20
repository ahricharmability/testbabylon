const { Scene, Mesh, Vector3, Color3, TransformNode, SceneLoader, ParticleSystem, Color4, Texture, PBRMetallicRoughnessMaterial, VertexBuffer, AnimationGroup, Sound, ExecuteCodeAction, ActionManager, Tags } = BABYLON;
import { Lantern } from "./lantern.js";
import { Player } from "./characterController.js";

export class Environment {
  #scene;

  //Meshes
  #lanternObjs;
  #lightmtl;

  //fireworks
  #fireworkObjs;
  #startFireworks;

  constructor(scene) {
    console.log("---- Environment ---- constructor");  
    
    this.#scene = scene;
    this.#lanternObjs = [];

    const lightmtl = new PBRMetallicRoughnessMaterial("lantern mesh light", this.#scene);
    lightmtl.emissiveTexture = new Texture("/textures/litLantern.png", this._scene, true, false);
    lightmtl.emissiveColor = new Color3(0.8784313725490196, 0.7568627450980392, 0.6235294117647059);
    this.#lightmtl = lightmtl;
  }

  async load() {
    console.log("---- Environment ---- load");

    const assets = await this.#loadAsset();
    assets.allMeshes.forEach(m => {
      m.receiveShadows = true;
      m.checkCollisions = true;

      if (m.name == "ground") {
        m.checkCollisions = false;
        m.isPickable = false;
      }

      if (m.name.includes("stairs") || m.name == "cityentranceground") {
        m.checkCollisions = false;
        m.isPickable = false;
      }

      if (m.name.includes("collisions")) {
        m.isVisible = false;
        m.isPickable = true;
      }

      if (m.name.includes("Trigger")) {
        m.isVisible = false;
        m.isPickable = false;
        m.checkCollisions = false;
      }
    });
    
    assets.lantern.isVisible = false;
    const lanternHolder = new TransformNode("lanternHolder", this.#scene);
    for (let i = 0; i < 22; i++) {
      let lanternInstance = assets.lantern.clone("lantern" + i);
      lanternInstance.isVisible = true;
      lanternInstance.setParent(lanternHolder);

      let animGroupClone = new AnimationGroup("lanternAnimGroup" + i);
      animGroupCLone.addTargetAnimation(assets.animationGroups.targetedAnimations[0].animation, lanternInstance);

      let newLantern = new Lantern(this.#lightmtl, lanternInstance, this.#scene, assets.env.getChildTransformNodes(false).find(m => m.name === "lantern " + i).getAbsolutePosition(), animGroupClone);
      this.#lanternObjs.push(newLantern);
    }
    assets.lantern.dispose();
    assets.animationGroups.dispose();

    for (let i = 0; i < 20; i++) {
      this.#fireworkObjs.push(new Firework(this.#scene, i));
    }

    this.#scene.onBeforeRenderObservable.add(() => {
      this.#fireworkObjs.forEach(f => {
        if (this.#startFireworks) {
          f.startFirework();
        }
      });
    });
  }

  async #loadAsset() {
    const result = await SceneLoader.ImportMeshAsync(null, "./models/", "envSetting.glb", this.#scene);

    let env = result.meshes[0];
    let allMeshes = env.getChildMeshes();

    const res = await SceneLoader.ImportMeshAsync("", "./models/", "lantern.glb", this.#scene);

    let lantern = res.meshes[0].getChildren()[0];
    lantern.parent = null;
    res.meshes[0].dispose();

    const importedAnims = res.animationGroups;
    let animation = [];
    animation.push(importedAnims[0].targetedAnimations[0].animation);
    importedAnims[0].dispose();
    let animGroup = new AnimationGroup("lanternAnimGroup");
    animGroup.addTargetedAnimation(animation[0], res.meshed[1]);

    return {
      env: env,
      allMeshes: allMeshes,
      lantern: lantern,
      animationGroups: animGroup
    }
  }

  checkLanterns(player) {
    if (!this.#lanternObjs[0].isLit) {
      this.#lanternObjs[0].setEmissiveTexture();
    }
    this.#lanternObjs.forEach(lantern => {
      player.mesh.actionManager.registerAction(
        new ExecuteCodeAction(
          {
            trigger: ActionManager.OnIntersectionEnterTrigger,
            parameter: lantern.mesh
          },
          () => {
            if (!lantern.isLit && player.sparkLit) {
              player.lanternsLit += 1;
              lantern.setEmissiveTexture();
              player.sparkReset = true;
              player.sparkLit = true;
              player.lightSfx.play();
            } else if (lantern.isLit) {
              player.sparkReset = true;
              player.sparkLit = true;
              player.sparkResetSfx.play();
            }
          }
        )
      );
    });
  }



}

class Firework {
  #scene;
  #emitter;
  #rocket;
  #exploded;
  #height;
  #delay;
  #started;

  #explosionSfx;
  #rocketSfx;

  constructor(scene) {
    this.#scene = scene;
    const sphere = Mesh.CreateSphere("rocket", 4, 1, scene);
    sphere.isVisible = false;
    let randPos = Math.random() * 10;
    sphere.position = (new Vector3(scene.getTransformNodeByName("fireworks").getAbsolutePosition().x + randPos * -1, scene.getTransformNodeByName("fireworks").getAbsolutePosition().y, scene.getTransformNodeByName("fireworks").getAbsolutePosition().z));
    this.#emitter = sphere;

    let rocket = new ParticleSystem("rocket", 350, scene);
    rocket.particleTexture = new Texture("./texture/flare.png", scene);
    rocket.emitter = sphere;
    rocket.emitRate = 20;
    rocket.minEmitBox = new Vector3(0, 0, 0);
    rocket.maxEmitBox = new Vector3(0, 0, 0);
    rocket.color1 = new Color4(0.49, 0.57, 0.76);
    rocket.color2 = new Color4(0.29, 0.29, 0.66);
    rocket.colorDead = new Color4(0, 0, 0.2, 0.5);
    rocket.minSize = 1;
    rocket.maxSize = 1;
    rocket.addSizeGradient(0, 1);
    rocket.addSizeGradient(1, 0.01);
    this.#rocket = rocket;

    this.#height = sphere.position.y + Math.random() * (15 + 4) + 4;
    this.#delay = (Math.random() * i + 1) * 60;

    this.#loadSounds();
  }

  #explosions(position) {
    const explosion = Mesh.CreateSphere("explosion", 4, 1, this._scene);
    explosion.isVisible = false;
    explosion.position = position;
    
    let emitter = explosion;
    emitter.useVertexColors = true;
    let vertPos = emitter.getVerticesData(VertexBuffer.PositionKind);
    let vertNorms = emitter.getVerticesData(VertexBuffer.NormalKind);
    let vertColors = [];

    for (let i = 0; i < vertPos.length; i += 3) {
      let vertPosition = new Vector3(
        vertPos[i], vertPos[i + 1], vertPos[i + 2]
      )
      let vertNormal = new Vector3(
        vertNorms[i], vertNorms[i + 1], vertNorms[i + 2]
      )
      let r = Math.random();
      let g = Math.random();
      let b = Math.random();
      let alpha = 1.0;
      let color = new Color4(r, g, b, alpha);
      vertColors.push(r);
      vertColors.push(g);
      vertColors.push(b);
      vertColors.push(alpha)
      
      let gizmo = Mesh.CreateBox("gizmo", 0.001, this._scene);
      gizmo.position = vertPosition;
      gizmo.parent = emitter;
      let direction = vertNormal.normalize().scale(1); 

      const particleSys = new ParticleSystem("particles", 500, this._scene);
      particleSys.particleTexture = new Texture("textures/flare.png", this._scene);
      particleSys.emitter = gizmo;
      particleSys.minEmitBox = new Vector3(1, 0, 0);
      particleSys.maxEmitBox = new Vector3(1, 0, 0);
      particleSys.minSize = .1;
      particleSys.maxSize = .1;
      particleSys.color1 = color;
      particleSys.color2 = color;
      particleSys.colorDead = new Color4(0, 0, 0, 0.0);
      particleSys.minLifeTime = 1;
      particleSys.maxLifeTime = 2;
      particleSys.emitRate = 500;
      particleSys.gravity = new Vector3(0, -9.8, 0);
      particleSys.direction1 = direction;
      particleSys.direction2 = direction;
      particleSys.minEmitPower = 10;
      particleSys.maxEmitPower = 13;
      particleSys.updateSpeed = 0.01;
      particleSys.targetStopDuration = 0.2;
      particleSys.disposeOnStop = true;
      particleSys.start();
    }
    emitter.setVerticesData(VertexBuffer.ColorKind, vertColors);
  }

  startFirework() {
    if (this.#started) {
      if (this.#emitter.position.y >= this.#height && !this.#exploded) {
        this.#explosionSfx.play();
        this.#exploded = !this.#exploded;
        this.#explosions(this.#emitter.position);
        this.#emitter.dispose();
        this.#rocket.stop();
      } else {
        this.#emitter.position.y += .2;
      }
    } else {
      if (this.#delay <= 0) {
        this.#started = true;
        this.#rocketSfx.play();
        this.#rocket.start();
      } else {
        this.#delay--;
      }
    }
  }

  #loadSounds() {
    this.#rocketSfx = new Sound("selection", "./sounds/fw_05.wav", 
      this.#scene, function(){},{volumn: 0.5});

    this.#explosionSfx = new Sound("selection", "./sounds/fw_03.wav",
      this.#scene, function(){},{volumn: 0.5});

  }





}


const { Scene, Color3, Mesh, Vector3, PointLight, Texture, Color4, ParticleSystem, AnimationGroup, PBRMetallicRoughnessMaterial } = BABYLON;

export class Lantern {
  #scene;
  
  mesh;
  isLit;
  #lightmtl;
  #light;

  #spinAnim;
  #stars;

  constructor(lightmtl, mesh, scene, position, animationGroups) {
    this.#scene = scene;
    this.#lightmtl = lightmtl;
    this.#loadLantern(mesh, position);
    this.#loadStars();
    this.#spinAnim = animationGroups;

    const light = new PointLight("lantern light", this.mesh.getAbosolutePosition, this.#scene);
    light.intensity = 0;
    light.radius = 2;
    light.diffuse = new Color3(0.45, 0.56, 0.80);
    this.#light = light;
    this.#findNearestMeshes(light);
  }

  #loadLantern(mesh, position) {
    this.mesh = mesh;
    this.mesh.scaling = new Vector3(.8, .8, .8);
    this.mesh.setAbsolutePosition(position);
    this.mesh.isPickable = false;
  }

  setEmissiveTexture() {
    this.isLit = true;
    this.#spinAnim.play();
    this.#stars.start();
    this.mesh.material = this.#lightmtl;
    this.#light.intensity = 30;
  }

  #findNearestMeshes(light) {
    if (this.mesh.name.includes("14") || this.mesh.name.includes("15")) {
      light.includedOnlyMeshes.push(this.#scene.getMeshByName("festivalPlatform1"));
    } else if(this.mesh.name.includes("16") || this.mesh.name.includes("17")) {
      light.includedOnlyMeshes.push(this.#scene.getMeshByName("festivalPlatform2"));
    } else if (this.mesh.name.includes("18") || this.mesh.name.includes("19")) {
      light.includedOnlyMeshes.push(this.#scene.getMeshByName("festivalPlatform3"));
    } else if (this.mesh.name.includes("20") || this.mesh.name.includes("21")) {
      light.includedOnlyMeshes.push(this.#scene.getMeshByName("festivalPlatform4"));
    }
    this.#scene.getTransformNodeByName(this.mesh.name + "lights").getChildMeshes().forEach(m => {
      light.includedOnlyMeshes.push(m);
    });
  }

  #loadStars() {
    const particleSystem = new ParticleSystem("stars", 1000, this.#scene);
    particleSystem.particleTexture = new Texture("textures/solidStar.png", this._scene);
    particleSystem.emitter = new Vector3(this.mesh.position.x, this.mesh.position.y + 1.5, this.mesh.position.z);
    particleSystem.createPointEmitter(new Vector3(0.6, 1, 0), new Vector3(0, 1, 0));
    particleSystem.color1 = new Color4(1, 1, 1);
    particleSystem.color2 = new Color4(1, 1, 1);
    particleSystem.colorDead = new Color4(1, 1, 1, 1);
    particleSystem.emitRate = 12;
    particleSystem.minEmitPower = 14;
    particleSystem.maxEmitPower = 14;
    particleSystem.addStartSizeGradient(0, 2);
    particleSystem.addStartSizeGradient(1, 0.8);
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = 2;
    particleSystem.addDragGradient(0, 0.7, 0.7);
    particleSystem.targetStopDuration = .25;
    this.#stars = particleSystem;
  }


}

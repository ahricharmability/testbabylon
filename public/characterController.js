const { Scene, Vector3, Ray, TransformNode, Mesh, Color3, Color4, UniversalCamera, Quaternion, AnimationGroup, ExecuteCodeAction, ActionManager, ParticleSystem, Texture, SphereParticleEmitter, Sound, Observable, ShadowGenerator } = BABYLON;

import { PlayerInput } from './inputController.js';

export class Player extends TransformNode {
  camera;
  scene;
  #input;

  mesh;

  #camRoot;
  #yTilt;

  #run;
  #idle;
  #jump;
  #land;
  #dash;

  #currentAnim;
  #prevAnim;
  #isFalling;
  #jumped;

  #PLAYER_SPEED = 0.45;
  #JUMP_FORCE = 0.80;
  #GRAVITY = -2.8;
  #DASH_FACTOR = 2.5;
  #DASH_TIME = 10;
  #DOWN_TILT = new Vector3(0.8290313946973066, 0, 0);
  #ORIGINAL_TILT = new Vector3(0.5934119456780721, 0, 0);

  dashTime = 0;

  #deltaTime = 0;
  #h;
  #v;

  #moveDirection = new Vector3();
  #inputAmt;

  #dashPressed;
  #canDash = true;

  #gravity = new Vector3();
  #lastGroundPos = Vector3.Zero();
  #grounded;
  #jumpCount = 1;

  lanternLit = 1;
  totalLanterns;
  win = false;

  sparkler;
  sparkLit = true;
  sparkReset = false;

  #raisePlatform;

  lightSfx;
  sparkResetSfx;
  #resetSfx;
  #walkingSfx;
  #jumpingSfx;
  #dashingSfx;

  onRun = new Observable();

  tutorial_move;
  tutorial_dash;
  tutorial_jump;

  constructor(assets, scene, shadowGenerator, input) {
    super("player", scene);
    this.#scene = scene;

    this.#loadSounds(this.scene);

    this.#setupPlayerCamera();
    this.mesh = assets.mesh;
    this.mesh.parent = this;

    this.scene.getLightByName("sparklight").parent = this.scene.getTransformNodeByName("Empty");
    
    this.#idle = assets.animationGroups[1];
    this.#jump = assets.animationGroups[2];
    this.#land = assets.animationGroups[3];
    this.#run = assets.animationGroups[4];
    this.#dash = assets.animationGroups[0];

    this.mesh.actionManager = new ActionManager(this.scene);

    this.mesh.actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnIntersectionEnterTrigger,
          parameter: this.scene.getMeshByName("destination")
        },
        () => {
          if (this.lanternLit == 22) {
            this.win = true;
            this.#yTilt.rotation = new Vector3(5.689773361501514, 0.23736477827122882, 0);
            this.#yTilt.position = new Vector3(0, 0, 0);
            this.camera.position.y = 17;
          }
        }
      )
    );

    this.mesh.actionManager.registerAction(
      new ExecutionCodeAction(
        {
          trigger: ActionManager.OnIntersectionEnterTrigger,
          parameter: this.scene.getMeshByName("ground")
        },
        () => {
          this.mesh.position.copyFrom(this.#lastGroundPos);
          this.#resetSfx.play();
        }
      )
    );

    this.onRun.add(play => {
      if (play && !this.#walkingSfx.isPlaying) {
        this.#walkingSfx.play();
      } else if (!play && this.#walkingSfx.isPlaying) {
        this.#walkingSfx.stop();
        this.#walkingSfx.isPlaying = false;
      }
    });

    this.#createSparkles();
    this.#setUpAnimations();
    shadowGenerator.addShadowCaster(assets.mesh);

    this.#input = input;
  }
  
  #updateFromControls() {
    this.#deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;
    this.#moveDirection = Vector3.Zero();
    this.#h = this.#input.horizontal;
    this.#v = this.#input.vertical;

    if ((this.#h != 0 || this.#v != 0 && !this.tutorial_move) {
      this.tutorial_move = true;
    }

    if (this.#input.dashing && !this.#dashPressed && this.#canDash && !this.#grounded) {
      this.#canDash = false;
      this.#dashPressed = true;

      this.#currentAnim = this.#dash;
      this.#dashingSfx.play();

      if (!this.tutorial_dash) {
        this.tutorial_dash = true;
      }
    }

    let dashFactor = 1;
    if (this.#dashPressed) {
      if (this.dashTime > Player.DASH_TIME) {
        this.dashTime = 0;
        this.#dashPressed = false;
      } else {
        dashFactor = Player.DASH_FACTOR;
      }
      this.dashTime++;
    }

    let fwd = this.#camRoot.forward;
    let right = this.#camRoot.right;
    let correctedVertical = fwd.scaleInPlace(this.#v);
    let correctedHorizontal = right.scaleInPlace(this.#h);

    let move = correctedHorizontal.addInPlace(correctedVertical);

    this.#moveDirection = new Vector3((move).normalize().x * dashFactor, 0, (move).normalize().z * dashFactor);

    let inputMag = Math.abs(this.#h) + Math.abs(this.#v);
    if (inputMag < 0) {
      this.#inputAmt = 0;
    } else if (inputMag > 1) {
      this.#inputAmt = 1;
    } else {
      this.#inputAmt = inputMag;
    }

    this.#moveDirection = this.#moveDirection.scaleInPlace(this.#inputAmt * Player.PLAYER_SPEED);

    let input = new Vector3(this.#input.horizontalAxis, 0, this.#input.verticalAxis);
    if (input.length() == 0) {
      return;
    }

    let angle = Math.atan2(this.#input.horizontalAxis, this.#input.verticalAxis);
    angle += this.#camRoot.rotation.y;
    let targ = Quaternion.FromEulerAngles(0, angle, 0);
    this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion, targ, 10 * this.#deltaTime);
  }

  #setUpAnimations() {
    this.scene.stopAllAnimations();
    this.#run.loopAnimation = true;
    this.#idle.loopAnimation = true;

    this.#currentAnim = this.#idle;
    this.#prevAnim = this.#land;
  }

  






}

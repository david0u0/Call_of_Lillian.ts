import { GameMaster } from "../game_core/game_master";
import Phaser from "phaser";

alert("Hello, Keeper!")

let logoImg = require("./static/logo.png");

const config = {
  type: Phaser.AUTO,
  parent: "phaser-example",
  width: "100%",
  height: "100%",
  scene: {
    preload: preload,
    create: create
  }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("logo", logoImg);
}

function create() {
  const logo = this.add.image(400, 150, "logo");

  this.tweens.add({
    targets: logo,
    y: 450,
    duration: 2000,
    ease: "Power2",
    yoyo: true,
    loop: -1
  });
}

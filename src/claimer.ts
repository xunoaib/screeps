import { goWithdraw, goUpgrade, goClaim, goTo } from "CreepActions";

export interface ClaimerMemory extends CreepMemory {
  role: "claimer";
  flag: string;
  claiming: boolean;
}

/** captures adjacent rooms.
*   moves towards a blue flag in the spawn room.
*   blue flag must be on an exit tile.
*   once the creep moves to another room, he begins capturing.
*/
export interface Claimer extends Creep {
  memory: ClaimerMemory;
}

const roleClaimer = {
  run(creep: Claimer): void {
    if (creep.memory.claiming) {
      this.runClaim(creep);
    } else {
      this.runTravel(creep);
    }
  },

  /** focus a flag for the next room */
  focusFlag(creep: Claimer) {
    const flag = creep.pos.findClosestByPath(FIND_FLAGS, {
      filter: flag => flag.color == COLOR_BLUE
    }) as Flag | undefined;

    if (flag) {
      creep.memory.flag = flag.name;
    }
  },

  runClaim(creep: Claimer) {
    // look for controller, otherwise look for flag
    const controller = creep.room.controller;
    if (!controller) {
      console.log("no controller found. focusing flag");
      console.log(creep.name + ": no controller");
      this.focusFlag(creep);
      return;
    }
    goClaim(creep, controller);
  },

  runTravel(creep: Claimer) {
    // move towards flag if found, otherwise start capturing
    const flag = Game.flags[creep.memory.flag];
    if (!flag) {
      console.log("no flag. focusing");
      this.focusFlag(creep);
    } else if (creep.room == flag.room) {
      console.log("going to flag in room");
      goTo(creep, flag.pos);
    } else { // different room, time to capture
      console.log("time to claim!");
      creep.memory.claiming = true;
      this.runClaim(creep);
    }
  },
};

export default roleClaimer;

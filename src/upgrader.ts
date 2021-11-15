import { goWithdraw, goUpgrade } from "CreepActions";
import { EnergyStructure } from "filters";

export interface UpgraderMemory extends CreepMemory {
  role: "upgrader";
  target: Id<EnergyStructure>;
  upgrading: boolean;
}

export interface Upgrader extends Creep {
  memory: UpgraderMemory;
}

const roleUpgrader = {
  run(creep: Upgrader): void {
    // dereference source
    const target = Game.getObjectById(creep.memory.target);
    if (!target) {
      console.log("no upgrader target");
      this.focusSourceContainer(creep);
      return;
    }

    if (creep.memory.upgrading) {
      this.runUpgrade(creep);
    } else {
      this.runSource(creep, target);
    }
  },

  /** find a container to grab energy from */
  focusSourceContainer(creep: Upgrader) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure => (structure instanceof StructureContainer ||
        structure instanceof StructureStorage) && structure.store.energy > 150
    }) as EnergyStructure | undefined;

    if (!target) return;

    creep.memory.target = target.id;
    creep.memory.upgrading = false;
  },

  runUpgrade(creep: Upgrader) {
    // done upgrading, time to refill
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
      this.focusSourceContainer(creep);
      return;
    }

    // controller not found
    if (!creep.room.controller || !creep.room.controller.my) {
      console.log(creep.name + ": no upgradable controller found");
      return;
    }

    goUpgrade(creep, creep.room.controller);
  },

  runSource(creep: Upgrader, target: EnergyStructure) {
    // energy full, time to upgrade
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
      creep.memory.upgrading = true;
      return;
    }

    goWithdraw(creep, target, RESOURCE_ENERGY);
  },
};

export default roleUpgrader;

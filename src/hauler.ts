import { goTransfer, goWithdraw } from "CreepActions";

import { EnergyStructure } from "filters";
import { Role } from "creepConstants";

export interface HaulerMemory extends CreepMemory {
  role: Role.hauler;
  target: Id<EnergyStructure>;
  delivering: boolean;
}

export interface Hauler extends Creep {
  memory: HaulerMemory;
}

const roleHauler = {
  run(creep: Hauler): void {
    const target = Game.getObjectById(creep.memory.target);
    if (!target) {
      this.focusSourceContainer(creep);
      return;
    }

    if (creep.memory.delivering) {
      this.runDeliver(creep, target);
    } else {
      this.runWithdraw(creep, target);
    }
  },

  /** find a container to grab energy from */
  focusSourceContainer(creep: Hauler) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure => structure instanceof StructureContainer && structure.store.energy > 250
    }) as StructureContainer | undefined;

    if (!target) return;

    creep.memory.target = target.id;
    creep.memory.delivering = false;
  },

  /** find storage to deliver energy to */
  focusTargetContainer(creep: Hauler) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        (structure instanceof StructureSpawn ||
          structure instanceof StructureExtension ||
          structure instanceof StructureStorage) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as StructureStorage | undefined;

    if (!target) return;

    creep.memory.target = target.id;
    creep.memory.delivering = true;
  },

  runDeliver(creep: Hauler, target: EnergyStructure) {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      // focus new target if current target is full
      if (goTransfer(creep, target, RESOURCE_ENERGY) == ERR_FULL) {
        this.focusTargetContainer(creep);
      }
    } else {
      this.focusSourceContainer(creep);
    }
  },

  runWithdraw(creep: Hauler, target: EnergyStructure) {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) != 0) {
      // cant withdraw from depot (out of energy, etc)
      if (goWithdraw(creep, target, RESOURCE_ENERGY) != OK) {
        if (creep.store.energy > 0) this.focusTargetContainer(creep);
        else this.focusSourceContainer(creep);
      }
    } else {
      this.focusTargetContainer(creep);
    }
  }
};

export default roleHauler;

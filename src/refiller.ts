import { goTransfer, goWithdraw } from "CreepActions";

import { EnergyStructure } from "filters";
import { Role } from "creepConstants";

export interface RefillerMemory extends CreepMemory {
  role: Role.hauler;
  target: Id<EnergyStructure>;
  delivering: boolean;
}

export interface Refiller extends Creep {
  memory: RefillerMemory;
}

const roleRefiller = {
  run(creep: Refiller): void {
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
  focusSourceContainer(creep: Refiller) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        (structure instanceof StructureStorage || structure instanceof StructureContainer) && structure.store.energy > 0
    }) as StructureContainer | StructureStorage | undefined;

    if (!target) return;

    creep.memory.target = target.id;
    creep.memory.delivering = false;
  },

  /** find structure to deliver energy to */
  focusTargetContainer(creep: Refiller) {
    // find towers
    let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: structure =>
        structure instanceof StructureTower && structure.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.energy
    }) as EnergyStructure | undefined;

    // find spawn/extensions
    target ??= creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        (structure instanceof StructureSpawn || structure instanceof StructureExtension) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as EnergyStructure | undefined;

    // supply terminal
    if (!target && creep.room.terminal && creep.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < 3000)
      target = creep.room.terminal;

    if (!target) return;

    creep.memory.target = target.id;
    creep.memory.delivering = true;
  },

  runDeliver(creep: Refiller, target: EnergyStructure) {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      // focus new target if current target is full
      if (goTransfer(creep, target, RESOURCE_ENERGY) == ERR_FULL) {
        this.focusTargetContainer(creep);
      }
    } else {
      this.focusSourceContainer(creep);
    }
  },

  runWithdraw(creep: Refiller, target: EnergyStructure) {
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

export default roleRefiller;

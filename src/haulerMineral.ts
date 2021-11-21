import { goTransfer, goWithdraw } from "CreepActions";

import { EnergyStructure } from "filters";
import { Role } from "creepConstants";

export interface HaulerMemory extends CreepMemory {
  role: Role.mineralHauler;
  target: Id<EnergyStructure>;
  delivering: boolean;
  resourceType: ResourceConstant;
}

export interface MineralHauler extends Creep {
  memory: HaulerMemory;
}

const roleMineralHauler = {
  run(creep: MineralHauler): void {
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

  /** find a container to grab resources from */
  focusSourceContainer(creep: MineralHauler) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure => (structure instanceof StructureContainer ||
        structure instanceof StructureStorage) &&
        structure.store.getUsedCapacity(creep.memory.resourceType) >=
          creep.store.getFreeCapacity(creep.memory.resourceType)
    }) as StructureContainer | StructureStorage | null;

    if (!target) return;
    creep.memory.target = target.id;
    creep.memory.delivering = false;
  },

  /** find terminal to deliver resources to */
  focusTargetContainer(creep: MineralHauler) {
    if (creep.room.terminal) {
      creep.memory.target = creep.room.terminal.id;
      creep.memory.delivering = true;
    }
  },

  runDeliver(creep: MineralHauler, target: EnergyStructure) {
    if (creep.store.getUsedCapacity(creep.memory.resourceType) > 0) {
      if (goTransfer(creep, target, creep.memory.resourceType) == ERR_FULL) {
        this.focusTargetContainer(creep);
      }
    } else {
      this.focusSourceContainer(creep);
    }
  },

  runWithdraw(creep: MineralHauler, target: EnergyStructure) {
    if (creep.store.getFreeCapacity(creep.memory.resourceType) != 0) {
      if (goWithdraw(creep, target, creep.memory.resourceType) != OK) {
        if (creep.store.getUsedCapacity(creep.memory.resourceType) > 0) this.focusTargetContainer(creep);
        else this.focusSourceContainer(creep);
      }
    } else {
      this.focusTargetContainer(creep);
    }
  }
};

export default roleMineralHauler;

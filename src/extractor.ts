import { goHarvest, goTransfer } from "CreepActions";

import { Role } from "creepConstants";

export interface ExtractorMemory extends CreepMemory {
  role: Role.extractor;
  target: Id<Mineral | StructureStorage | StructureContainer | StructureTerminal>;
  harvesting: boolean;
}

export interface Extractor extends Creep {
  memory: ExtractorMemory;
}

const roleExtractor = {
  run(creep: Extractor): void {
    const target = Game.getObjectById(creep.memory.target);
    if (!target) {
      this.focusMineral(creep);
      return;
    }
    if (creep.memory.harvesting) {
      this.runHarvest(creep, target as Mineral);
    } else {
      this.runDeposit(creep, target as StructureStorage | StructureContainer | StructureTerminal);
    }
  },

  runHarvest(creep: Extractor, target: Mineral) {
    // creep is full, time to deposit minerals in nearest storage/container
    if (creep.store.getFreeCapacity() == 0) {
      this.focusDeliveryTarget(creep);
      return;
    }
    const result = goHarvest(creep, target);
    if (result != OK) {
      if (result != ERR_NO_PATH && result != ERR_TIRED) {
        console.log(creep.name + ": error extracting: " + result);
      }
    }
  },

  runDeposit(creep: Extractor, target: StructureStorage | StructureContainer | StructureTerminal) {
    // finished depositing, now begin extracting
    if (creep.store.getUsedCapacity() == 0) {
      // suicide old and decrepit miners
      // TODO: 5 tick cooldown / numWORK * carryCapacity = ticks needed to harvest
      if (creep.ticksToLive && creep.ticksToLive < 175) {
        creep.suicide();
      } else {
        this.focusMineral(creep);
      }
      return;
    }

    // deposit in target container
    const resourceType = Object.keys(creep.store)[0] as ResourceConstant;
    if (resourceType == RESOURCE_ENERGY) console.log("extractor has energy but shouldnt!");
    const result = goTransfer(creep, target, resourceType);

    if (result == ERR_FULL) {
      console.log(creep.name + ": mineral container full");
      this.focusDeliveryTarget(creep);
    } else if (result == ERR_INVALID_TARGET) {
      console.log(creep.name + ": invalid target. finding new one");
      this.focusDeliveryTarget(creep);
    } else if (result == ERR_NOT_ENOUGH_RESOURCES) {
      this.focusMineral(creep);
    } else if (result != OK) {
      console.log("Error transferring: " + result);
    }
  },

  /** Focus nearest mineral for depositing minerals */
  focusMineral(creep: Extractor) {
    // find nearest extractor
    const extractor = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: structure => structure instanceof StructureExtractor
    }) as StructureExtractor;

    // get mineral under extractor
    const minerals = extractor.pos.lookFor(LOOK_MINERALS);
    if (minerals.length) {
      creep.memory.target = minerals[0].id;
      creep.memory.harvesting = true;
    } else {
      console.log("No active minerals found");
    }
  },

  /** Focus nearest storage/container for depositing minerals */
  focusDeliveryTarget(creep: Extractor) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        (structure instanceof StructureContainer ||
        structure instanceof StructureStorage ||
        structure instanceof StructureTerminal) &&
        structure.store.getFreeCapacity() > 0
    }) as StructureContainer | StructureStorage | StructureTerminal;

    if (target) {
      creep.memory.target = target.id;
      creep.memory.harvesting = false;
    } else {
      console.log("No mineral containers found");
    }
  }
};

export default roleExtractor;

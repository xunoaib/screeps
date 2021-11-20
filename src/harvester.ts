import { RANGES, findEnergyTarget, goHarvest, goRepair, goTransfer } from "CreepActions";

import { EnergyStructure } from "filters";
import { Role } from "creepConstants";

export interface HarvesterMemory extends CreepMemory {
  role: Role.harvester;
  target: Id<Source | EnergyStructure | Structure>;
  harvesting: boolean;
}

export interface Harvester extends Creep {
  memory: HarvesterMemory;
}

const roleHarvester = {
  run(creep: Harvester): void {
    const target = Game.getObjectById(creep.memory.target);
    if (!target) {
      console.log(creep.name + " has unknown target");
      return;
    }

    if (creep.memory.harvesting) {
      // creep is full, time to deposit
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
        this.focusTarget(creep);
        return;
      }

      const result = goHarvest(creep, target as Source);
      if (result != OK) {
        if (result != ERR_NO_PATH) {
          console.log("Error harvesting: " + result);
        }
        return;
      }
    } else {
      // depositing
      // finished depositing, now begin harvesting
      if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          creep.memory.target = source.id;
          creep.memory.harvesting = true;
        } else {
          console.log("No active sources found");
        }
        return;
      }

      // repair structures
      const targetStruct = target as EnergyStructure;
      if (targetStruct.hits / targetStruct.hitsMax < 0.75) {
        const result = goRepair(creep, targetStruct);
        if (result != OK) console.log("Error repairing");
        return;
      }

      // transfer / upgrade
      const range = target instanceof StructureController ? RANGES.UPGRADE : RANGES.TRANSFER;
      const result = goTransfer(creep, targetStruct, RESOURCE_ENERGY, undefined, range);

      // target full, find another
      if (result == ERR_FULL) {
        if (!(target as StructureSpawn).spawning) {
          // wait for spawn to consume energy if spawning
          if (creep.room.controller != undefined) {
            // fall back to room controller
            creep.memory.target = creep.room.controller.id;
          } else {
            console.log("No room controller found");
          }
        } // else: wait for spawn to spawn
      } else if (result == ERR_INVALID_TARGET) {
        console.log(creep.name + ": invalid target. finding new one");
        this.focusTarget(creep);
      } else if (result != OK) {
        console.log("Error transferring: " + result);
      }
    }
  },

  focusTarget(creep: Harvester) {
    const target = findEnergyTarget(creep.room) as EnergyStructure; // TODO: sort by distance
    if (target) {
      creep.memory.target = target.id;
      creep.memory.harvesting = false;
    } else {
      console.log("No active sources found");
    }
    return;
  }
};

export default roleHarvester;

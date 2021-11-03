import { EnergyStructure } from "filters";
import { goHarvest, goTransfer, findEnergyTarget, RANGES } from "CreepActions";
import { Role } from "creepConstants";

export interface HarvesterMemory extends CreepMemory {
  role: Role.harvester,
  target: string;
  harvesting: boolean;
}

export interface Harvester extends Creep {
  memory: HarvesterMemory;
}

const roleHarvester = {
  run(creep: Harvester): void {
    const target = Game.getObjectById(creep.memory.target as Id<Source|EnergyStructure>);
    if (!target) {
      console.log(creep.name + " has unknown target");
      return;
    }

    if (creep.memory.harvesting) {
      // creep is full, time to deposit
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
        const target = findEnergyTarget(creep.room) as EnergyStructure; // TODO: sort by distance
        if (target) {
          creep.memory.target = target.id;
          creep.memory.harvesting = false;
        } else {
          console.log("No active sources found");
        }
        return;
      }

      const result = goHarvest(creep, target as Source);
      if (result != OK) {
        console.log("Error harvesting: " + result);
        return;
      }

    } else { // depositing
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

      const range = target instanceof StructureController ? RANGES.UPGRADE : RANGES.TRANSFER;
      const result = goTransfer(creep, target as EnergyStructure, RESOURCE_ENERGY, undefined, range);

      if (result == ERR_FULL) {
        if (!(target as StructureSpawn).spawning) { // wait for spawn to consume energy if spawning
          if (creep.room.controller != undefined) { // fall back to room controller
            creep.memory.target = creep.room.controller.id;
          } else {
            console.log("No room controller found");
          }
        } // else: wait for spawn to spawn
      } else if (result != OK) {
        console.log("Error transferring: " + result);
      }
    }
  }
}

export default roleHarvester;

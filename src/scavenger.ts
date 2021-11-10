import { EnergyStructure } from "filters";
import { RANGES, findEnergyTarget, goHarvest, goPickup, goRepair, goTransfer } from "CreepActions";
import { Role } from "creepConstants";

// TODO: findResources should include ruins

export interface ScavengerMemory extends CreepMemory {
  role: Role.harvester;
  resource: Id<Resource>;
  target: Id<EnergyStructure>;
  delivering: boolean;
}

export interface Scavenger extends Creep {
  memory: ScavengerMemory;
}

const roleScavenger = {
  run(creep: Scavenger): void {
    if (creep.memory.delivering) {
      this.doDeliver(creep);
    } else {
      this.doScavenge(creep);
    }
  },

  doDeliver(creep: Scavenger) {
    // finished delivering, now find more resources
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
      this.findResources(creep);
      return;
    }

    // otherwise, continue delivering
    const target = Game.getObjectById(creep.memory.target);
    if (!target) {
      console.log(creep.name + ": error delivering");
      return;
    }
    // upgrade or transfer to target
    const range = target.structureType == STRUCTURE_CONTROLLER ? RANGES.UPGRADE : RANGES.TRANSFER;
    const result = goTransfer(creep, target, RESOURCE_ENERGY, undefined, range);
    if (result != OK) {
      if (ERR_FULL) {
        console.log(creep.name + ": target full, redirecting");
        this.findDepoTarget(creep);
      } else {
        console.log(creep.name + ": error transferring dropped resources: " + result + " @ " + range);
      }
    }
  },

  doScavenge(creep: Scavenger) {
    // creep is full, find place to deposit
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
      this.findDepoTarget(creep);
      return;
    }

    // resource disappeared, find another
    const resource = Game.getObjectById(creep.memory.resource);
    if (!resource) {
      this.findResources(creep);
      return;
    }

    // go and pick up
    const result = goPickup(creep, resource);
    if (result != OK) {
      if (result != ERR_NO_PATH) {
        console.log("Error picking up: " + result);
      }
      return;
    }
  },

  /** scavenge nearest dropped resources */
  findResources(creep: Scavenger) {
    const resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
    if (resource) {
      creep.memory.resource = resource.id;
      creep.memory.delivering = false;
    } // else: no resources found
  },

  /** deposit at nearest spawn/extension/container in need of energy, then controller */
  findDepoTarget(creep: Scavenger) {
    let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        (structure instanceof StructureSpawn ||
          structure instanceof StructureExtension ||
          structure instanceof StructureContainer ||
          structure instanceof StructureStorage) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as EnergyStructure | null;

    // fall back to towers
    target ??= creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: structure => structure instanceof StructureTower && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });

    // fall back to controller
    if (!target && creep.room.controller && creep.room.controller.my) {
      target = creep.room.controller;
    }

    // target is valid
    if (target) {
      creep.memory.target = target.id;
      creep.memory.delivering = true;
    } else {
      creep.say("🚬");
    }
  }
};

export default roleScavenger;

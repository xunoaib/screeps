import { EnergyStructure } from "filters";
import { RANGES, goPickup, goTransfer } from "CreepActions";
import { Role } from "creepConstants";

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
    // dereference delivery target
    const target = Game.getObjectById(creep.memory.target);
    if (!target) {
      console.log(creep.name + ": error delivering");
      this.findDepoTarget(creep);
      return;
    }

    // finished delivering all resources
    if (creep.store.energy == 0) {
      this.findResources(creep);
      return;
    }

    // upgrade or transfer to target
    const range = target.structureType == STRUCTURE_CONTROLLER ? RANGES.UPGRADE : RANGES.TRANSFER;
    const result = goTransfer(creep, target, RESOURCE_ENERGY, undefined, range);
    if (result != OK) {
      if (ERR_FULL) {
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

  /** scavenge nearest dropped energy */
  findResources(creep: Scavenger) {
    const resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
      filter: resource => resource.resourceType == RESOURCE_ENERGY
    });
    if (resource) {
      creep.memory.resource = resource.id;
      creep.memory.delivering = false;
    } // else: no resources found
  },

  /** find resource delivery targets */
  findDepoTarget(creep: Scavenger) {
    // refill spawn/extensions
    let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: structure =>
        (structure instanceof StructureSpawn || structure instanceof StructureExtension) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as EnergyStructure | null;

    // refill towers
    target ??= creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: structure => structure instanceof StructureTower && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as StructureTower;

    // refill containers/storage
    target ??= creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        (structure instanceof StructureContainer || structure instanceof StructureStorage) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as EnergyStructure | null;

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

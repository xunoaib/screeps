import { findClosestConstructionSites, goBuild, goHarvest, goPickup, goWithdraw } from "CreepActions";
import { Role } from "creepConstants";

export interface BuilderMemory extends CreepMemory {
  role: Role.builder;
  target: Id<StructureContainer | StructureStorage | Source | ConstructionSite | Resource>;
  harvesting: boolean; // when not harvesting, building
}

export interface Builder extends Creep {
  memory: BuilderMemory;
}

const roleBuilder = {
  run(creep: Builder): void {
    const target = Game.getObjectById(creep.memory.target);
    if (!target) {
      // construction site complete / container destroyed
      if (!this.focusConstructionSite(creep)) console.log(creep.name + " has no more sites");
      return;
    }

    if (creep.memory.harvesting) {
      // creep is full, time to build
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
        this.focusConstructionSite(creep);
        return;
      }

      // withdraw or harvest
      if (target instanceof StructureContainer || target instanceof StructureStorage) {
        const result = goWithdraw(creep, target, RESOURCE_ENERGY);
        if (result != OK) {
          console.log(creep.name + " error withdrawing: " + result);
        }
      } else if (target instanceof Resource) {
        const result = goPickup(creep, target);
        if (result != OK && result != ERR_NO_PATH) {
          console.log(creep.name + " error picking up energy");
        }
      } else if (target instanceof Source) {
        const result = goHarvest(creep, target);
        if (result != OK && result != ERR_NO_PATH) {
          console.log(creep.name + " error harvesting: " + result);
        }
      } else {
        console.log(creep.name + " unknown target type");
      }
    } else {
      // building (initial state)
      // out of energy, retrieve energy from container
      if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
        this.focusEnergySource(creep);
        return;
      }

      if (target) {
        // site needs building
        const result = goBuild(creep, target as ConstructionSite);
        if (result != OK) console.log("build error: " + result);
      } else {
        // site has been built/destroyed
        console.log("not a site anymore!!");
        if (!this.focusConstructionSite(creep)) {
          return;
        }
      }
    }
  },

  focusConstructionSite(creep: Builder): boolean {
    const sites = findClosestConstructionSites(creep.room, creep.pos);
    if (sites.length) {
      creep.memory.target = sites[0].id;
      creep.memory.harvesting = false;
      return true;
    } else {
      console.log("No construction sites found");
      return false;
    }
  },

  focusEnergySource(creep: Builder): boolean {
    // look for container with more than a given amount of energy
    const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE) &&
        (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY) > 0.15 ||
          structure.store.getUsedCapacity(RESOURCE_ENERGY) > 350)
    }) as StructureContainer | StructureStorage | null;

    if (container) {
      creep.memory.target = container.id;
      creep.memory.harvesting = true;
      return true;
    }

    // look for dropped energy
    const resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
      filter: resource => resource.resourceType == RESOURCE_ENERGY
    });
    if (resource) {
      creep.memory.target = resource.id;
      creep.memory.harvesting = true;
      return true;
    }

    // look for harvestable source
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
      creep.memory.target = source.id;
      creep.memory.harvesting = true;
      return true;
    } else {
      console.log("No active sources found");
      return false;
    }
  }
};

export default roleBuilder;

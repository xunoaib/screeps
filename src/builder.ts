import { goHarvest, goBuild, findClosestConstructionSites } from "CreepActions";
import { Role } from "creepConstants";

export interface BuilderMemory extends CreepMemory {
  role: Role.builder;
  target: Id<Source|ConstructionSite>;
  harvesting: boolean; // when not harvesting, building
}

export interface Builder extends Creep {
  memory: BuilderMemory;
}

const roleBuilder = {
  run(creep: Builder): void {
    const target = Game.getObjectById(creep.memory.target as Id<Source|ConstructionSite>);
    if (!target) {
      if (!this.focusConstructionSite(creep))
        console.log(creep.name + " has no more sites");
      return;
    }

    if (creep.memory.harvesting) {
      // creep is full, time to build
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
        this.focusConstructionSite(creep);
        return;
      }

      const result = goHarvest(creep, target as Source);
      if (result != OK) {
        if (result != ERR_NO_PATH) {
          console.log("Error harvesting: " + result);
        }
        return;
      }

    } else { // building
      // out of energy, go harvest
      if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
        this.focusHarvestSource(creep);
        return;
      }

      if (target) { // site needs building
        const result = goBuild(creep, target as ConstructionSite);
        if (result != OK)
          console.log("build error: " + result);
      } else { // site has been built/destroyed
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

  focusHarvestSource(creep: Builder): boolean {
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
}

export default roleBuilder;

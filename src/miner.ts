import { findSourceContainer, goHarvest, goTo } from "CreepActions";
import { Role } from "creepConstants";

export interface MinerMemory extends CreepMemory {
  role: Role.miner;
  source: Id<Source>;
  container?: Id<StructureContainer>;
}

export interface Miner extends Creep {
  memory: MinerMemory;
}

const roleMiner = {
  run(creep: Miner): void {
    // move to container if found (and not here)
    if (creep.memory.container) {
      const container = Game.getObjectById(creep.memory.container);
      if (container && !creep.pos.inRangeTo(container, 0)) {
        goTo(creep, container);
      }
    } else {
      // memory unset, so look for a container
      this.findNearbyContainer(creep);
    }

    // focus energy source, or find a new one
    const source = Game.getObjectById(creep.memory.source);
    if (!source) {
      console.log(creep.name + " has unknown source");

      // find a new source
      const target = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
      if (target) {
        creep.memory.source = target.id;
        this.findNearbyContainer(creep);
      }
      return;
    }

    // creep is full, time to drop energy
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
      // repair container if needed
      const containers = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos);
      if (
        containers.length &&
        containers[0].structureType == STRUCTURE_CONTAINER &&
        containers[0].hits < containers[0].hitsMax
      ) {
        creep.repair(containers[0]);
      } else {
        // deposit otherwise
        creep.drop(RESOURCE_ENERGY);
      }
      return;
    }

    // continue harvesting
    goHarvest(creep, source);
  },

  /** find new container location */
  findNearbyContainer(creep: Miner) {
    const target = Game.getObjectById(creep.memory.source);
    if (!target) return;

    // look for containers adjacent to source
    const container = findSourceContainer(target);
    if (container) {
      creep.memory.container = container.structure.id as Id<StructureContainer>;
    }
  }
};

export default roleMiner;

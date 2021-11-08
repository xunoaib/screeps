import { goHarvest, goTo } from "CreepActions";
import { Role } from "creepConstants";

export interface MinerMemory extends CreepMemory {
  role: Role.miner,
  target: Id<Source>;
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
        creep.moveTo(container.pos);
      }
    } else { // memory unset, so look for a container
      this.findMiningLocation(creep);
    }

    // find/target energy source
    const target = Game.getObjectById(creep.memory.target as Id<Source>);
    if (!target) {
      console.log(creep.name + " has unknown target");
      this.findMiningLocation(creep);
      return;
    }

    // creep is full, time to drop energy
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
      // repair container if needed
      const containers = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos);
      if (containers.length &&
        containers[0].structureType == STRUCTURE_CONTAINER &&
        containers[0].hits < containers[0].hitsMax) {
        creep.repair(containers[0]);
      } else { // deposit otherwise
        creep.drop(RESOURCE_ENERGY);
      }
      return;
    }

    // continue harvesting
    const result = goHarvest(creep, target);
    if (result != OK) {
      if (result != ERR_NO_PATH) {
        console.log("Error harvesting: " + result);
      }
      return;
    }
   },

  findMiningLocation(creep: Miner) {
    const target = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (!target) return;

    // set target source
    creep.memory.target = target.id;

    // look for nearby structures
    const containers = target.room.lookForAtArea(LOOK_STRUCTURES,
      target.pos.y-1,
      target.pos.x-1,
      target.pos.y+1,
      target.pos.x+1,
      true
    );

    // select the first container found, if any
    const result = _.find(containers, (result) => (result.structure.structureType == STRUCTURE_CONTAINER));
    if (result) {
      creep.memory.container = result.structure.id as Id<StructureContainer>;
    }
  }
}

export default roleMiner;

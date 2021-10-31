import { State } from "creepConstants";
import { goHarvest, goTransfer, findEnergyTarget } from "CreepActions";

export class RoleHarvester { 
  static run(creep: Creep): void {
    if (creep.memory.target == undefined) {
      console.log(creep.name + ": no target");
      return;
    }

    const target = Game.getObjectById(creep.memory.target.id);

    switch (creep.memory.state) {
      case State.harvesting: {
        const result = goHarvest(creep, target as Source);

        // creep is full, time to depo
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
          creep.memory.target = findEnergyTarget(creep) ?? creep.memory.home;
          creep.memory.state = State.depositing;
        }
        break;
      }

      case State.depositing: {
        const result = goTransfer(creep, target as Structure, RESOURCE_ENERGY);
        if (result == ERR_FULL) {
          // deposit excess in room controller if spawn is full and idle.
          // otherwise, wait for spawn to spawn, then fill it.
          if (!(target as StructureSpawn).spawning) {
            creep.memory.target = creep.room.controller;
          }
          break;
        }

        // creep is empty, time to refill
        if (creep.store.energy == 0) {
          const newTarget = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
          if (newTarget) {
            creep.memory.target = newTarget;
            creep.memory.state = State.harvesting;
          }
        }
        break;
      }

      default: {
        console.log(creep.name + " state error")
      }
    }
  } 
}

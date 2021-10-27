import { ErrorMapper } from "utils/ErrorMapper";

enum State {
  moving,
  harvesting,
  depositing,
}

declare global {
  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: string;
    home: StructureSpawn;
    room: string
    state: State;
    target: Source | Structure;
  }

  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

export function handleAllSpawns(): void {
  _.map(Game.rooms, handleRoomSpawns);
}

export function handleRoomSpawns(room: Room): void {
  _.map(room.find(FIND_MY_SPAWNS), handleSpawn);
}

export function handleSpawn(spawn: StructureSpawn): void {
  if (spawn.spawning)
    return;
  const creepCount = _.size(Game.creeps);
  // create harvesters until a minimum population is reached
  if (creepCount < 6) {
    return spawnHarvester(spawn);
  }
}

export function spawnHarvester(spawn: StructureSpawn): void {
  const creepParts = [WORK, WORK, CARRY, MOVE];
  const creepName = 'Harvester_' + Game.time.toString();
  const creepMem: CreepMemory = {
    role: 'harvester',
    home: spawn,
    room: spawn.room.name,
    state: State.moving,
    target: spawn.pos.findClosestByPath(FIND_SOURCES_ACTIVE) ?? spawn,
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function runAllCreepLogic(): void {
  _.map(Game.creeps, runCreepLogic);
}

export function runCreepLogic(creep: Creep): void {
  if (creep.spawning)
    return;

  switch (creep.memory.role) {
    case "harvester": {
      runHarvester(creep);
      break;
    }
    default: {
      console.log(creep.name + " has an unknown role. Recruiting as harvester");
      (creep.memory as CreepMemory).role = "harvester";
    }
  }
}

export function runHarvester(creep: Creep): void {
  const mem = creep.memory as CreepMemory;
  const target = Game.getObjectById(mem.target.id);
  if (target == null) {
    console.log(creep.name + " has a null target");
    return;
  }

  switch (mem.state) {
    case State.moving: {
      creep.moveTo(target, { visualizePathStyle: { stroke: '#ccc' } });
      const rangeTo = creep.pos.getRangeTo(target);
      const minRange = target instanceof StructureController ? 3 : 1;

      if (rangeTo <= minRange)
        mem.state = creep.store.energy == 0 ? State.harvesting : State.depositing;
      break;
    }
    case State.harvesting: {
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        creep.harvest(target as Source);
      } else { // energy full, return to base
        mem.target = mem.home;
        mem.state = State.moving;
      }
      break;
    }
    case State.depositing: {
      const status = creep.transfer(target as Structure, RESOURCE_ENERGY);
      switch (status) {
        // unloaded everything, return to source
        case ERR_NOT_ENOUGH_RESOURCES: {
          mem.target = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE) ?? mem.home;
          mem.state = State.moving;
          break;
        }
        // spawn is full
        case ERR_FULL: {
          // wait for spawn to finish spawning. otherwise, fill room controller
          if ((target as StructureSpawn).spawning)
            break;

          const controller = creep.room.controller as Structure;
          mem.target = controller;
          mem.state = State.moving;
          break;
        }
      }
      
      // upgrade controller with excess energy
      if (target instanceof StructureController) {
        const status = creep.upgradeController(target) as ScreepsReturnCode;
        if (_.indexOf([OK, ERR_NOT_ENOUGH_RESOURCES, ERR_NOT_ENOUGH_ENERGY], status) == -1)
          console.log("error upgrading controller: " + status)
      }
      break;
    }
    default: {
      console.log(creep.name + " state error")
      break;
    }
  }
}

// automatically delete memory of missing creeps
export function cleanup() {
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
    }
  }
}

export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  handleAllSpawns();
  runAllCreepLogic();
  cleanup();

  if ("generatePixel" in Game.cpu && Game.cpu.bucket >= PIXEL_CPU_COST)
    Game.cpu.generatePixel();
});

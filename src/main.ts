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
    target: Source | StructureSpawn;
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
      // creep must be 1 tile away to deposit at spawn or harvest
      if (rangeTo <= 1)
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
      if (creep.transfer(target as StructureSpawn, RESOURCE_ENERGY) == ERR_NOT_ENOUGH_RESOURCES) {
        mem.target = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE) ?? mem.home;
        mem.state = State.moving;
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
});

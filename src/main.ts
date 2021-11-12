import { ErrorMapper } from "utils/ErrorMapper";
import { Role } from "creepConstants";
import roleHarvester, { Harvester } from "harvester";
import { handleAllSpawns } from "spawner";
import { RoomManager } from "roomManager";
import roleBuilder, { Builder } from "builder";
import roleMiner, { Miner } from "miner";
import roleScavenger, { Scavenger } from "scavenger";

declare global {
  interface Memory {
    uuid: number;
    log: any;
  }

  namespace NodeJS {
    interface Global {
      log: any;
      age?: number;
    }
  }

  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: string;
  }
}

export function runAllCreepLogic(): void {
  _.map(Game.rooms, runRoomCreepLogic);
}

export function runRoomCreepLogic(room: Room): void {
  const manager = new RoomManager(room);
  _.map(manager.creeps, runCreepLogic);
}

export function runCreepLogic(creep: Creep): void {
  if (creep.spawning) return;

  switch (creep.memory.role) {
    case Role.harvester: {
      return roleHarvester.run(creep as Harvester);
    }
    case Role.builder: {
      return roleBuilder.run(creep as Builder);
    }
    case Role.miner: {
      return roleMiner.run(creep as Miner);
    }
    case Role.scavenger: {
      return roleScavenger.run(creep as Scavenger);
    }
    default: {
      console.log(creep.name + " has an unknown role");
    }
  }
}

export function runAllDefenses() {
  _.map(Game.rooms, runRoomDefenses);
}

export function runRoomDefenses(room: Room) {
  const invaders = room.find(FIND_HOSTILE_CREEPS).sort((a, b) => b.hits - a.hits);
  if (!invaders) return;

  const towers = room.find(FIND_MY_STRUCTURES, {
    filter: tower => tower instanceof StructureTower
  });

  _.forEach(towers, tower => tower.attack(invaders[0]));
}

export function runAllTowerRepairs() {
  _.map(Game.rooms, runTowerRepairs);
}

export function runTowerRepairs(room: Room) {
  // only repair when there's surplus energy
  const towers = room.find(FIND_MY_STRUCTURES, {
    filter: tower => tower instanceof StructureTower && tower.store.energy > 100
  });

  const repairables = room
    .find(FIND_STRUCTURES, {
      filter: structure => structure.hits < structure.hitsMax
    })
    .sort((a, b) => b.hits - a.hits);

  _.forEach(towers, tower => tower.repair(repairables[0]));
}

// automatically delete memory of missing creeps
export function cleanup() {
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
    }
  }
}

export function setupGlobalCache() {
  if (global.age == undefined) {
    console.log(`<font color="red">Global reset occurred</font>`);
    global.age = 0;
  } else {
    global.age++;
  }
}

export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`<font color="green"><strong>Current game tick is ${Game.time}</strong></font>`);

  setupGlobalCache();
  runAllDefenses();
  runAllTowerRepairs();
  handleAllSpawns();
  runAllCreepLogic();
  cleanup();

  if ("generatePixel" in Game.cpu && Game.cpu.bucket >= PIXEL_CPU_COST) Game.cpu.generatePixel();
});

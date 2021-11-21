import * as Traveler from "./utils/Traveler/Traveler";
import * as profiler from "./utils/screeps-profiler";

import roleBuilder, { Builder } from "builder";
import roleClaimer, { Claimer } from "claimer";
import roleExtractor, { Extractor } from "extractor";
import roleHarvester, { Harvester } from "harvester";
import roleHauler, { Hauler } from "hauler";
import roleMiner, { Miner } from "miner";
import roleRefiller, { Refiller } from "refiller";
import roleScavenger, { Scavenger } from "scavenger";
import roleUpgrader, { Upgrader } from "upgrader";

import { ErrorMapper } from "utils/ErrorMapper";
import { Role } from "creepConstants";
import { RoomManager } from "roomManager";
import { handleAllSpawns } from "spawner";
import roleMineralHauler, { MineralHauler } from "haulerMineral";

Traveler; // trigger prototype injection

declare global {
  interface Memory {
    uuid: number;
    log: any;
  }

  namespace NodeJS {
    interface Global {
      log: any;
      age?: number;
      deal: any;
      cost: any;
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

function deal(orderId: string, amount: number) {
  const roomName = Game.spawns['Spawn1'].room.name;
  return Game.market.deal(orderId, amount, roomName);
}

export function calcCost(orderId: string, amount: number) {
  const order = Game.market.getOrderById(orderId);
  if (!order) {
    console.log("invalid order id: " + orderId);
    return;
  }
  const roomName = Game.spawns['Spawn1'].room.name;
  return Game.market.calcTransactionCost(amount, order.roomName as string, roomName);
}

global.cost = calcCost;
global.deal = deal;

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
    case Role.hauler: {
      return roleHauler.run(creep as Hauler);
    }
    case Role.refiller: {
      return roleRefiller.run(creep as Refiller);
    }
    case Role.upgrader: {
      return roleUpgrader.run(creep as Upgrader);
    }
    case Role.claimer: {
      return roleClaimer.run(creep as Claimer);
    }
    case Role.extractor: {
      return roleExtractor.run(creep as Extractor);
    }
    case Role.mineralHauler: {
      return roleMineralHauler.run(creep as MineralHauler);
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

  const towers: StructureTower[] = room.find(FIND_MY_STRUCTURES, {
    filter: tower => tower instanceof StructureTower
  });

  _.forEach(towers, tower => tower.attack(invaders[0]));
}

export function runAllTowerRepairs() {
  _.map(Game.rooms, runTowerRepairs);
}

export function runTowerRepairs(room: Room) {
  // avoid repairing when hostiles are near (repair function normally overrides attack)
  const hostiles = room.find(FIND_HOSTILE_CREEPS);
  if (hostiles.length) return;

  // only repair when there's surplus energy
  const towers = room.find(FIND_MY_STRUCTURES, {
    filter: tower => tower instanceof StructureTower && tower.store.energy > 250
  }) as StructureTower[];

  const repairables = room
    .find(FIND_STRUCTURES, {
      filter: structure =>
        structure.hits < structure.hitsMax &&
        !((structure instanceof StructureRampart || structure instanceof StructureWall) && structure.hits >= 30000)
    })
    .sort((a, b) => a.hits - b.hits);

  towers.forEach(tower => tower.repair(repairables[0]));
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

export function main() {
  console.log(`<font color="green"><strong>Current game tick is ${Game.time}</strong></font>`);

  setupGlobalCache();
  runAllTowerRepairs();
  runAllDefenses();
  handleAllSpawns();
  runAllCreepLogic();
  cleanup();

  if ("generatePixel" in Game.cpu && Game.cpu.bucket >= PIXEL_CPU_COST) Game.cpu.generatePixel();
}

profiler.enable();
export const loop = ErrorMapper.wrapLoop(() => profiler.wrap(main));

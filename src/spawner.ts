import { Harvester, HarvesterMemory } from "harvester";
import { Miner, MinerMemory } from "miner";

import { Builder } from "builder";
import { Claimer } from "claimer";
import { Extractor } from "extractor";
import { Hauler } from "hauler";
import { Refiller } from "refiller";
import { Role } from "creepConstants";
import { Scavenger } from "scavenger";
import { Upgrader } from "upgrader";
import { generateMinerBody } from "creepBody";
import { MineralHauler } from "haulerMineral";

export function handleAllSpawns(): void {
  _.map(Game.rooms, handleRoomSpawns);
}

export function handleRoomSpawns(room: Room): void {
  _.map(room.find(FIND_MY_SPAWNS), handleSpawn);
}

export function handleSpawn(spawn: StructureSpawn): void {
  if (spawn.spawning) return;

  // FIXME: linear search
  const harvesters = _.filter(Game.creeps, creep => creep.memory.role == Role.harvester) as Harvester[];
  const builders = _.filter(Game.creeps, creep => creep.memory.role == Role.builder) as Builder[];
  const miners = _.filter(Game.creeps, creep => creep.memory.role == Role.miner) as Miner[];
  const scavengers = _.filter(Game.creeps, creep => creep.memory.role == Role.scavenger) as Scavenger[];
  const haulers = _.filter(Game.creeps, creep => creep.memory.role == Role.hauler) as Hauler[];
  const refillers = _.filter(Game.creeps, creep => creep.memory.role == Role.refiller) as Refiller[];
  const upgraders = _.filter(Game.creeps, creep => creep.memory.role == Role.upgrader) as Upgrader[];
  const claimers = _.filter(Game.creeps, creep => creep.memory.role == Role.claimer) as Claimer[];
  const extractors = _.filter(Game.creeps, creep => creep.memory.role == Role.extractor) as Extractor[];
  const mineralHaulers = _.filter(Game.creeps, creep => creep.memory.role == Role.mineralHauler) as MineralHauler[];

  const minableMinerals = spawn.room.find(FIND_MINERALS, {
    filter: mineral => mineral.mineralAmount > 0
  });
  const sources = spawn.room.find(FIND_SOURCES_ACTIVE);
  const sites = spawn.room.find(FIND_CONSTRUCTION_SITES);
  const blueFlags = spawn.room.find(FIND_FLAGS, {
    filter: flag => flag.color == COLOR_BLUE
  });
  const extractorStructs = spawn.room.find(FIND_MY_STRUCTURES, {
    filter: structure => structure instanceof StructureExtractor
  }) as StructureExtractor[];

  const containers = spawn.room.find(FIND_STRUCTURES, {
    filter: structure => structure instanceof StructureContainer
  }) as StructureContainer[];

  // ensure a minimum number of harvesters
  if (harvesters.length < 2 && miners.length < 2 && scavengers.length < 2) {
    return spawnHarvester(spawn);
  }

  // spawn enough miners for each source
  if (miners.length < sources.length && miners.length <= scavengers.length) {
    const minedSources = _.map(miners, miner => Game.getObjectById(miner.memory.source));
    const freeSources = _.difference(sources, minedSources);

    // look for unmined sources
    if (freeSources.length && freeSources[0]) spawnMiner(spawn, freeSources[0]);
    return;
  }

  // spawn scavengers to accommodate miners
  if (scavengers.length == 0 || scavengers.length < miners.length * 2) {
    return spawnScavenger(spawn);
  }

  // spawn one builder for every three sites, but enforce a maximum
  if (sites.length && builders.length < 3) {
    // && builders.length * 3 < sites.length) {
    if (spawnBuilder(spawn)) return;
  }

  if (refillers.length < 1 && containers.length) {
    return spawnRefiller(spawn);
  }

  if (spawn.room.terminal && minableMinerals.length && mineralHaulers.length < 1) {
    return spawnMineralHauler(spawn);
  }

  // spawn claimer
  if (claimers.length < 2 && blueFlags.length > 0) {
    if (spawnClaimer(spawn)) return;
  }

  // spawn haulers to move energy into room storage
  if (
    haulers.length < 8 &&
    spawn.room.storage &&
    _.filter(containers, container => container.store.energy > 300).length > 0
  ) {
    return spawnHauler(spawn);
  }

  if (scavengers.length < 3 && spawn.room.find(FIND_DROPPED_RESOURCES).length) {
    return spawnScavenger(spawn);
  }

  if (extractors.length < 1 && minableMinerals.length && extractorStructs.length) {
    return spawnExtractor(spawn);
  }

  if (upgraders.length < 4) {
    return spawnUpgrader(spawn);
  }

  // spawn extra harvesters otherwise
  // if (harvesters.length < 0) {
  //   return spawnHarvester(spawn);
  // }
}

export function spawnMiner(spawn: StructureSpawn, source: Source): void {
  const creepParts = generateMinerBody(spawn.room.energyAvailable);
  const creepName = "Miner_" + Game.time.toString();
  const creepMem: MinerMemory = {
    role: Role.miner,
    source: source.id
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function spawnScavenger(spawn: StructureSpawn): void {
  const creepParts = [WORK, CARRY, CARRY, MOVE, MOVE];
  const creepName = "Scavenger_" + Game.time.toString();
  const creepMem = {
    role: Role.scavenger,
    delivering: false
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function spawnHarvester(spawn: StructureSpawn): void {
  const source = spawn.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
  if (!source) {
    console.log("No sources found for new harvester");
    return;
  }

  const creepParts = [WORK, WORK, CARRY, MOVE];
  const creepName = "Harvester_" + Game.time.toString();
  const creepMem: HarvesterMemory = {
    role: Role.harvester,
    harvesting: true,
    target: source.id
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function spawnExtractor(spawn: StructureSpawn): void {
  const creepParts = [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE];
  const creepName = "Extractor_" + Game.time.toString();
  const creepMem = {
    role: Role.extractor,
    harvesting: true
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function spawnBuilder(spawn: StructureSpawn): boolean {
  const creepParts = [WORK, WORK, CARRY, CARRY, MOVE];
  const creepName = "Builder_" + Game.time.toString();
  const creepMem = {
    role: Role.builder,
    harvesting: false
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
  return true;
}

export function spawnHauler(spawn: StructureSpawn): void {
  const creepParts = [WORK, CARRY, CARRY, MOVE, MOVE];
  const creepName = "Hauler_" + Game.time.toString();
  const creepMem = {
    role: Role.hauler,
    delivering: false
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function spawnMineralHauler(spawn: StructureSpawn): void {
  // associate hauler with a specific mineral type
  const resources = spawn.room.find(FIND_MINERALS);
  if (!resources.length) return;
  const resourceType = resources[0].mineralType;

  const creepParts = [WORK, CARRY, MOVE];
  const creepName = "MineralHauler_" + Game.time.toString();
  const creepMem = {
    role: Role.mineralHauler,
    delivering: false,
    resourceType: resourceType
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function spawnRefiller(spawn: StructureSpawn): void {
  const creepParts = [WORK, CARRY, CARRY, MOVE, MOVE];
  const creepName = "Refiller_" + Game.time.toString();
  const creepMem = {
    role: Role.refiller,
    delivering: false
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function spawnUpgrader(spawn: StructureSpawn): void {
  let creepParts: BodyPartConstant[] | null;
  // let defaultBody = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]; // XXX: scaling body
  // if (bodyCost(defaultBody) <= spawn.room.energyAvailable)
  //   creepParts = defaultBody;
  // else
  //   creepParts = generateBody(spawn.room.energyAvailable, [], [WORK, CARRY], [MOVE])
  //   if (!creepParts)
  //     return;
  creepParts = [WORK, WORK, CARRY, CARRY, MOVE, MOVE]; // XXX: scaling body

  const creepName = "Upgrader_" + Game.time.toString();
  const creepMem = {
    role: Role.upgrader,
    delivering: false
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

export function spawnClaimer(spawn: StructureSpawn): boolean {
  const creepParts = [CLAIM, MOVE];
  const creepName = "Claimer_" + Game.time.toString();
  const creepMem = {
    role: Role.claimer,
    claiming: false
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  return spawn.spawnCreep(creepParts, creepName, spawnOpts) == OK;
}

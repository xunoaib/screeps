import { Harvester, HarvesterMemory } from "harvester";
import { Builder, BuilderMemory } from "builder";
import { Role } from "creepConstants";
import { Miner, MinerMemory } from "miner";
import { Scavenger } from "scavenger";
import { generateMinerBody } from "creepBody";

export function handleAllSpawns(): void {
  _.map(Game.rooms, handleRoomSpawns);
}

export function handleRoomSpawns(room: Room): void {
  _.map(room.find(FIND_MY_SPAWNS), handleSpawn);
}

export function handleSpawn(spawn: StructureSpawn): void {
  if (spawn.spawning) return;

  const creepCount = _.size(Game.creeps);
  const harvesters = _.filter(Game.creeps, creep => creep.memory.role == Role.harvester) as Harvester[];
  const builders = _.filter(Game.creeps, creep => creep.memory.role == Role.builder) as Builder[];
  const miners = _.filter(Game.creeps, creep => creep.memory.role == Role.miner) as Miner[];
  const scavengers = _.filter(Game.creeps, creep => creep.memory.role == Role.scavenger) as Scavenger[];
  const sources = spawn.room.find(FIND_SOURCES_ACTIVE);

  const sites = spawn.room.find(FIND_CONSTRUCTION_SITES);

  // ensure a minimum number of harvesters
  if (harvesters.length < 1) {
    return spawnHarvester(spawn);
  }

  // spawn enough miners for each source
  if (miners.length < sources.length && miners.length <= scavengers.length) {
    const minedSources = _.map(miners, miner => Game.getObjectById(miner.memory.source));
    const freeSources = _.difference(sources, minedSources);

    // look for unmined sources
    if (freeSources.length && freeSources[0])
      spawnMiner(spawn, freeSources[0]);
    return;
  }

  // TODO: spawn builders early instead of scavengers

  // spawn scavengers to accommodate miners
  if (scavengers.length == 0 || scavengers.length < miners.length * 2) {
    return spawnScavenger(spawn);
  }

  // spawn one builder for every three sites, but enforce a maximum
  if (sites.length && builders.length < 4 && builders.length * 3 < sites.length) {
    return spawnBuilder(spawn);
  }

  // spawn extra harvesters otherwise
  if (harvesters.length < 3) {
    return spawnHarvester(spawn);
  }

  if (scavengers.length < 9) {
    return spawnScavenger(spawn);
  }
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

export function spawnBuilder(spawn: StructureSpawn): void {
  const creepParts = [WORK, WORK, CARRY, CARRY, MOVE];
  const creepName = "Builder_" + Game.time.toString();
  const creepMem = {
    role: Role.builder,
    harvesting: false
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

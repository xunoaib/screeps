import { HarvesterMemory } from "harvester";
import { Role } from "creepConstants";

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

  if (creepCount < 6) {
    return spawnHarvester(spawn);
  }
}

export function spawnHarvester(spawn: StructureSpawn): void {
  const source = spawn.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
  if (!source) {
    console.log("No sources found for new harvester");
    return;
  }

  const creepParts = [WORK, WORK, CARRY, MOVE];
  const creepName = 'Harvester_' + Game.time.toString();
  const creepMem: HarvesterMemory = {
    role: Role.harvester,
    harvesting: true,
    target: source.id,
  };
  const spawnOpts: SpawnOptions = { memory: creepMem };
  spawn.spawnCreep(creepParts, creepName, spawnOpts);
}

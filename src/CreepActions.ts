export const RANGES = {
  HARVEST: 1,
  TRANSFER: 1,
  UPGRADE: 3,
  BUILD: 3,
  REPAIR: 3,
}

export function goHarvest(creep: Creep, source: Source) {
  if (creep.pos.inRangeTo(source.pos, RANGES.HARVEST)) {
    return creep.harvest(source);
  } else {
    return goTo(creep, source);
  }
}

export function goTransfer(creep: Creep, target: Creep | PowerCreep | Structure, resource: ResourceConstant, amount?: number, range?: number) {
  if (creep.pos.inRangeTo(target.pos, range ?? RANGES.TRANSFER)) {
    return creep.transfer(target, resource, amount);
  } else {
    return goTo(creep, target);
  }
}

export function goTo(creep: Creep, pos: RoomPosition | { pos: RoomPosition }) {
  if (creep.fatigue == 0)
    return creep.moveTo(pos, { visualizePathStyle: { stroke: '#ccc' } });
  return OK;
}

export function goBuild(creep: Creep, target: ConstructionSite) {
  if (creep.pos.inRangeTo(target.pos, RANGES.BUILD)) {
    return creep.build(target);
  } else {
    return goTo(creep, target);
  }
}

export function goRepair(creep: Creep, target: Structure) {
  if (creep.pos.inRangeTo(target.pos, RANGES.REPAIR)) {
    return creep.repair(target);
  } else {
    return goTo(creep, target);
  }
}

// find energy storage target and enter depositing state
export function findEnergyTarget(room: Room): Structure | null {
  // try to fill spawns
  const spawns = room.find(FIND_MY_SPAWNS,
    {filter: (s: StructureSpawn) => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0}
  ) as StructureSpawn[];

  if (spawns.length)
    return spawns[0];

  // then extensions
  const extensions = room.find(FIND_MY_STRUCTURES,
    {filter: (s: StructureExtension) => s.structureType == STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0}
  ) as StructureExtension[];
  const rankedExtensions = extensions.sort((s: StructureExtension) => s.store.getFreeCapacity(RESOURCE_ENERGY));

  if (rankedExtensions.length)
    return rankedExtensions[0];

  // repairable objects (below 75%)
  const repairable = room.find(FIND_STRUCTURES, {
    filter: (s: Structure) => (s.hits / s.hitsMax < 0.75)
  });
  if (repairable.length)
    return repairable[0];

  // then room controller
  return room.controller ?? null;
}

export function findClosestConstructionSites(room: Room, pos: RoomPosition): ConstructionSite[] {
  const sites = room.find(FIND_CONSTRUCTION_SITES);
  return _.sortBy(sites, (site) => site.pos.getRangeTo(pos));
}

export const RANGES = {
  HARVEST: 1,
  TRANSFER: 1,
  UPGRADE: 3,
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
  // else return ERR_TIRED;
  return OK;
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

  // then room controller
  return room.controller ?? null;
}

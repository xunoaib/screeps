import { ErrorMapper } from "utils/ErrorMapper";
import { Role, State } from "creepConstants";
import roleHarvester from "harvester";
import { handleAllSpawns } from "spawner";

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
    home: StructureSpawn;
    room: string;
    state: State;
    target?: Source | Structure;
  }
}

export function runAllCreepLogic(): void {
  _.map(Game.creeps, runCreepLogic);
}

export function runCreepLogic(creep: Creep): void {
  if (creep.spawning)
    return;

  switch (creep.memory.role) {
    case Role.harvester: {
      return roleHarvester.run(creep);
    }
    default: {
      console.log(creep.name + " has an unknown role");
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
  handleAllSpawns();
  runAllCreepLogic();
  cleanup();

  if ("generatePixel" in Game.cpu && Game.cpu.bucket >= PIXEL_CPU_COST)
    Game.cpu.generatePixel();
});

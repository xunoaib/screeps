/** tracks structures/objects in a room to avoid redundant queries */

import { Harvester } from "harvester";
import { Role } from "creepConstants";

export class RoomManager {
  room: Room;

  creeps: Creep[];
  constructionSites: ConstructionSite[];
  structures: Structure[];
  harvesters: Harvester[];

  constructor(room: Room) {
    this.room = room;
    this.creeps = this.room.find(FIND_MY_CREEPS);
    this.constructionSites = this.room.find(FIND_MY_CONSTRUCTION_SITES);
    this.structures = this.room.find(FIND_MY_STRUCTURES);

    const creepsByRole = _.groupBy(this.creeps, creep => creep.memory.role);
    this.harvesters = creepsByRole[Role.harvester] as Harvester[];
  }
}

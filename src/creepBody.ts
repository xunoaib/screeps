/** returns scaled body parts for a miner creep with the avaiable energy */
export function generateMinerBody(energy: number) {
  const body = [WORK, WORK, MOVE, CARRY];
  const cost = bodyCost(body);
  for (let i = 0; i < Math.floor((energy - cost) / BODYPART_COST[WORK]); i++) {
    body.push(WORK);
  }
  return body;
}

/** total energy cost of the given body parts */
export function bodyCost(body: BodyPartConstant[]) {
  return _.sum(body, part => BODYPART_COST[part]);
}

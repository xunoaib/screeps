/** generate a creep body with the given prefix/suffix and repeating "pattern" as many times as possible */
export function generateBody(energy: number, prefix: BodyPartConstant[], pattern: BodyPartConstant[], suffix: BodyPartConstant[], sorted?: boolean) {
  let cost = bodyCost(prefix.concat(suffix));
  const numRepeats = Math.floor((energy - cost) / bodyCost(pattern));

  if (numRepeats == 0)
    return null;

  let body = [] as BodyPartConstant[];
  for (let i=0; i<numRepeats; i++)
    body.push(...pattern);

  if (sorted)
    body.sort();

  return prefix.concat(body).concat(suffix);
}

/** generate the strongest miner body using the avaiable energy.
* add as many WORK parts as possible (up to 5)
* add as many MOVE parts as possible (up to 5)
*/
export function generateMinerBody(energy: number) {
  let body = [WORK, WORK, MOVE, CARRY];
  energy -= bodyCost(body);

  // 5 work parts is enough to deplete a source in 300 ticks before it refreshes
  // add up to 3 move parts (+2 in base pattern = 5)
  for (let i=0; i<3 && energy >= BODYPART_COST[WORK]; i++) {
    body.unshift(WORK);
    energy -= BODYPART_COST[WORK];
  }

  // add up to 4 move parts (+1 in base pattern = 5)
  for (let i=0; i<4 && energy >= BODYPART_COST[MOVE]; i++) {
    body.unshift(MOVE);
    energy -= BODYPART_COST[MOVE];
  }

  body.sort();
  return body;
}

/** total energy cost of the given body parts */
export function bodyCost(body: BodyPartConstant[]) {
  return _.sum(body, part => BODYPART_COST[part]);
}

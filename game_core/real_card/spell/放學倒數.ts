import { GamePhase, CardStat } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter, TypeGaurd, IArena, buildConfig } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "放學倒數";
let description = "*放學倒數*會留在場上。每個世代開始時，在此咒語上放置一枚標記。你可以隨時用一個瞬間行動銷毀此咒語，並恢復等同於標記物的情緒。";
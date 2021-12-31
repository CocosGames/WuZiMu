import { Room, Delayed, Client } from 'colyseus';
import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';

const TURN_TIMEOUT = 10
const BOARD_WIDTH = 19;
const BOARD_HEIGHT = 19;

class State extends Schema {
  @type("string") currentTurn: string;
  @type({ map: "boolean" }) players = new MapSchema<boolean>();
  @type(["number"]) board: number[] = new ArraySchema<number>
  (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  @type("string") winner: string;
  @type("boolean") draw: boolean;
}

export class WuZiMuRoom extends Room<State> {
  maxClients = 2;

  onCreate () {
    this.setState(new State());
    this.setSeatReservationTime(100000);
    this.onMessage("action", (client, message) => this.playerAction(client, message));
    console.log("Room Created!");
    this.resetAutoDisposeTimeout(100000);
  }

  onJoin (client: Client) {
    this.setSeatReservationTime(100000);
    this.state.players.set(client.sessionId, true);
    console.log(this.state.players.size + " players joined!");
    if (this.state.players.size === 2) {
      this.state.currentTurn = client.sessionId;

      // lock this room for new users
      this.lock();
    }
  }

  playerAction (client: Client, data: any) {
    if (this.state.winner || this.state.draw) {
      return false;
    }

    if (client.sessionId === this.state.currentTurn) {
      const playerIds = Array.from(this.state.players.keys());

      const index = data.index;
      const x = index % BOARD_WIDTH;
      const y = BOARD_HEIGHT - Math.floor(index / BOARD_WIDTH) - 1;

      if (this.state.board[index] === 0) {
        const move = (client.sessionId === playerIds[0]) ? 1 : 2;
        this.state.board[index] = move;

        if (this.checkWin(x, y, move)) {
          this.state.winner = client.sessionId;
          console.log("winner: " + client.sessionId);
        } else if (this.checkBoardComplete()) {
          this.state.draw = true;

        } else {
          // switch turn
          const otherPlayerSessionId = (client.sessionId === playerIds[0]) ? playerIds[1] : playerIds[0];
          this.state.currentTurn = otherPlayerSessionId;
        }

      }
    }
  }

//  ...
// (0,2) (1,2) (2,2)
// (0,1) (1,1) (2,1)
// (0,0) (1,0) (2,0) ...
//
// value: empty=0 white=1 black=2
//
  checkBoardComplete () {
    return this.state.board
        .filter(item => item === 0)
        .length === 0;
  }

  checkWin (x: any, y: any, move: any) {
    let board = this.state.board;
    let i = 1;
    let link = 1;

    // horizontal
    // left
    while (x-i>=0)
    {
      if (board[(BOARD_HEIGHT - y -1) * BOARD_WIDTH + x - i]==move)
      {
        link++;
        i++;
        continue;
      }
      break;
    }
    // right
    i=1;
    while (x+i<BOARD_WIDTH)
    {
      if (board[(BOARD_HEIGHT - y -1) * BOARD_WIDTH + x + i]==move)
      {
        link++;
        i++;
        continue;
      }
      break;
    }
    if (link>=5)
      return true;

    // vertical
    // up
    i = 1;
    link = 1;
    while (y+i<BOARD_HEIGHT)
    {
      if (board[(BOARD_HEIGHT - y - 1 + i) * BOARD_WIDTH + x]==move)
      {
        link++;
        i++;
        continue;
      }
      break;
    }
    //down
    i = 1;
    while (y-i>=0)
    {
      if (board[(BOARD_HEIGHT - y - 1 - i) * BOARD_WIDTH + x]==move)
      {
        link++;
        i++;
        continue;
      }
      break;
    }
    if (link>=5)
      return true;

    // cross forward
    // top left
    link = 1;
    i = 1;
    while ((x-i>=0) && (y+i<BOARD_HEIGHT)) {
      if (board[(BOARD_HEIGHT - y - 1 + i) * BOARD_WIDTH + x - i] == move)
      {
        link++;
        i++;
        continue;
      }
      break;
    }
    // bottom right
    i = 1;
    while ((x+i<BOARD_WIDTH) && (y-i>=0)) {
      if (board[(BOARD_HEIGHT - y - 1 - i) * BOARD_WIDTH + x + i] == move)
      {
        link++;
        i++;
        continue;
      }
      break;
    }
    if (link>=5)
      return true;
    // cross backward
    i = 1;
    link = 1;
    // top right
    while ((x+i<BOARD_WIDTH) && (y+i<BOARD_HEIGHT)) {
      if (board[(BOARD_HEIGHT - y - 1 + i) * BOARD_WIDTH + x + i] == move)
      {
        link++;
        i++;
        continue;
      }
      break;
    }
    // bottom left
    i = 1;
    while ((x-i>=0) && (y-i>=0)) {
      if (board[(BOARD_HEIGHT - y - 1 - i) * BOARD_WIDTH + x - i] == move)
      {
        link++;
        i++;
        continue;
      }
      break;
    }
    if (link>=5)
      return true;
    return false;
  }

  onLeave (client: Client) {
    this.state.players.delete(client.sessionId);

    let remainingPlayerIds = Array.from(this.state.players.keys());
    if (remainingPlayerIds.length > 0) {
      this.state.winner = remainingPlayerIds[0]
    }
  }

}

